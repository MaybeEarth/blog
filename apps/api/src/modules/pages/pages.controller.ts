import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { PagesService, UpsertPageTranslationDto } from './pages.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, PageStatus } from '@prisma/client';

@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Public()
  @Get(':locale/:slug')
  async findBySlug(@Param('locale') locale: string, @Param('slug') slug: string) {
    return this.pagesService.findBySlug(locale, slug);
  }

  @Public()
  @Get()
  async findAll(@Query('locale') locale?: string) {
    return this.pagesService.findAll(locale);
  }

  @Roles(Role.ADMIN)
  @Post()
  async createPage(@Body('status') status?: PageStatus) {
    return this.pagesService.createPage(status);
  }

  @Roles(Role.ADMIN)
  @Put(':id/translations/:locale')
  async upsertTranslation(
    @Param('id') id: string,
    @Param('locale') locale: string,
    @Body() body: UpsertPageTranslationDto,
  ) {
    return this.pagesService.upsertTranslation(id, locale, body);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  async deletePage(@Param('id') id: string) {
    return this.pagesService.deletePage(id);
  }
}
