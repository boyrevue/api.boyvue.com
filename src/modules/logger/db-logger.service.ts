import { Injectable, LoggerService } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SearchRequest } from 'src/kernel';
import { DBLogger } from './db-logger.schema';
import { HttpExceptionLogModel } from './http-exception-log.model';
import { RequestLogModel } from './request-log.model';

@Injectable()
export class DBLoggerService implements LoggerService {
  constructor(
    @InjectModel(DBLogger.name) private readonly DBLoggerModel: Model<DBLogger>
  ) {}

  async writeLog(context, level: string, message: any) {
    const log = await this.DBLoggerModel.create({
      context,
      level,
      message
    });
    await log.save();
  }

  async log(message: any, options: Record<string, any> = {}) {
    const { context } = options || {};
    await this.writeLog(context, 'log', message);
  }

  async error(message: any, options: Record<string, any> = {}) {
    const { context } = options || {};
    await this.writeLog(context, 'error', message);
  }

  async warn(message: any, options: Record<string, any> = {}) {
    const { context } = options || {};
    await this.writeLog(context, 'error', message);
  }

  public async getSystemLogs(payload: SearchRequest) {
    const query: Record<string, any> = {};
    const [data, total] = await Promise.all([
      this.DBLoggerModel
        .find(query)
        .sort({
          createdAt: -1
        })
        .limit(payload.limit)
        .skip(payload.offset),
      this.DBLoggerModel.countDocuments(query)
    ]);
    return {
      data,
      total
    };
  }

  public async getHttpexceptionLogs(payload: SearchRequest) {
    const query: Record<string, any> = {};
    const [data, total] = await Promise.all([
      HttpExceptionLogModel
        .find(query)
        .sort({
          createdAt: -1
        })
        .limit(payload.limit)
        .skip(payload.offset),
      HttpExceptionLogModel.countDocuments(query)
    ]);
    return {
      data,
      total
    };
  }

  public async getRequestLogs(payload: SearchRequest) {
    const query: Record<string, any> = {};
    const [data, total] = await Promise.all([
      RequestLogModel
        .find(query)
        .sort({
          createdAt: -1
        })
        .limit(payload.limit)
        .skip(payload.offset),
      RequestLogModel.countDocuments(query)
    ]);
    return {
      data,
      total
    };
  }
}
