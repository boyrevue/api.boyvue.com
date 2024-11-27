import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UserController,
  AvatarController,
  AdminUserController,
  AdminAvatarController
} from './controllers';
import { UserService, UserSearchService } from './services';
import { AuthModule } from '../auth/auth.module';
import { FileModule } from '../file/file.module';
import { UserConnectedListener } from './listeners/user-connected.listener';
import { PerformerModule } from '../performer/performer.module';
import { SocketModule } from '../socket/socket.module';
import { User, UserSchema } from './schemas';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => PerformerModule),
    forwardRef(() => FileModule),
    forwardRef(() => SocketModule),
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema
      }
    ])
  ],
  providers: [
    UserService,
    UserSearchService,
    UserConnectedListener
  ],
  controllers: [
    UserController,
    AvatarController,
    AdminUserController,
    AdminAvatarController
  ],
  exports: [UserService, UserSearchService]
})
export class UserModule { }
