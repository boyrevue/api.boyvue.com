import { Module, forwardRef } from '@nestjs/common';
import { MongoDBModule } from 'src/kernel';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from '../user/user.module';
import { AuthService } from './services';
import { MailerModule } from '../mailer/mailer.module';
import {
  AuthGuard, RoleGuard, LoadUser
} from './guards';
import { RegisterController } from './controllers/register.controller';
import { LoginController } from './controllers/login.controller';
import { PasswordController } from './controllers/password.controller';
import { VerificationController } from './controllers/verification.controller';

// performer
import { PerformerRegisterController } from './controllers/performer-register.controller';
import { FileModule } from '../file/file.module';
import { PerformerModule } from '../performer/performer.module';
import { Auth } from './schemas/auth.schema';
import {
  AuthSchema,
  Forgot,
  ForgotSchema,
  Verification,
  VerificationSchema
} from './schemas';
import { OndatoController } from './controllers/ondato.controller';
import { OndatoService } from './services/ondato.service';
import { SettingModule } from '../settings/setting.module';

@Module({
  imports: [
    MongoDBModule,
    forwardRef(() => PerformerModule),
    forwardRef(() => UserModule),
    forwardRef(() => MailerModule),
    forwardRef(() => FileModule),
    forwardRef(() => SettingModule),
    MongooseModule.forFeature([
      {
        name: Auth.name,
        schema: AuthSchema
      },
      {
        name: Forgot.name,
        schema: ForgotSchema
      },
      {
        name: Verification.name,
        schema: VerificationSchema
      }
    ])
  ],
  providers: [
    AuthService,
    AuthGuard,
    RoleGuard,
    LoadUser,
    OndatoService
  ],
  controllers: [
    RegisterController,
    LoginController,
    PasswordController,
    PerformerRegisterController,
    VerificationController,
    OndatoController
  ],
  exports: [
    AuthService,
    AuthGuard,
    RoleGuard,
    LoadUser,
    OndatoService
  ]
})
export class AuthModule { }
