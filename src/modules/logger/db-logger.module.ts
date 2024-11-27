import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DBLoggerService } from './db-logger.service';
import { DBLogger, DBLoggerSchema } from './db-logger.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: DBLogger.name,
        schema: DBLoggerSchema
      }
    ])
  ],
  providers: [DBLoggerService],
  exports: [DBLoggerService]
})
export class DBLoggerModule { }
