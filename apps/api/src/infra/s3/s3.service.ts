import {
  Injectable,
  OnModuleInit,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('S3_ENDPOINT', 'http://localhost:9000');
    const region = this.config.get<string>('S3_REGION', 'us-east-1');
    const accessKeyId = this.config.get<string>('S3_ACCESS_KEY', 'minioadmin');
    const secretAccessKey = this.config.get<string>(
      'S3_SECRET_KEY',
      'change_me_minio',
    );

    this.bucket = this.config.get<string>('S3_BUCKET', 'media');
    this.publicBaseUrl = this.config.get<string>(
      'S3_PUBLIC_URL',
      `${endpoint}/${this.bucket}`,
    );

    this.client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async onModuleInit() {
    await this.ensureBucket();
  }

  async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`✅ S3 bucket verified: ${this.bucket}`);
    } catch {
      try {
        this.logger.warn(`S3 bucket '${this.bucket}' not found. Creating...`);
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`✅ S3 bucket created: ${this.bucket}`);
      } catch (err: any) {
        this.logger.error(`❌ Failed to ensure S3 bucket: ${err.message}`);
      }
    }
  }

  async generatePresignedUploadUrl(
    storageKey: string,
    mimeType: string,
    expiresInSeconds = 900,
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        ContentType: mimeType,
      });

      return await getSignedUrl(this.client, command, {
        expiresIn: expiresInSeconds,
      });
    } catch (error: any) {
      this.logger.error(`Presigned URL error: ${error.message}`);
      throw new InternalServerErrorException('Yükleme bağlantısı oluşturulamadı');
    }
  }

  async getObjectBuffer(storageKey: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      });

      const response = await this.client.send(command);
      if (!response.Body) {
        throw new Error('Empty S3 object body');
      }

      const stream = response.Body as Readable;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }

      return Buffer.concat(chunks);
    } catch (error: any) {
      this.logger.error(`Error reading S3 object [${storageKey}]: ${error.message}`);
      throw new InternalServerErrorException('Medya nesnesi okunamadı');
    }
  }

  async putObject(
    storageKey: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: body,
        ContentType: contentType,
      });

      await this.client.send(command);
    } catch (error: any) {
      this.logger.error(`Error uploading S3 object [${storageKey}]: ${error.message}`);
      throw new InternalServerErrorException('Varyant yüklenemedi');
    }
  }

  async deleteObjects(storageKeys: string[]): Promise<void> {
    if (storageKeys.length === 0) return;

    try {
      const command = new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: {
          Objects: storageKeys.map((Key) => ({ Key })),
          Quiet: true,
        },
      });

      await this.client.send(command);
    } catch (error: any) {
      this.logger.error(`Error deleting S3 objects: ${error.message}`);
    }
  }

  getPublicUrl(storageKey: string): string {
    return `${this.publicBaseUrl}/${storageKey.replace(/^\/+/, '')}`;
  }
}
