import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { AdminWalletPackageController, WalletPackageSearchController } from './controllers';
import { WalletPackageSearchService } from './services/wallet-package-search.service';
import { WalletPackageService } from './services/wallet-package.service';
import { WalletPackage, WalletPackageSchema } from './schemas';

@Module({
  controllers: [AdminWalletPackageController, WalletPackageSearchController],
  exports: [WalletPackageService],
  imports: [
    MongooseModule.forFeature([
      {
        name: WalletPackage.name,
        schema: WalletPackageSchema
      }
    ]),
    forwardRef(() => AuthModule)
  ],
  providers: [WalletPackageSearchService, WalletPackageService]
})
export class WalletPackageModule { }
