import { Controller, Get, Post, Query, Param, Body, UsePipes } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Role } from '@prisma/client';
import { upsertCategorySchema, UpsertCategoryInput } from '@blog/shared';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  async findAll(@Query('locale') locale?: string) {
    return this.categoriesService.findAll(locale || 'tr');
  }

  @Public()
  @Get(':locale/:slug')
  async findBySlug(@Param('locale') locale: string, @Param('slug') slug: string) {
    return this.categoriesService.findBySlug(locale, slug);
  }

  @Post()
  @Roles(Role.ADMIN)
  @UsePipes(new ZodValidationPipe(upsertCategorySchema))
  async create(@Body() dto: UpsertCategoryInput) {
    return this.categoriesService.create(dto);
  }
}
