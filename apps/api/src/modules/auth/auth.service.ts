import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { LoginInput, JwtPayload } from '@blog/shared';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly maxFailedAttempts = 5;
  private readonly lockoutSeconds = 900; // 15 dakika

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginInput, ip: string, userAgent?: string) {
    const rateLimitKey = `rate:login:${ip}:${dto.identifier.toLowerCase()}`;
    const failedAttemptsStr = await this.redis.cacheClient.get(rateLimitKey);
    const failedAttempts = failedAttemptsStr ? parseInt(failedAttemptsStr, 10) : 0;

    if (failedAttempts >= this.maxFailedAttempts) {
      throw new HttpException(
        'Çok fazla başarısız giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.identifier.toLowerCase() },
          { username: dto.identifier },
        ],
      },
    });

    if (!user || !user.isActive) {
      await this.recordFailedAttempt(rateLimitKey);
      throw new UnauthorizedException('Geçersiz kullanıcı adı veya şifre');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      await this.recordFailedAttempt(rateLimitKey);
      throw new UnauthorizedException('Geçersiz kullanıcı adı veya şifre');
    }

    // Başarılı giriş: Başarısız deneme sayacını sıfırla
    await this.redis.del(rateLimitKey);

    // 15 dakikalık Access Token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
      preferredUiLocale: user.preferredUiLocale,
    };

    const accessToken = this.generateAccessToken(payload);

    // 30 günlük Refresh Token (Family ID ile)
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const familyId = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        familyId,
        expiresAt,
        userAgent,
        ip,
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        preferredUiLocale: user.preferredUiLocale,
      },
    };
  }

  async refresh(rawRefreshToken: string, ip: string, userAgent?: string) {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Yenileme belirteci bulunamadı');
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Geçersiz yenileme belirteci');
    }

    // REUSE DETECTION: Zaten revoke edilmiş token tekrar kullanıldıysa family iptal!
    if (tokenRecord.revokedAt !== null) {
      this.logger.warn(
        `🚨 Token reuse detected! Family: ${tokenRecord.familyId}, User: ${tokenRecord.userId}`,
      );
      await this.prisma.refreshToken.updateMany({
        where: { familyId: tokenRecord.familyId },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Güvenlik ihlali tespit edildi. Oturum sonlandırıldı.');
    }

    // Süre kontrolü
    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Yenileme belirtecinin süresi dolmuş');
    }

    if (!tokenRecord.user.isActive) {
      throw new UnauthorizedException('Kullanıcı hesabı aktif değil');
    }

    // TOKEN ROTATION: Yeni refresh token üret ve eskisini revoke et
    const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
    const newTokenHash = this.hashToken(newRawRefreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [newToken] = await this.prisma.$transaction([
      this.prisma.refreshToken.create({
        data: {
          userId: tokenRecord.userId,
          tokenHash: newTokenHash,
          familyId: tokenRecord.familyId,
          expiresAt,
          userAgent,
          ip,
        },
      }),
      this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: {
          revokedAt: new Date(),
        },
      }),
    ]);

    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { replacedBy: newToken.id },
    });

    const payload: JwtPayload = {
      sub: tokenRecord.user.id,
      email: tokenRecord.user.email,
      username: tokenRecord.user.username,
      role: tokenRecord.user.role,
      displayName: tokenRecord.user.displayName,
      preferredUiLocale: tokenRecord.user.preferredUiLocale,
    };

    const accessToken = this.generateAccessToken(payload);

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  async logout(rawRefreshToken?: string) {
    if (!rawRefreshToken) return;

    const tokenHash = this.hashToken(rawRefreshToken);
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (tokenRecord) {
      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() },
      });
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        displayName: true,
        preferredUiLocale: true,
        avatarMediaId: true,
        socialLinks: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı');
    }

    return user;
  }

  private generateAccessToken(payload: JwtPayload): string {
    const secret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    return jwt.sign(payload, secret, { expiresIn: '15m' });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async recordFailedAttempt(key: string): Promise<void> {
    const attempts = await this.redis.cacheClient.incr(key);
    if (attempts === 1) {
      await this.redis.cacheClient.expire(key, this.lockoutSeconds);
    }
  }
}
