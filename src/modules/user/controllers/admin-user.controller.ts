import {
  HttpCode,
  HttpStatus,
  Controller,
  Get,
  Injectable,
  UseGuards,
  Body,
  Put,
  Query,
  ValidationPipe,
  UsePipes,
  Param,
  Post
} from '@nestjs/common';
import { RoleGuard } from 'src/modules/auth/guards';
import { Roles } from 'src/modules/auth/decorators';
import { PageableData } from 'src/kernel/common';
import { DataResponse } from 'src/kernel';
import { AuthService } from 'src/modules/auth';
import {
  UserSearchRequestPayload,
  UserAuthCreatePayload,
  UserAuthUpdatePayload
} from '../payloads';

import { UserDto } from '../dtos';
import { UserService, UserSearchService } from '../services';

@Injectable()
@Controller('admin/users')
export class AdminUserController {
  constructor(
    private readonly userService: UserService,
    private readonly userSearchService: UserSearchService,
    private readonly authService: AuthService
  ) { }

  @Get('/search')
  @Roles('admin')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async search(
    @Query() req: UserSearchRequestPayload
  ): Promise<DataResponse<PageableData<Partial<UserDto>>>> {
    return DataResponse.ok(await this.userSearchService.search(req));
  }

  @Post('/')
  @Roles('admin')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createUser(
    @Body() payload: UserAuthCreatePayload
  ): Promise<DataResponse<Partial<UserDto>>> {
    const user = await this.userService.create(payload, {
      roles: payload.roles
    });

    if (payload.password) {
      // generate auth if have pw, otherwise will create random and send to user email?
      await this.authService.createAuthPassword({
        type: 'password',
        value: payload.password,
        source: 'user',
        key: payload.email,
        sourceId: user._id
      });
    }

    return DataResponse.ok(new UserDto(user).toResponse(true));
  }

  @Put('/:id')
  @Roles('admin')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateUser(
    @Body() payload: UserAuthUpdatePayload,
    @Param('id') userId: string
  ): Promise<DataResponse<any>> {
    await this.userService.adminUpdate(userId, payload);

    const user = await this.userService.findById(userId);
    return DataResponse.ok(new UserDto(user).toResponse(true));
  }

  @Get('/:id/view')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  async getDetails(
    @Param('id') id: string
  ): Promise<DataResponse<Partial<UserDto>>> {
    const user = await this.userService.findById(id);
    // TODO - check roles or other to response info
    return DataResponse.ok(new UserDto(user).toResponse(true));
  }
}
