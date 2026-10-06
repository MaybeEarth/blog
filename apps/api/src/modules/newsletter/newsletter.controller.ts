import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UsePipes,
} from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { subscribeSchema, SubscribeInput } from '@blog/shared';
import { Role } from '@prisma/client';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Public()
  @Post('subscribe')
  @UsePipes(new ZodValidationPipe(subscribeSchema))
  async subscribe(@Body() body: SubscribeInput) {
    return this.newsletterService.subscribe(body);
  }

  @Public()
  @Get('confirm')
  async confirm(@Query('token') token: string) {
    return this.newsletterService.confirm(token);
  }

  @Public()
  @Post('unsubscribe')
  async unsubscribe(@Query('token') token: string) {
    return this.newsletterService.unsubscribe(token);
  }

  @Roles(Role.ADMIN)
  @Get('subscribers')
  async listSubscribers(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.newsletterService.listSubscribers(
      limit ? Number(limit) : 50,
      offset ? Number(offset) : 0,
    );
  }
}
