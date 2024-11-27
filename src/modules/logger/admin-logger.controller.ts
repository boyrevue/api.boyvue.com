import {
  Controller,
  Injectable,
  UseGuards,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Get,
  Query
} from '@nestjs/common';
import { RoleGuard } from 'src/modules/auth/guards';
import {
  DataResponse, SearchRequest
} from 'src/kernel';
import { Roles } from 'src/modules/auth/decorators';
import { DBLoggerService } from './db-logger.service';

@Injectable()
@Controller('admin/logger')
export class AdminLogger {
  constructor(
    private readonly dbLoggerService: DBLoggerService
  ) { }

  @Get('/system-logs')
  @Roles('admin')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getSystemLogs(
    @Query() req: SearchRequest
  ): Promise<DataResponse<any>> {
    const data = await this.dbLoggerService.getSystemLogs(req);
    return DataResponse.ok(data);
  }

  @Get('/http-exception-logs')
  @Roles('admin')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getHttpExceptionLogs(
    @Query() req: SearchRequest
  ): Promise<DataResponse<any>> {
    const data = await this.dbLoggerService.getHttpexceptionLogs(req);
    return DataResponse.ok(data);
  }

  @Get('/request-logs')
  @Roles('admin')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getRequestLogs(
    @Query() req: SearchRequest
  ): Promise<DataResponse<any>> {
    const data = await this.dbLoggerService.getRequestLogs(req);
    return DataResponse.ok(data);
  }
}
