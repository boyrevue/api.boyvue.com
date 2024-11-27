import { Module, forwardRef } from '@nestjs/common';
import { AgendaModule } from 'src/kernel';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { PerformerBlockService, SiteBlockCountryService } from './services';
import {
  PerformerBlockController, SiteBlockCountryController
} from './controllers';
import { UserModule } from '../user/user.module';
import { MailerModule } from '../mailer/mailer.module';
import {
  BlockCountry,
  BlockCountrySchema,
  PerformerBlockCountry,
  PerformerBlockCountrySchema,
  PerformerBlockUser,
  PerformerBlockUserSchema
} from './schemas';

@Module({
  imports: [
    AgendaModule.register(),
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => MailerModule),
    MongooseModule.forFeature([
      {
        name: PerformerBlockCountry.name,
        schema: PerformerBlockCountrySchema
      },
      {
        name: PerformerBlockUser.name,
        schema: PerformerBlockUserSchema
      },
      {
        name: BlockCountry.name,
        schema: BlockCountrySchema
      }
    ])
  ],
  providers: [
    PerformerBlockService,
    SiteBlockCountryService
  ],
  controllers: [
    PerformerBlockController,
    SiteBlockCountryController
  ],
  exports: [
    PerformerBlockService,
    SiteBlockCountryService
  ]
})

export class BlockModule { }
