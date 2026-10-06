import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { TagsService } from './tags.service';
import { TagsController } from './tags.controller';

@Module({
  controllers: [CategoriesController, TagsController],
  providers: [CategoriesService, TagsService],
  exports: [CategoriesService, TagsService],
})
export class TaxonomyModule {}
