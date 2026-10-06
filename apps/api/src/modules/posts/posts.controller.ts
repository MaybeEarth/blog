import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Query,
  Param,
  Body,
  UsePipes,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Role } from '@prisma/client';
import {
  postQuerySchema,
  PostQueryInput,
  createPostSchema,
  CreatePostInput,
  upsertTranslationSchema,
  UpsertTranslationInput,
  JwtPayload,
} from '@blog/shared';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Public()
  @Get()
  async findList(@Query(new ZodValidationPipe(postQuerySchema)) query: PostQueryInput) {
    return this.postsService.findList(query);
  }

  @Public()
  @Get('popular')
  async findPopular(
    @Query('locale') locale?: string,
    @Query('limit') limit?: number,
  ) {
    return this.postsService.findPopular(locale || 'tr', limit ? Number(limit) : 10);
  }

  @Public()
  @Get(':locale/:slug')
  async findBySlug(@Param('locale') locale: string, @Param('slug') slug: string) {
    return this.postsService.findBySlug(locale, slug);
  }

  @Public()
  @Get(':locale/:slug/related')
  async findRelated(
    @Param('locale') locale: string,
    @Param('slug') slug: string,
    @Query('limit') limit?: number,
  ) {
    return this.postsService.findRelated(locale, slug, limit ? Number(limit) : 4);
  }

  @Post()
  @Roles(Role.ADMIN, Role.EDITOR)
  async createPost(
    @Body(new ZodValidationPipe(createPostSchema)) dto: CreatePostInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.postsService.createPost(dto, user.sub);
  }

  @Put(':id/translations/:locale')
  @Roles(Role.ADMIN, Role.EDITOR)
  async upsertTranslation(
    @Param('id') postId: string,
    @Param('locale') locale: string,
    @Body(new ZodValidationPipe(upsertTranslationSchema)) dto: UpsertTranslationInput,
  ) {
    return this.postsService.upsertTranslation(postId, locale, dto);
  }

  @Post(':id/translations/:locale/publish')
  @Roles(Role.ADMIN, Role.EDITOR)
  async publishTranslation(
    @Param('id') postId: string,
    @Param('locale') locale: string,
  ) {
    return this.postsService.publishTranslation(postId, locale);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  async deletePost(@Param('id') id: string) {
    return this.postsService.deletePost(id);
  }
}
