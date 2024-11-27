import { Module, forwardRef } from '@nestjs/common';
import { QueueModule } from 'src/kernel';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { PostService, PostSearchService } from './services';
import {
  PostController,
  AdminPostController
} from './controllers';
import { UserModule } from '../user/user.module';
import { FileModule } from '../file/file.module';
import { Post, PostSchema } from './schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Post.name,
        schema: PostSchema
      }
    ]),
    QueueModule.forRoot(),
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => FileModule)
  ],
  providers: [
    PostService,
    PostSearchService
  ],
  controllers: [
    PostController,
    AdminPostController
  ],
  exports: [PostService, PostSearchService]
})
export class PostModule { }
