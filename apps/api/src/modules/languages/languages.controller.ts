import { Controller, Get, Param } from '@nestjs/common';
import { LanguagesService } from './languages.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('languages')
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  @Public()
  @Get()
  async findAll() {
    return this.languagesService.findAll();
  }

  @Public()
  @Get(':code')
  async findByCode(@Param('code') code: string) {
    return this.languagesService.findByCode(code);
  }
}
