import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DBLogger, DBLoggerSchema } from './db-logger.schema';
import { AdminLogger } from './admin-logger.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: DBLogger.name,
        schema: DBLoggerSchema
      }
    ]),
    forwardRef(() => AuthModule)
  ],
  controllers: [AdminLogger]
})
export class DBLoggerModule2 { }
