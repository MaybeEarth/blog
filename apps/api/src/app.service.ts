import { Injectable } from '@nestjs/common';
import { LOCALES } from '@blog/shared';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      locales: LOCALES.map((l) => l.code),
    };
  }
}
