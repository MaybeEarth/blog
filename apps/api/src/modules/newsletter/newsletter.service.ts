import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { SubscribeInput } from '@blog/shared';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(private readonly prisma: PrismaService) {}

  async subscribe(input: SubscribeInput) {
    const email = input.email.toLowerCase().trim();
    const locale = input.locale || 'tr';

    const existing = await this.prisma.subscriber.findUnique({
      where: { email },
    });

    if (existing) {
      if (existing.confirmedAt) {
        return {
          status: 'already_subscribed',
          message: 'Bu e-posta adresi zaten bültene kayıtlı.',
        };
      }
      // Yeniden onay token'ı oluştur
      const token = uuidv4();
      await this.prisma.subscriber.update({
        where: { email },
        data: { token, locale },
      });
      this.logger.log(`Resent confirmation token to: ${email}`);
      return {
        status: 'pending_confirmation',
        message: 'Onay e-postası tekrar gönderildi. Lütfen kutunuzu kontrol edin.',
      };
    }

    const token = uuidv4();
    await this.prisma.subscriber.create({
      data: {
        email,
        locale,
        token,
      },
    });

    this.logger.log(`New subscriber registered: ${email} (${locale})`);
    return {
      status: 'pending_confirmation',
      message: 'Abonelik talebiniz alındı. Lütfen e-posta adresinizi onaylayın.',
    };
  }

  async confirm(token: string) {
    if (!token) {
      throw new BadRequestException('Onay token parametresi eksik.');
    }

    const subscriber = await this.prisma.subscriber.findFirst({
      where: { token },
    });

    if (!subscriber) {
      throw new NotFoundException('Geçersiz veya süresi dolmuş onay bağlantısı.');
    }

    await this.prisma.subscriber.update({
      where: { id: subscriber.id },
      data: {
        confirmedAt: new Date(),
        token: null,
      },
    });

    this.logger.log(`Subscriber confirmed: ${subscriber.email}`);
    return {
      status: 'confirmed',
      message: 'E-posta adresiniz başarıyla onaylandı.',
    };
  }

  async unsubscribe(token: string) {
    if (!token) {
      throw new BadRequestException('Abonelikten çıkma tokenı eksik.');
    }

    const subscriber = await this.prisma.subscriber.findFirst({
      where: { token },
    });

    if (!subscriber) {
      throw new NotFoundException('Abonelik bulunamadı.');
    }

    await this.prisma.subscriber.delete({
      where: { id: subscriber.id },
    });

    this.logger.log(`Subscriber unsubscribed: ${subscriber.email}`);
    return {
      status: 'unsubscribed',
      message: 'Bülten aboneliğiniz sonlandırıldı.',
    };
  }

  async listSubscribers(limit = 50, offset = 0) {
    const [total, items] = await Promise.all([
      this.prisma.subscriber.count(),
      this.prisma.subscriber.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, items };
  }
}
