import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload, jwtPayloadSchema } from '@blog/shared';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Kimlik doğrulama belirteci eksik');
    }

    const token = authHeader.split(' ')[1];
    const secret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');

    try {
      const decoded = jwt.verify(token, secret);
      const parsed = jwtPayloadSchema.safeParse(decoded);
      if (!parsed.success) {
        throw new UnauthorizedException('Geçersiz belirteç içeriği');
      }

      request.user = parsed.data as JwtPayload;
      return true;
    } catch {
      throw new UnauthorizedException('Belirteç geçersiz veya süresi dolmuş');
    }
  }
}
