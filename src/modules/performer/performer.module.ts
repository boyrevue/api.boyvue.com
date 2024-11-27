import { Module, forwardRef } from '@nestjs/common';
import { AgendaModule } from 'src/kernel';
import { UtilsModule } from 'src/modules/utils/utils.module';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { ConfigService } from 'nestjs-config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import {
  PerformerService,
  PerformerSearchService,
  PerformerBankingService
} from './services';
import {
  AdminPerformerController,
  PerformerController
} from './controllers';
import { UserModule } from '../user/user.module';
import { FileModule } from '../file/file.module';
import { PerformerAssetsModule } from '../performer-assets/performer-assets.module';
import {
  PerformerAssetsListener,
  PerformerConnectedListener,
  UpdatePerformerStatusListener
} from './listeners';
import { MailerModule } from '../mailer/mailer.module';
import { BlockModule } from '../block/block.module';
import { PerformerCacheService } from './services/performer-cache.service';
import { SettingModule } from '../settings/setting.module';
import { RankingPerformerService } from './services/ranking-performer.service';
import { AdminRankingPerformerController } from './controllers/admin-ranking-performer.controller';
import { RankingPerformerController } from './controllers/ranking-performer.controller';
import { SocketModule } from '../socket/socket.module';
import { CategoryModule } from '../category/category.module';
import { FeedModule } from '../feed/feed.module';
import {
  BankingSetting,
  BankingSettingSchema,
  CommissionSetting,
  CommissionSettingSchema,
  Performer,
  PerformerSchema,
  RankingPerformer,
  RankingPerformerSchema,
  PaymentGatewaySetting,
  PaymentGatewaySettingSchema
} from './schemas';

@Module({
  imports: [
    AgendaModule.register(),
    // https://github.com/kyknow/@liaoliaots/nestjs-redis
    RedisModule.forRootAsync({
      // TODO - load config for redis socket
      useFactory: (configService: ConfigService) => ({
        config: configService.get('redis')
      }),
      // useFactory: async (configService: ConfigService) => configService.get('redis'),
      inject: [ConfigService]
    }),
    MongooseModule.forFeature([
      {
        name: Performer.name,
        schema: PerformerSchema
      },
      {
        name: BankingSetting.name,
        schema: BankingSettingSchema
      },
      {
        name: CommissionSetting.name,
        schema: CommissionSettingSchema
      },
      {
        name: PaymentGatewaySetting.name,
        schema: PaymentGatewaySettingSchema
      },
      {
        name: RankingPerformer.name,
        schema: RankingPerformerSchema
      }
    ]),
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => FileModule),
    forwardRef(() => SubscriptionModule),
    forwardRef(() => PerformerAssetsModule),
    forwardRef(() => UtilsModule),
    forwardRef(() => MailerModule),
    forwardRef(() => BlockModule),
    forwardRef(() => SettingModule),
    forwardRef(() => SocketModule),
    forwardRef(() => CategoryModule),
    forwardRef(() => FeedModule)
  ],
  providers: [
    PerformerService,
    PerformerSearchService,
    PerformerBankingService,
    PerformerAssetsListener,
    PerformerConnectedListener,
    UpdatePerformerStatusListener,
    PerformerCacheService,
    RankingPerformerService
  ],
  controllers: [
    AdminPerformerController,
    PerformerController,
    AdminRankingPerformerController,
    RankingPerformerController
  ],
  exports: [
    PerformerService,
    PerformerSearchService,
    PerformerCacheService
  ]
})
export class PerformerModule { }
