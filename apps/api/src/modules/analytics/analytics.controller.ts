import { Controller, Post, Body, Req, HttpCode, HttpStatus, UsePipes } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AnalyticsService } from './analytics.service';
import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { viewBeaconSchema, ViewBeaconInput } from '@blog/shared';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Public()
  @Post('view')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(viewBeaconSchema))
  async trackView(@Body() dto: ViewBeaconInput, @Req() req: FastifyRequest) {
    const ip = req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';

    return this.analyticsService.trackView(dto.postId, ip, userAgent);
  }
}
