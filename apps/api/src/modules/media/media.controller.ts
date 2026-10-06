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
import { MediaService } from './media.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Role } from '@prisma/client';
import {
  requestPresignedUrlSchema,
  RequestPresignedUrlInput,
  updateMediaTranslationSchema,
  UpdateMediaTranslationInput,
  mediaQuerySchema,
  MediaQueryInput,
  JwtPayload,
} from '@blog/shared';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('presign')
  @Roles(Role.ADMIN, Role.EDITOR)
  async requestPresignedUpload(
    @Body(new ZodValidationPipe(requestPresignedUrlSchema))
    dto: RequestPresignedUrlInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.mediaService.requestPresignedUpload(dto, user.sub);
  }

  @Post(':id/complete')
  @Roles(Role.ADMIN, Role.EDITOR)
  async completeUpload(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.mediaService.completeUpload(id, user.sub, user.role as Role);
  }

  @Get()
  @Roles(Role.ADMIN, Role.EDITOR)
  async findList(
    @Query(new ZodValidationPipe(mediaQuerySchema)) query: MediaQueryInput,
  ) {
    return this.mediaService.findList(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  async findById(@Param('id') id: string) {
    return this.mediaService.findById(id);
  }

  @Put(':id/translations/:locale')
  @Roles(Role.ADMIN, Role.EDITOR)
  async updateTranslation(
    @Param('id') id: string,
    @Param('locale') locale: string,
    @Body(new ZodValidationPipe(updateMediaTranslationSchema))
    dto: UpdateMediaTranslationInput,
  ) {
    return this.mediaService.updateTranslation(id, locale, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async deleteMedia(@Param('id') id: string) {
    return this.mediaService.deleteMedia(id);
  }
}
