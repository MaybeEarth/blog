import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaProcessor } from './media.processor';
import { MediaController } from './media.controller';

@Module({
  controllers: [MediaController],
  providers: [MediaService, MediaProcessor],
  exports: [MediaService, MediaProcessor],
})
export class MediaModule {}
