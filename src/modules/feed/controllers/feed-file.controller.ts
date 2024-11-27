import {
  Controller,
  Injectable,
  UseGuards,
  Post,
  HttpCode,
  HttpStatus,
  UseInterceptors
} from '@nestjs/common';
import { RoleGuard } from 'src/modules/auth/guards';
import { DataResponse, getConfig } from 'src/kernel';
import { CurrentUser, Roles } from 'src/modules/auth';
import { UserDto } from 'src/modules/user/dtos';
import { FileDto, FileUploaded, FileUploadInterceptor } from 'src/modules/file';
import { FeedFileService } from '../services';

@Injectable()
@Controller('feeds/performers')
export class FeedFileController {
  constructor(
    private readonly feedFileService: FeedFileService
  ) { }

  @Post('photo/upload')
  @HttpCode(HttpStatus.OK)
  @Roles('performer', 'admin')
  @UseGuards(RoleGuard)
  @UseInterceptors(
    FileUploadInterceptor('feed-photo', 'file', {
      destination: getConfig('file').feedProtectedDir,
      generateThumbnail: true
      // acl: S3ObjectCannelACL.AuthenticatedRead
    })
  )
  async uploadImage(
    @FileUploaded() file: FileDto
  ): Promise<any> {
    await this.feedFileService.validatePhoto(file);

    return DataResponse.ok({
      success: true,
      ...file.toPublicResponse(),
      url: file.getUrl()
    });
  }

  @Post('video/upload')
  @HttpCode(HttpStatus.OK)
  @Roles('performer', 'admin')
  @UseGuards(RoleGuard)
  @UseInterceptors(
    FileUploadInterceptor('feed-video', 'file', {
      destination: getConfig('file').feedProtectedDir,
      convertMp4: true
      // acl: S3ObjectCannelACL.AuthenticatedRead
    })
  )
  async uploadVideo(
    @CurrentUser() user: UserDto,
    @FileUploaded() file: FileDto
  ): Promise<any> {
    await this.feedFileService.validateVideo(file);

    return DataResponse.ok({
      success: true,
      ...file.toPublicResponse(),
      url: file.getUrl()
    });
  }

  @Post('thumbnail/upload')
  @HttpCode(HttpStatus.OK)
  @Roles('performer', 'admin')
  @UseGuards(RoleGuard)
  @UseInterceptors(
    FileUploadInterceptor('feed-photo', 'file', {
      destination: getConfig('file').feedDir
      // acl: S3ObjectCannelACL.PublicRead
    })
  )
  async uploadThumb(
    @FileUploaded() file: FileDto
  ): Promise<any> {
    await this.feedFileService.validatePhoto(file);

    return DataResponse.ok({
      success: true,
      ...file.toPublicResponse(),
      url: file.getUrl()
    });
  }

  @Post('teaser/upload')
  @HttpCode(HttpStatus.OK)
  @Roles('performer', 'admin')
  @UseGuards(RoleGuard)
  @UseInterceptors(
    FileUploadInterceptor('feed-video', 'file', {
      destination: getConfig('file').feedDir,
      convertMp4: true
      // acl: S3ObjectCannelACL.PublicRead
    })
  )
  async uploadTeaser(
    @FileUploaded() file: FileDto
  ): Promise<any> {
    await this.feedFileService.validateVideo(file);
    return DataResponse.ok({
      success: true,
      ...file.toPublicResponse(),
      url: file.getUrl()
    });
  }
}
