import {
  Post,
  HttpCode,
  HttpStatus,
  Body,
  Controller,
  Get,
  Res,
  Query,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { UserService } from 'src/modules/user/services';
import { DataResponse } from 'src/kernel';
import { SettingService } from 'src/modules/settings';
import { STATUS_ACTIVE, ROLE_USER } from 'src/modules/user/constants';
import { Response } from 'express';
import { SETTING_KEYS } from 'src/modules/settings/constants';
import { UserRegisterPayload } from '../payloads';
import { AuthService } from '../services';

@Controller('auth')
export class RegisterController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService
  ) { }

  @Post([
    '/register',
    'users/register'
  ])
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true
  }))
  async userRegister(
    @Body() payload: UserRegisterPayload
  ): Promise<DataResponse<{ message: string }>> {
    const user = await this.userService.create(payload as any, {
      status: STATUS_ACTIVE,
      roles: ROLE_USER
    });

    await this.authService.createAuthPassword({
      source: 'user',
      sourceId: user._id,
      type: 'password',
      value: payload.password,
      key: payload.email
    });
    // always send email verification
    user.email && await this.authService.sendVerificationEmail({
      source: 'user',
      sourceId: user._id,
      email: user.email
    });
    const requireEmailVerification = SettingService.getValueByKey(SETTING_KEYS.REQUIRE_EMAIL_VERIFICATION_USER);
    return DataResponse.ok({
      message: requireEmailVerification ? 'Please verify your account using the verification email sent to you.' : 'Your account is active, please login !'
    });
  }

  @Get('email-verification')
  public async verifyEmail(
    @Res() res: Response,
    @Query('token') token: string
  ) {
    if (!token) {
      return res.render('404.html');
    }
    await this.authService.verifyEmail(token);
    const redirectUrl = SettingService.getValueByKey(SETTING_KEYS.EMAIL_VERIFIED_SUCCESS_URL)
      || process.env.EMAIL_VERIFIED_SUCCESS_URL
      || `${process.env.BASE_URL}/auth/login`;

    return res.redirect(redirectUrl);
  }
}
