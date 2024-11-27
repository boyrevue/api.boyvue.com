import {
  Controller,
  Injectable,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Get,
  Post,
  Param,
  Body,
  HttpException
} from '@nestjs/common';
import { DataResponse } from 'src/kernel';
import { SettingService } from '../services';

@Injectable()
@Controller('settings')
export class SettingController {
  constructor(private readonly settingService: SettingService) { }

  @Get('/public')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getPublicSettings(): Promise<DataResponse<Record<string, any>>> {
    const data = await this.settingService.getAutoloadPublicSettingsForUser();
    return DataResponse.ok(data);
  }

  @Get('/keys/:key')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getPublicValueByKey(
    @Param('key') key: string
  ): Promise<DataResponse<Record<string, any>>> {
    const data = await this.settingService.getPublicValueByKey(key);
    return DataResponse.ok(data);
  }

  @Post('/keys')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getPublicValueByKeys(
    @Body('keys') keys: string[]
  ): Promise<DataResponse<Record<string, any>>> {
    if (!Array.isArray(keys)) return null;
    const data = await this.settingService.getPublicValueByKeys(keys);
    return DataResponse.ok(data);
  }

  @Get('/public/:key')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getPublicSettingByKey(
    @Param('key') key: string
  ): Promise<DataResponse<any>> {
    const data = SettingService.getByKey(key);
    if (!data.public || !data.visible) {
      throw new HttpException('Error', 400);
    }
    return DataResponse.ok({
      value: data.value
    });
  }
}
