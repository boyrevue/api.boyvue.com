import {
  Injectable, Inject, forwardRef, HttpException, ForbiddenException
} from '@nestjs/common';
import { Model, SortOrder } from 'mongoose';
import { PageableData, EntityNotFoundException } from 'src/kernel';
import { uniq } from 'lodash';
import { VideoService } from 'src/modules/performer-assets/services';
import { MailerService } from 'src/modules/mailer';
import { FeedService } from 'src/modules/feed/services';
import { InjectModel } from '@nestjs/mongoose';
import {
  ReportSearchRequestPayload, ReportCreatePayload
} from '../payloads';
import { UserDto } from '../../user/dtos';
import { ReportDto } from '../dtos/report.dto';
import { UserService } from '../../user/services';
import { PerformerService } from '../../performer/services';
import { REPORT_STATUSES, REPORT_TARGET } from '../constants';
import { Report } from '../schemas';

@Injectable()
export class ReportService {
  constructor(
    @InjectModel(Report.name) private readonly ReportModel: Model<Report>,
    @Inject(forwardRef(() => VideoService))
    private readonly videoService: VideoService,
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly mailService: MailerService,
    @Inject(forwardRef(() => FeedService))
    private readonly feedService: FeedService
  ) { }

  public async create(payload: ReportCreatePayload, user: UserDto): Promise<ReportDto> {
    const existReport = await this.ReportModel.findOne({
      target: payload.target,
      targetId: payload.targetId,
      sourceId: user._id,
      performerId: payload.performerId
    });
    if (existReport) {
      existReport.title = payload.title;
      existReport.description = payload.description;
      existReport.updatedAt = new Date();
      await existReport.save();
      return ReportDto.fromModel(existReport);
    }
    const data: Record<string, any> = { ...payload };
    data.sourceId = user._id;
    data.source = 'user';
    data.createdAt = new Date();
    data.updatedAt = new Date();
    const newReport = await this.ReportModel.create(data);
    return ReportDto.fromModel(newReport);
  }

  public async rejectReport(id) {
    const report = await this.ReportModel.findById(id);
    if (!report) throw new EntityNotFoundException();
    if (report.status !== REPORT_STATUSES.REPORTED) {
      throw new ForbiddenException();
    }
    report.status = REPORT_STATUSES.REJECTED;
    await report.save();
    return { success: true };
  }

  public async remove(id) {
    const report = await this.ReportModel.findById(id);
    if (!report) {
      throw new EntityNotFoundException();
    }
    if (report.status === REPORT_STATUSES.DELETED) {
      throw new HttpException('Report object was deleted!', 422);
    }
    report.status = REPORT_STATUSES.DELETED;
    report.updatedAt = new Date();
    await report.save();
    if (report.target === REPORT_TARGET.VIDEO) {
      const [performer, video] = await Promise.all([
        this.performerService.findById(report.performerId),
        this.videoService.findById(report.targetId)
      ]);
      performer?.email && video && await this.mailService.send({
        subject: 'Video Violation',
        to: performer?.email,
        data: {
          videoTitle: video?.title
        },
        template: 'model-report-notify'
      });
      video && await this.videoService.delete(video._id);
    }

    if (report.target === REPORT_TARGET.FEED) {
      const [performer, feed] = await Promise.all([
        this.performerService.findById(report.performerId),
        this.feedService.findById(report.targetId)
      ]);
      performer?.email && feed && await this.mailService.send({
        subject: 'Feed Violation',
        to: performer?.email,
        data: {
          videoTitle: feed?.title
        },
        template: 'model-report-notify'
      });
      feed && await this.feedService.deleteFeedToReport(feed._id);
    }

    return { deleted: true };
  }

  public async adminSearch(
    req: ReportSearchRequestPayload
  ): Promise<PageableData<ReportDto>> {
    const query: Record<string, any> = {};
    if (req.sourceId) query.sourceId = req.sourceId;
    if (req.source) query.source = req.source;
    if (req.performerId) query.performerId = req.performerId;
    if (req.targetId) query.targetId = req.targetId;
    if (req.target) query.target = req.target;
    let sort: Record<string, SortOrder> = {
      createdAt: -1
    };
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }
    const [data, total] = await Promise.all([
      this.ReportModel
        .find(query)
        .sort(sort)
        .lean()
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.ReportModel.countDocuments(query)
    ]);
    const reports = data.map((d) => ReportDto.fromModel(d));
    const UIds = uniq(data.map((d) => d.sourceId));
    const performerIds = uniq(data.map((d) => d.performerId));
    const targetIds = uniq(data.filter((d) => d.target === 'video').map((d) => d.targetId));
    const [users, performers, videos] = await Promise.all([
      UIds.length ? this.userService.findByIds(UIds) : [],
      performerIds.length ? this.performerService.findByIds(performerIds) : [],
      targetIds.length ? this.videoService.findByIds(targetIds) : []
    ]);
    reports.forEach((report: ReportDto) => {
      const user = users.find(
        (u) => u._id.toString() === report.sourceId?.toString()
      );
      const performer = performers.find(
        (p) => p._id.toString() === report.performerId?.toString()
      );
      const video = videos.find(
        (v) => v._id.toString() === report.targetId?.toString()
      );
      report.setSourceInfo(user);
      report.setPerformerInfo(performer);
      report.setTargetInfo(video);
    });
    return {
      data: reports,
      total
    };
  }

  public async performerSearch(req: ReportSearchRequestPayload, user: UserDto): Promise<PageableData<ReportDto>> {
    const query: Record<string, any> = {
      performerId: user._id
    };
    if (req.sourceId) query.sourceId = req.sourceId;
    if (req.source) query.source = req.source;
    if (req.targetId) query.targetId = req.targetId;
    if (req.target) query.target = req.target;
    let sort: Record<string, SortOrder> = {
      createdAt: -1
    };
    if (req.sort && req.sortBy) {
      sort = {
        [req.sortBy]: req.sort
      };
    }
    const [data, total] = await Promise.all([
      this.ReportModel
        .find(query)
        .sort(sort)
        .lean()
        .limit(req.limit ? Number(req.limit) : 10)
        .skip(Number(req.offset)),
      this.ReportModel.countDocuments(query)
    ]);
    const reports = data.map((d) => ReportDto.fromModel(d));
    const UIds = uniq(data.map((d) => d.sourceId));
    const performerIds = uniq(data.map((d) => d.performerId));
    const targetIds = uniq(data.map((d) => d.targetId));
    const [users, performers, videos] = await Promise.all([
      UIds.length ? this.userService.findByIds(UIds) : [],
      performerIds.length ? this.performerService.findByIds(performerIds) : [],
      targetIds.length ? this.videoService.findByIds(targetIds) : []
    ]);
    reports.forEach((report: ReportDto) => {
      const userInfo = users.find(
        (u) => u._id.toString() === report.sourceId?.toString()
      );
      const performer = performers.find(
        (p) => p._id.toString() === report.performerId?.toString()
      );
      const video = videos.find(
        (v) => v._id.toString() === report.targetId?.toString()
      );
      report.setSourceInfo(userInfo);
      report.setPerformerInfo(performer);
      report.setTargetInfo(video);
    });
    return {
      data: reports,
      total
    };
  }
}
