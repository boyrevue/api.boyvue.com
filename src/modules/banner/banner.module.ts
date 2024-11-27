import { Module, forwardRef } from '@nestjs/common';
import { QueueModule } from 'src/kernel';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { FileModule } from '../file/file.module';
import { BannerService, BannerSearchService } from './services';
import { AdminBannerController } from './controllers/admin-banner.controller';
import { BannerController } from './controllers/banner.controller';
import { Banner, BannerSchema } from './schemas';

@Module({
  imports: [
    QueueModule.forRoot(),
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => FileModule),
    MongooseModule.forFeature([
      {
        name: Banner.name,
        schema: BannerSchema
      }
    ])
  ],
  providers: [BannerService, BannerSearchService],
  controllers: [AdminBannerController, BannerController],
  exports: [BannerService, BannerSearchService]
})
export class BannerModule { }
