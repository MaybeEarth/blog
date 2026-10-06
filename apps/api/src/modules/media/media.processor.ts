import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { S3Service } from '../../infra/s3/s3.service';
import { Queue, Worker, Job } from 'bullmq';
import sharp from 'sharp';
import { MediaStatus } from '@prisma/client';
import { MediaVariantsPayload, MediaVariantInfo } from '@blog/shared';

export interface ProcessImageJobData {
  mediaId: string;
  storageKey: string;
}

export const MEDIA_QUEUE_NAME = 'media-processing';
export const PROCESS_IMAGE_JOB = 'process-image';

@Injectable()
export class MediaProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaProcessor.name);
  private queue!: Queue<ProcessImageJobData>;
  private worker!: Worker<ProcessImageJobData>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const queueUrl = new URL(
      this.config.get<string>('REDIS_QUEUE_URL', 'redis://localhost:6380'),
    );
    const connection = {
      host: queueUrl.hostname || 'localhost',
      port: Number(queueUrl.port) || 6380,
      password: queueUrl.password || undefined,
      maxRetriesPerRequest: null,
    };

    this.queue = new Queue<ProcessImageJobData>(MEDIA_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    this.worker = new Worker<ProcessImageJobData>(
      MEDIA_QUEUE_NAME,
      async (job: Job<ProcessImageJobData>) => {
        return this.processImage(job.data.mediaId, job.data.storageKey);
      },
      {
        connection,
        concurrency: 4,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`✅ Media processing completed for job ${job.id} (Media: ${job.data.mediaId})`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `❌ Media processing failed for job ${job?.id} (Media: ${job?.data?.mediaId}): ${err.message}`,
      );
    });

    this.logger.log('🚀 MediaProcessor BullMQ Worker started');
  }

  async onModuleDestroy() {
    if (this.worker) await this.worker.close();
    if (this.queue) await this.queue.close();
  }

  async enqueueImageProcessing(mediaId: string, storageKey: string) {
    return this.queue.add(PROCESS_IMAGE_JOB, { mediaId, storageKey });
  }

  async processImage(mediaId: string, storageKey: string): Promise<void> {
    try {
      this.logger.log(`Processing image [${mediaId}] from storageKey: ${storageKey}`);

      // 1. S3'ten orijinal görsel buffer'ını çek
      const originalBuffer = await this.s3.getObjectBuffer(storageKey);
      const imageInstance = sharp(originalBuffer);
      const metadata = await imageInstance.metadata();

      const originalWidth = metadata.width || 800;
      const originalHeight = metadata.height || 600;

      // 2. LQIP (Low Quality Image Placeholder) oluştur
      const lqipBuffer = await sharp(originalBuffer)
        .resize(16, 16, { fit: 'inside' })
        .webp({ quality: 20 })
        .toBuffer();
      const blurDataUrl = `data:image/webp;base64,${lqipBuffer.toString('base64')}`;

      // 3. Responsive varyant genişliklerini belirle
      const targetWidths = [320, 640, 1280, 1920];
      const validWidths = targetWidths.filter((w) => w <= originalWidth);
      if (validWidths.length === 0) {
        validWidths.push(originalWidth);
      }

      const variants: MediaVariantInfo[] = [];

      for (const w of validWidths) {
        // WebP formatı
        const webpBuffer = await sharp(originalBuffer)
          .resize(w, null, { withoutEnlargement: true })
          .webp({ quality: 82, effort: 4 })
          .toBuffer();
        const webpKey = `variants/${mediaId}/w${w}.webp`;
        await this.s3.putObject(webpKey, webpBuffer, 'image/webp');

        // AVIF formatı
        const avifBuffer = await sharp(originalBuffer)
          .resize(w, null, { withoutEnlargement: true })
          .avif({ quality: 75, effort: 4 })
          .toBuffer();
        const avifKey = `variants/${mediaId}/w${w}.avif`;
        await this.s3.putObject(avifKey, avifBuffer, 'image/avif');

        variants.push({
          width: w,
          webp: this.s3.getPublicUrl(webpKey),
          avif: this.s3.getPublicUrl(avifKey),
        });
      }

      const variantsPayload: MediaVariantsPayload = {
        original: {
          key: storageKey,
          url: this.s3.getPublicUrl(storageKey),
          width: originalWidth,
          height: originalHeight,
        },
        variants,
      };

      // 4. Veritabanını güncelle
      await this.prisma.media.update({
        where: { id: mediaId },
        data: {
          status: MediaStatus.READY,
          width: originalWidth,
          height: originalHeight,
          blurhash: blurDataUrl,
          variants: variantsPayload as any,
        },
      });

      this.logger.log(`✅ Media [${mediaId}] processed successfully: ${variants.length} responsive sizes`);
    } catch (error: any) {
      this.logger.error(`Failed to process image [${mediaId}]: ${error.message}`, error.stack);
      await this.prisma.media.update({
        where: { id: mediaId },
        data: { status: MediaStatus.FAILED },
      });
      throw error;
    }
  }
}
