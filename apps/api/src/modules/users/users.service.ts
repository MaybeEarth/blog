import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { Role } from '@prisma/client';
import { UpdateUserProfileInput, JwtPayload } from '@blog/shared';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        displayName: true,
        preferredUiLocale: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, actor: JwtPayload) {
    if (actor.role !== Role.ADMIN && actor.sub !== id) {
      throw new ForbiddenException('Sadece kendi profilinizi görüntüleyebilirsiniz');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        translations: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  async update(id: string, dto: UpdateUserProfileInput, actor: JwtPayload) {
    if (actor.role !== Role.ADMIN && actor.sub !== id) {
      throw new ForbiddenException('Sadece kendi profilinizi güncelleyebilirsiniz');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        displayName: dto.displayName ?? user.displayName,
        preferredUiLocale: dto.preferredUiLocale ?? user.preferredUiLocale,
        socialLinks: dto.socialLinks ? (dto.socialLinks as any) : user.socialLinks,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        displayName: true,
        preferredUiLocale: true,
        isActive: true,
        updatedAt: true,
      },
    });

    if (dto.bio) {
      await this.prisma.userTranslation.upsert({
        where: {
          userId_locale: {
            userId: id,
            locale: dto.preferredUiLocale ?? user.preferredUiLocale,
          },
        },
        update: { bio: dto.bio },
        create: {
          userId: id,
          locale: dto.preferredUiLocale ?? user.preferredUiLocale,
          bio: dto.bio,
        },
      });
    }

    return updated;
  }
}
