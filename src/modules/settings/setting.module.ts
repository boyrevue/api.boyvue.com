import { Module, forwardRef } from '@nestjs/common';
import { QueueModule } from 'src/kernel';
import { MailerModule } from 'src/modules/mailer/mailer.module';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuService, SettingService } from './services';
import { SettingController } from './controllers/setting.controller';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { SettingFileUploadController } from './controllers/setting-file-upload.controller';
import { FileModule } from '../file/file.module';
import { AdminSettingController } from './controllers/admin-setting.controller';
import { MenuController } from './controllers/menu.controller';
import {
  Menu, MenuSchema, Setting, SettingSchema
} from './schemas';

@Module({
  imports: [
    QueueModule.forRoot(),
    MongooseModule.forFeature([
      {
        name: Setting.name,
        schema: SettingSchema
      },
      {
        name: Menu.name,
        schema: MenuSchema
      }
    ]),
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => FileModule),
    forwardRef(() => MailerModule)
  ],
  providers: [
    SettingService,
    MenuService
  ],
  controllers: [
    SettingController,
    SettingFileUploadController,
    AdminSettingController,
    MenuController
  ],
  exports: [SettingService, MenuService]
})
export class SettingModule {
  constructor(private settingService: SettingService) {
    this.settingService.syncCache();
  }
}
