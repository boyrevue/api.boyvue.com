import {
  Controller,
  UseGuards,
  Post,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Get,
  Param,
  HttpException,
  Delete
} from '@nestjs/common';
import { AuthGuard, RoleGuard } from 'src/modules/auth/guards';
import { DataResponse } from 'src/kernel';
import { CurrentUser, Roles } from 'src/modules/auth';
import { PerformerDto } from 'src/modules/performer/dtos';
import { UserDto } from 'src/modules/user/dtos';
import { PerformerCacheService } from 'src/modules/performer/services/performer-cache.service';
import { StreamService } from '../services/stream.service';

@Controller('streaming')
export class StreamController {
  constructor(
    private readonly streamService: StreamService,
    private readonly performerCacheService: PerformerCacheService
  ) { }

  @Post('/live')
  @HttpCode(HttpStatus.OK)
  @Roles('performer')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async goLive(@CurrentUser() performer: PerformerDto) {
    // if it is not active, throw error
    const isActive = await this.performerCacheService.isActivePerformer(performer._id);
    if (!isActive) {
      throw new HttpException('You can Go Live only when your account is approved by admin.', 400);
    }

    const data = await this.streamService.goLive(performer._id);
    return DataResponse.ok(data);
  }

  @Post('/join/:id')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async join(@Param('id') performerId: string) {
    const data = await this.streamService.joinPublicChat(performerId);
    return DataResponse.ok(data);
  }

  @Post('/private-chat/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('user')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async requestPrivateChat(
    @Param('id') performerId: string,
    @CurrentUser() user: UserDto
  ): Promise<DataResponse<any>> {
    const data = await this.streamService.requestPrivateChat(user, performerId);

    return DataResponse.ok(data);
  }

  @Get('/private-chat/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('performer')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async accpetPrivateChat(
    @Param('id') id: string,
    @CurrentUser() performer: PerformerDto
  ): Promise<DataResponse<any>> {
    const data = await this.streamService.accpetPrivateChat(id, performer._id, performer.username);
    return DataResponse.ok(data);
  }

  @Get('/private-chat/check-stream/:id')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getPrivateChat(
    @Param('id') id: string
  ): Promise<DataResponse<any>> {
    const data = await this.streamService.getPrivateChat(id);
    return DataResponse.ok(data);
  }

  @Post('/token')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async getToken(): Promise<DataResponse<any>> {
    const result = await this.streamService.getToken();
    return DataResponse.ok(result);
  }

  @Get('/private/available-list')
  @HttpCode(HttpStatus.OK)
  @Roles('performer')
  @UseGuards(RoleGuard)
  async getAvailablePrivateStreams(
    @CurrentUser() user: UserDto
  ): Promise<DataResponse<any>> {
    const result = await this.streamService.getAvailablePrivateStreamRequestsForPerformer(user._id);
    return DataResponse.ok(result);
  }

  @Delete('/private/available-list/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('performer')
  @UseGuards(RoleGuard)
  async rejectAvailablePrivateStreams(
    @CurrentUser() user: UserDto,
    @Param('id') id: string
  ): Promise<DataResponse<any>> {
    const result = await this.streamService.rejectAvailablePrivateStreamRequestsForPerformer(id, user);
    return DataResponse.ok(result);
  }
}
