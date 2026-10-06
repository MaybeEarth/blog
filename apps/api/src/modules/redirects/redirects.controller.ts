import { Controller, Get, Query, NotFoundException } from '@nestjs/common';
import { RedirectsService } from './redirects.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('redirects')
export class RedirectsController {
  constructor(private readonly redirectsService: RedirectsService) {}

  @Public()
  @Get()
  async findRedirect(
    @Query('locale') locale?: string,
    @Query('path') path?: string,
  ) {
    if (!path) {
      throw new NotFoundException('Yol parametresi gereklidir');
    }
    const redirect = await this.redirectsService.findRedirect(locale || 'tr', path);
    if (!redirect) {
      throw new NotFoundException('Yönlendirme bulunamadı');
    }
    return redirect;
  }
}
