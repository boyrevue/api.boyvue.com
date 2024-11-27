import {
  HttpCode,
  HttpStatus,
  Controller,
  Get,
  Injectable,
  UseGuards,
  Request,
  Body,
  Put,
  Query,
  Param,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { AuthGuard, RoleGuard } from 'src/modules/auth/guards';
import { CurrentUser, Roles } from 'src/modules/auth/decorators';
import { DataResponse, PageableData } from 'src/kernel';
import { PerformerDto } from 'src/modules/performer/dtos';
import { UserService, UserSearchService } from '../services';
import { UserDto } from '../dtos';
import { UserUpdatePayload, UserSearchRequestPayload } from '../payloads';

@Injectable()
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userSearchService: UserSearchService
  ) { }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async me(@Request() req: any): Promise<DataResponse<Partial<UserDto | PerformerDto>>> {
    const { authUser, jwToken } = req;
    const user = await this.userService.getMe(authUser.sourceId, jwToken);
    return DataResponse.ok(user);
  }

  @Put()
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateMe(
    @CurrentUser() currentUser: UserDto,
    @Body() payload: UserUpdatePayload
  ): Promise<DataResponse<Partial<UserDto>>> {
    await this.userService.update(currentUser._id, payload, currentUser);
    const user = await this.userService.findById(currentUser._id);
    return DataResponse.ok(new UserDto(user).toResponse(true));
  }

  @Get('/search')
  @Roles('performer')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async search(
    @Query() req: UserSearchRequestPayload
  ): Promise<DataResponse<PageableData<Partial<UserDto>>>> {
    return DataResponse.ok(await this.userSearchService.performerSearch(req));
  }

  @Get('/:id/balance')
  @Roles('performer', 'user')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getUserbalance(
    @Param(':id') id: string
  ): Promise<DataResponse<any>> {
    return DataResponse.ok(
      await this.userService.getUserBalance(id)
    );
  }
}
