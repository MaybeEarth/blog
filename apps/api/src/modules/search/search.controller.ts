import { Controller, Get, Query, UsePipes } from '@nestjs/common';
import { SearchService } from './search.service';
import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { searchQuerySchema, SearchQueryInput } from '@blog/shared';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get()
  @UsePipes(new ZodValidationPipe(searchQuerySchema))
  async search(@Query() query: SearchQueryInput) {
    return this.searchService.search(query);
  }

  @Public()
  @Get('suggest')
  async suggest(@Query('locale') locale?: string, @Query('q') q?: string) {
    return this.searchService.suggest(locale || 'tr', q || '');
  }
}
