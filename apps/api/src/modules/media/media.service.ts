import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { S3Service } from '../../infra/s3/s3.service';
import { MediaProcessor } from './media.processor';
import {
  RequestPresignedUrlInput,
  MediaQueryInput,
  UpdateMediaTranslationInput,
  PresignedUploadResponse,
  MediaItemDto,
  MediaVariantsPayload,
} from '@blog/shared';
import { Role, MediaStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly processor: MediaProcessor,
  ) {}

  async requestPresignedUpload(
    dto: RequestPresignedUrlInput,
    userId: string,
  ): Promise<PresignedUploadResponse> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Temiz dosya adı (güvenlik için özel karakterler ayıklanır)
    const sanitizedFilename = dto.filename
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '_');
    const storageKey = `uploads/${year}/${month}/${uuidv4()}-${sanitizedFilename}`;

    // Veritabanında PROCESSING durumunda kayıt oluştur
    const media = await this.prisma.media.create({
      data: {
        uploaderId: userId,
        storageKey,
        mime: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        status: MediaStatus.PROCESSING,
      },
    });

    const expiresInSeconds = 900; // 15 dakika
    const uploadUrl = await this.s3.generatePresignedUploadUrl(
      storageKey,
      dto.mimeType,
      expiresInSeconds,
    );

    return {
      mediaId: media.id,
      storageKey,
      uploadUrl,
      expiresInSeconds,
    };
  }

  async completeUpload(mediaId: string, userId: string, userRole: Role) {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundException('Medya kaydı bulunamadı');
    }

    if (userRole !== Role.ADMIN && media.uploaderId !== userId) {
      throw new ForbiddenException('Bu medyayı tamamlama yetkiniz yok');
    }

    // BullMQ kuyruğuna görsel işleme görevini ekle
    await this.processor.enqueueImageProcessing(media.id, media.storageKey);

    return {
      success: true,
      message: 'Medya işleme sırasına alındı',
      mediaId: media.id,
      status: media.status,
    };
  }

  async findList(query: MediaQueryInput) {
    const limit = Math.min(Math.max(query.limit || 20, 1), 100);

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }

    const items = await this.prisma.media.findMany({
      where,
      take: limit + 1,
      skip: query.cursor ? 1 : 0,
      cursor: query.cursor ? { id: query.cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        translations: true,
      },
    });

    const hasNextPage = items.length > limit;
    const resultItems = hasNextPage ? items.slice(0, limit) : items;
    const nextCursor = hasNextPage && resultItems.length > 0 ? resultItems[resultItems.length - 1]?.id ?? null : null;

    return {
      items: resultItems.map((m) => this.formatMediaItem(m)),
      nextCursor,
      hasNextPage,
    };
  }

  async findById(mediaId: string): Promise<MediaItemDto> {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
      include: { translations: true },
    });

    if (!media) {
      throw new NotFoundException('Medya bulunamadı');
    }

    return this.formatMediaItem(media);
  }

  async updateTranslation(
    mediaId: string,
    locale: string,
    dto: UpdateMediaTranslationInput,
  ) {
    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException('Medya bulunamadı');

    const translation = await this.prisma.mediaTranslation.upsert({
      where: { mediaId_locale: { mediaId, locale } },
      create: {
        mediaId,
        locale,
        altText: dto.altText || null,
        caption: dto.caption || null,
      },
      update: {
        altText: dto.altText || null,
        caption: dto.caption || null,
      },
    });

    return translation;
  }

  async deleteMedia(mediaId: string) {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundException('Medya bulunamadı');
    }

    // S3'teki tüm varyantları ve orijinal nesneyi sil
    const keysToDelete: string[] = [media.storageKey];
    if (media.variants) {
      const parsedVariants = media.variants as unknown as MediaVariantsPayload;
      if (parsedVariants.variants) {
        for (const v of parsedVariants.variants) {
          keysToDelete.push(`variants/${media.id}/w${v.width}.webp`);
          keysToDelete.push(`variants/${media.id}/w${v.width}.avif`);
        }
      }
    }

    await this.s3.deleteObjects(keysToDelete);

    await this.prisma.media.delete({
      where: { id: mediaId },
    });

    return { success: true, message: 'Medya ve ilişkili varyantlar silindi' };
  }

  private formatMediaItem(media: any): MediaItemDto {
    return {
      id: media.id,
      uploaderId: media.uploaderId,
      storageKey: media.storageKey,
      mime: media.mime,
      sizeBytes: media.sizeBytes,
      width: media.width,
      height: media.height,
      blurhash: media.blurhash,
      variants: media.variants as MediaVariantsPayload | null,
      status: media.status,
      url: this.s3.getPublicUrl(media.storageKey),
      translations: media.translations.map((t: any) => ({
        locale: t.locale,
        altText: t.altText,
        caption: t.caption,
      })),
      createdAt: media.createdAt,
      updatedAt: media.updatedAt,
    };
  }
}
