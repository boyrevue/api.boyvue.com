import {
  Post,
  HttpCode,
  HttpStatus,
  Body,
  Controller,
  Put,
  UseGuards,
  Get,
  Res,
  Query,
  HttpException,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { Response } from 'express';
import * as moment from 'moment';
import { UserService } from 'src/modules/user/services';
import { PerformerService } from 'src/modules/performer/services';
import { UserDto } from 'src/modules/user/dtos';
import { DataResponse } from 'src/kernel';
import { AuthService } from '../services';
import { AuthGuard, RoleGuard } from '../guards';
import { CurrentUser, Roles } from '../decorators';
import {
  PasswordChangePayload, PasswordAdminChangePayload, ForgotPayload
} from '../payloads';
import { AccountNotFoundxception } from '../exceptions';

@Controller('auth')
export class PasswordController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly performerService: PerformerService
  ) { }

  @Put('users/me/password')
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true
  }))
  public async updatePassword(
    @CurrentUser() user: UserDto,
    @Body() payload: PasswordChangePayload
  ): Promise<DataResponse<boolean>> {
    await this.authService.updateAuthPassword({
      source: payload.source || 'user',
      sourceId: user._id,
      value: payload.password,
      type: 'password'
    });
    return DataResponse.ok(true);
  }

  @Put('users/password')
  @Roles('admin')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true
  }))
  public async updateUserPassword(
    @CurrentUser() user: UserDto,
    @Body() payload: PasswordAdminChangePayload
  ): Promise<DataResponse<boolean>> {
    await this.authService.updateAuthPassword({
      source: payload.source || 'user',
      sourceId: payload.userId || user._id,
      value: payload.password,
      type: 'password'
    });
    return DataResponse.ok(true);
  }

  @Post('users/forgot')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true
  }))
  public async forgotPassword(
    @Body() req: ForgotPayload
  ): Promise<DataResponse<{ success: boolean }>> {
    let user = await this.userService.findByEmail(req.email.toLowerCase());
    if (!user) {
      user = await this.performerService.findByEmail(req.email.toLowerCase()) as any;
    }
    if (!user) {
      throw new HttpException('Sorry, we couldn\'t find your account. Please recheck the email entered', 404);
    }
    const authPassword = await this.authService.findBySource({
      sourceId: user._id,
      type: 'password'
    });

    if (!authPassword) {
      throw new AccountNotFoundxception();
    }

    await this.authService.forgot(authPassword, {
      _id: user._id,
      email: user.email
    });

    return DataResponse.ok({
      success: true
    });
  }

  @Get('password-change')
  public async renderUpdatePassword(
    @Res() res: Response,
    @Query('token') token: string
  ) {
    if (!token) {
      return res.render('404.html');
    }

    const forgot = await this.authService.getForgotByToken(token);
    if (!forgot) {
      return res.render('404.html');
    }
    if (moment(forgot.createdAt).isAfter(moment().add(1, 'day'))) {
      await this.authService.deleteForgotById(forgot._id);
      return res.render('404.html');
    }

    return res.render('password-change.html');
  }

  @Post('password-change')
  public async updatePasswordForm(
    @Res() res: Response,
    @Query('token') token: string,
    @Body('password') password: string
  ) {
    if (!token || !password || password.length < 6) {
      return res.render('404.html');
    }

    const forgot = await this.authService.getForgotByToken(token);
    if (!forgot) {
      return res.render('404.html');
    }
    // TODO - check forgot table
    await this.authService.updateAuthPassword({
      source: forgot.source,
      sourceId: forgot.sourceId,
      value: password,
      type: 'password'
    });
    await this.authService.deleteForgotById(forgot._id);
    // TODO - should remove other forgot link?
    return res.render('password-change.html', {
      done: true
    });
  }
}
