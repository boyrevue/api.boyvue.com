import {
  Controller,
  Injectable,
  UseGuards,
  Body,
  Post,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  Put,
  Param,
  Delete,
  Get,
  Query,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { RoleGuard } from 'src/modules/auth/guards';
import { DataResponse, getConfig } from 'src/kernel';
import { Roles } from 'src/modules/auth';
import { MultiFileUploadInterceptor, FilesUploaded, FileDto } from 'src/modules/file';
import {
  BannerCreatePayload,
  BannerUpdatePayload,
  BannerSearchRequest
} from '../payloads';
import { BannerService, BannerSearchService } from '../services';

@Injectable()
@Controller('admin/site-promo')
export class AdminBannerController {
  constructor(
    private readonly bannerService: BannerService,
    private readonly bannerSearchService: BannerSearchService
  ) { }

  @Post('/upload')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  @UseInterceptors(
    // TODO - check and support multiple files!!!
    MultiFileUploadInterceptor([
      {
        type: 'banner',
        fieldName: 'banner',
        options: {
          destination: getConfig('file').bannerProtectedDir
        }
      }
    ])
  )
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true
  }))
  async upload(
    @FilesUploaded() files: Record<string, FileDto>,
    @Body() payload: BannerCreatePayload
  ): Promise<any> {
    const resp = await this.bannerService.create(files.banner, payload);
    return DataResponse.ok(resp);
  }

  @Put('/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true
  }))
  async update(
    @Param('id') id: string,
    @Body() payload: BannerUpdatePayload
  ) {
    const details = await this.bannerService.updateInfo(id, payload);
    return DataResponse.ok(details);
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  async delete(@Param('id') id: string) {
    const details = await this.bannerService.delete(id);
    return DataResponse.ok(details);
  }

  @Get('/search')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true
  }))
  async search(@Query() req: BannerSearchRequest) {
    const list = await this.bannerSearchService.search(req);
    return DataResponse.ok(list);
  }

  @Get('/:id/view')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  async details(@Param('id') id: string) {
    const details = await this.bannerService.details(id);
    return DataResponse.ok(details);
  }
}
