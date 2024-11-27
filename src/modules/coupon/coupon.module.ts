import { Module, forwardRef } from '@nestjs/common';
import { QueueModule } from 'src/kernel';
import { PaymentModule } from 'src/modules/payment/payment.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { CouponService, CouponSearchService } from './services';
import { AdminCouponController, CouponController } from './controllers';
import { UpdateCouponUsesListener } from './listeners/coupon-used-listenter';
import { Coupon, CouponSchema } from './schemas';

@Module({
  imports: [
    QueueModule.forRoot(),
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => PaymentModule),
    MongooseModule.forFeature([
      {
        name: Coupon.name,
        schema: CouponSchema
      }
    ])
  ],
  providers: [CouponService, CouponSearchService, UpdateCouponUsesListener],
  controllers: [
    AdminCouponController,
    CouponController
  ],
  exports: [CouponService, CouponSearchService]
})
export class CouponModule { }
