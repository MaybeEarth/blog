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

  @Public()
  @Get(':locale/:slug/reactions')
  async getReactions(
    @Param('locale') locale: string,
    @Param('slug') slug: string,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.postsService.getReactions(locale, slug, sessionId);
  }

  @Public()
  @Post(':locale/:slug/reactions')
  async addReaction(
    @Param('locale') locale: string,
    @Param('slug') slug: string,
    @Body()
    body: {
      type: 'CLAP' | 'HEART' | 'ROCKET' | 'BULB';
      count?: number;
      sessionId?: string;
    },
  ) {
    return this.postsService.addReaction(
      locale,
      slug,
      body.type,
      body.count,
      body.sessionId,
    );
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

  @Get(':id/translations/:locale/revisions')
  @Roles(Role.ADMIN, Role.EDITOR)
  async getRevisions(
    @Param('id') postId: string,
    @Param('locale') locale: string,
  ) {
    return this.postsService.getRevisions(postId, locale);
  }

  @Post(':id/translations/:locale/revisions/:revisionId/rollback')
  @Roles(Role.ADMIN, Role.EDITOR)
  async rollbackRevision(
    @Param('id') postId: string,
    @Param('locale') locale: string,
    @Param('revisionId') revisionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.postsService.rollbackRevision(postId, locale, revisionId, user.sub);
  }

  @Post('translate-draft')
  @Roles(Role.ADMIN, Role.EDITOR)
  async translateDraft(
    @Body()
    body: {
      title: string;
      excerpt?: string;
      contentHtml: string;
      from: string;
      to: string;
    },
  ) {
    return this.postsService.translateDraft(body);
  }
}
