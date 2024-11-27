import {
  Post,
  HttpCode,
  HttpStatus,
  Body,
  Controller,
  HttpException,
  forwardRef,
  Inject,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { UserService } from 'src/modules/user/services';
import { DataResponse } from 'src/kernel';
import { SettingService } from 'src/modules/settings';
import {
  STATUS_INACTIVE
} from 'src/modules/user/constants';
import { PerformerService } from 'src/modules/performer/services';
import { SETTING_KEYS } from 'src/modules/settings/constants';
import { UserDto } from 'src/modules/user/dtos';
import { PerformerDto } from 'src/modules/performer/dtos';
import { LoginPayload } from '../payloads';
import { AuthService } from '../services';
import {
  PasswordIncorrectException,
  EmailNotVerifiedException,
  AccountInactiveException
} from '../exceptions';

@Controller('auth')
export class LoginController {
  constructor(
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly authService: AuthService
  ) { }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true
  }))
  public async login(
    @Body() req: LoginPayload
  ): Promise<DataResponse<{ token: string }>> {
    let user: UserDto | PerformerDto = await this.userService.findByUsernameOrEmail(req.username);
    if (!user) {
      user = await this.performerService.findByUsernameOrEmail(req.username);
    }

    if (!user) {
      throw new HttpException('This account is not found. Please sign up', 404);
    }
    const authPassword = await this.authService.findBySource({
      sourceId: user._id,
      type: 'password'
    });
    if (!authPassword) {
      throw new HttpException('This account is not found. Please sign up', 404);
    }

    const requireEmailVerification = SettingService.getValueByKey(SETTING_KEYS.REQUIRE_EMAIL_VERIFICATION_USER);
    if (requireEmailVerification && !user.verifiedEmail) {
      throw new EmailNotVerifiedException();
    }

    // allow model to login
    // if (performer && !performer.verifiedDocument) {
    //   throw new HttpException('Please wait for admin to verify your account, or you can contact admin by send message in contact page', 403);
    // }
    if (user.status === STATUS_INACTIVE) {
      throw new AccountInactiveException();
    }
    if (!this.authService.verifyPassword(req.password, authPassword)) {
      throw new PasswordIncorrectException();
    }

    const token = req.remember ? this.authService.generateJWT(authPassword, { expiresIn: 60 * 60 * 24 * 365 }) : this.authService.generateJWT(authPassword, { expiresIn: 60 * 60 * 24 * 1 });

    return DataResponse.ok({ token });
  }
}
