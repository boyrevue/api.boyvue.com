import {
  Controller,
  Injectable,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { DataResponse } from 'src/kernel';
import { BannerSearchRequest } from '../payloads';
import { BannerSearchService } from '../services';

@Injectable()
@Controller('site-promo')
export class BannerController {
  constructor(private readonly bannerSearchService: BannerSearchService) { }

  @Get('/search')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true
  }))
  async search(@Query() req: BannerSearchRequest) {
    const query = {
      ...req,
      status: 'active'
    };
    const list = await this.bannerSearchService.search(query);
    return DataResponse.ok(list);
  }
}
