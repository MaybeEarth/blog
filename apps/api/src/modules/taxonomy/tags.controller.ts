import { Controller, Get, Post, Query, Param, Body, UsePipes } from '@nestjs/common';
import { TagsService } from './tags.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Role } from '@prisma/client';
import { upsertTagSchema, UpsertTagInput } from '@blog/shared';

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Public()
  @Get()
  async findAll(@Query('locale') locale?: string) {
    return this.tagsService.findAll(locale || 'tr');
  }

  @Public()
  @Get('popular')
  async findPopular(@Query('locale') locale?: string, @Query('limit') limit?: number) {
    return this.tagsService.findPopular(locale || 'tr', limit ? Number(limit) : 10);
  }

  @Public()
  @Get(':locale/:slug')
  async findBySlug(@Param('locale') locale: string, @Param('slug') slug: string) {
    return this.tagsService.findBySlug(locale, slug);
  }

  @Post()
  @Roles(Role.ADMIN)
  @UsePipes(new ZodValidationPipe(upsertTagSchema))
  async create(@Body() dto: UpsertTagInput) {
    return this.tagsService.create(dto);
  }
}
