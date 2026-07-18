import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'glazia-api',
      timestamp: new Date().toISOString(),
    };
  }
}
