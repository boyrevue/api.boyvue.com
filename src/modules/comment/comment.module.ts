import { Module, forwardRef } from '@nestjs/common';
import { ReactionModule } from 'src/modules/reaction/reaction.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CommentController } from './controllers/comment.controller';
import { CommentService } from './services/comment.service';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { PerformerModule } from '../performer/performer.module';
import { PerformerAssetsModule } from '../performer-assets/performer-assets.module';
import { ReplyCommentListener, ReactionCommentListener } from './listeners';
import { Comment, CommentSchema } from './schemas/comment.schema';

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => PerformerModule),
    forwardRef(() => PerformerAssetsModule),
    forwardRef(() => ReactionModule),
    MongooseModule.forFeature([
      {
        name: Comment.name,
        schema: CommentSchema
      }
    ])
  ],
  providers: [
    CommentService,
    ReplyCommentListener,
    ReactionCommentListener
  ],
  controllers: [
    CommentController
  ],
  exports: []
})
export class CommentModule { }
