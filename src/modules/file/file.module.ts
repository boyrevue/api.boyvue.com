import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { FileController } from './controllers/file.controller';
import { FileService, FileVideoService } from './services';
import { ImageService } from './services/image.service';
import { File, FileSchema } from './schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: File.name,
        schema: FileSchema
      }
    ]),
    forwardRef(() => AuthModule)
  ],
  providers: [FileService, ImageService, FileVideoService],
  controllers: [FileController],
  exports: [FileService, ImageService, FileVideoService]
})
export class FileModule { }
