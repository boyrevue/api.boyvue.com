import {
  HttpCode,
  HttpStatus,
  Controller,
  Get,
  Injectable,
  Query,
  Request,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { DataResponse } from 'src/kernel';
import { CountryService } from 'src/modules/utils/services';
import { SearchPayload } from '../payloads';
import { SearchService } from '../services/search.service';

@Injectable()
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly countryService: CountryService
  ) { }

  @Get('/total')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async list(
    @Query() query: SearchPayload,
    @Request() req
  ) {
    let ipClient = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    if (ipClient.substr(0, 7) === '::ffff:') {
      ipClient = ipClient.substr(7);
    }
    // const ipClient = '115.75.211.252';
    const whiteListIps = ['127.0.0.1', '0.0.0.1'];
    let countryCode = null;
    if (whiteListIps.indexOf(ipClient) === -1) {
      const userCountry: Record<string, any> = await this.countryService.findCountryByIP(ipClient);
      if (userCountry?.status === 'success' && userCountry?.countryCode) {
        countryCode = userCountry.countryCode;
      }
    }
    const stats = await this.searchService.countTotal(query, countryCode);
    return DataResponse.ok(stats);
  }
}
