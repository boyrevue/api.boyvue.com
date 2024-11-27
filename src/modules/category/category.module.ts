import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { AdminCategoryController } from './controllers/admin-category.controller';
import { UserCategoryController } from './controllers/user-category.controller';
import { CategoryService } from './services';
import { Category, CategorySchema } from './schemas';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([
      {
        name: Category.name,
        schema: CategorySchema
      }
    ])
  ],
  providers: [
    CategoryService
  ],
  controllers: [
    AdminCategoryController,
    UserCategoryController
  ],
  exports: [
    CategoryService
  ]
})
export class CategoryModule { }
