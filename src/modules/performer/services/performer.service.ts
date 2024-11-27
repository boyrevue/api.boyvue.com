import * as moment from 'moment';
import {
  Injectable, Inject, NotAcceptableException, forwardRef, HttpException
} from '@nestjs/common';
import { Model } from 'mongoose';
import {
  EntityNotFoundException, ForbiddenException, QueueEventService, QueueEvent
} from 'src/kernel';
import { ObjectId } from 'mongodb';
import { FileService } from 'src/modules/file/services';
import { SettingService } from 'src/modules/settings';
import { SETTING_KEYS } from 'src/modules/settings/constants';
import { SubscriptionService } from 'src/modules/subscription/services/subscription.service';
import { FileDto } from 'src/modules/file';
import { UserDto } from 'src/modules/user/dtos';
import { AuthService } from 'src/modules/auth/services';
import { EVENT } from 'src/kernel/constants';
import { REF_TYPE } from 'src/modules/file/constants';
import { EmailHasBeenTakenException } from 'src/modules/user/exceptions';
import { MailerService } from 'src/modules/mailer';
import { UserService } from 'src/modules/user/services';
import { OFFLINE } from 'src/modules/stream/constant';
import { merge } from 'lodash';
import { isObjectId } from 'src/kernel/helpers/string.helper';
import { PerformerBlockService } from 'src/modules/block/services';
import { SocketUserService } from 'src/modules/socket/services/socket-user.service';
import { CategoryService } from 'src/modules/category/services';
import { InjectModel } from '@nestjs/mongoose';
import { PERFORMER_UPDATE_STATUS_CHANNEL, DELETE_PERFORMER_CHANNEL, PERFORMER_CHANNEL } from '../constants';
import {
  BankingSettingDto, CommissionSettingDto, PaymentGatewaySettingDto, PerformerDto
} from '../dtos';
import {
  UsernameExistedException, EmailExistedException
} from '../exceptions';
import {
  PerformerCreatePayload,
  PerformerUpdatePayload,
  PerformerRegisterPayload,
  SelfUpdatePayload,
  CommissionSettingPayload,
  BankingSettingPayload
} from '../payloads';
import { CommissionSetting, PaymentGatewaySetting, Performer } from '../schemas';
import { PerformerBankingService } from './performer-banking.service';

@Injectable()
export class PerformerService {
  constructor(
    @InjectModel(Performer.name) private readonly PerformerModel: Model<Performer>,
    @InjectModel(CommissionSetting.name) private readonly CommissionSettingModel: Model<CommissionSetting>,
    @InjectModel(PaymentGatewaySetting.name) private readonly PaymentGatewaySettingModel: Model<PaymentGatewaySetting>,

    private readonly performerBankingService: PerformerBankingService,

    @Inject(forwardRef(() => PerformerBlockService))
    private readonly performerBlockService: PerformerBlockService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(forwardRef(() => FileService))
    private readonly fileService: FileService,
    @Inject(forwardRef(() => SubscriptionService))
    private readonly subscriptionService: SubscriptionService,

    private readonly queueEventService: QueueEventService,
    private readonly mailService: MailerService,
    @Inject(forwardRef(() => SocketUserService))
    private readonly socketService: SocketUserService,
    @Inject(forwardRef(() => CategoryService))
    private readonly categoryService: CategoryService
  ) { }

  public async findById(id: string | ObjectId): Promise<PerformerDto> {
    const model = await this.PerformerModel.findById(id);
    return PerformerDto.fromModel(model);
  }

  public async findByUsernameOrEmail(text: string): Promise<PerformerDto> {
    if (!text) return null;

    const query = {
      $or: [{
        email: text.toLowerCase()
      }, {
        username: text.toLowerCase()
      }]
    };
    const model = await this.PerformerModel.findOne(query);
    return PerformerDto.fromModel(model);
  }

  public async updateOne(query: any, data: any) {
    await this.PerformerModel.updateOne(query, data);
  }

  public async findOne(query: any) {
    return this.PerformerModel.findOne(query);
  }

  public async getBankingSettings(performerId: ObjectId | string | any): Promise<BankingSettingDto> {
    return this.performerBankingService.findByPerformerId(performerId);
  }

  /**
   * check if username or email exist
   * @param payload
   * @returns
   */
  public async isEmailorUsernameTaken(payload) {
    const data = payload.username
      ? await this.PerformerModel.countDocuments({ username: payload.username.trim().toLowerCase() })
      : await this.PerformerModel.countDocuments({ email: payload.email.toLowerCase() });
    return data;
  }

  public async findByUsername(
    username: string,
    countryCode?: string,
    currentUser?: UserDto
  ): Promise<PerformerDto> {
    const query = isObjectId(username) ? { _id: username } : { username: username.trim() };
    const model = await this.PerformerModel.findOne(query);

    if (!model) throw new EntityNotFoundException();
    const dto = PerformerDto.fromModel(model);

    if (countryCode && `${currentUser?._id}` !== `${model._id}`) {
      const isBlockedCountry = await this.performerBlockService.checkBlockedCountryByIp(model._id, countryCode);
      if (isBlockedCountry) throw new HttpException('Your country has been blocked by this model', 403);
    }
    if (currentUser && `${currentUser._id}` !== `${model._id}`) {
      const isBlocked = await this.performerBlockService.checkBlockedByPerformer(
        model._id,
        currentUser._id
      );
      if (isBlocked) throw new HttpException('You have been blocked by this model', 403);
    }
    if (currentUser?._id) {
      const checkSubscribe = await this.subscriptionService.checkSubscribed(model._id, currentUser._id);
      dto.isSubscribed = !!checkSubscribe;
    }
    if (model.avatarId) {
      const avatar = await this.fileService.findById(model.avatarId);
      dto.avatarPath = avatar ? avatar.path : null;
    }
    if (model.welcomeVideoId) {
      const welcomeVideo = await this.fileService.findById(
        model.welcomeVideoId
      );
      dto.welcomeVideoPath = welcomeVideo ? welcomeVideo.getUrl() : null;
    }

    if (model.categoryIds?.length > 0) {
      const categories = await this.categoryService.findByIds(model.categoryIds);
      dto.setCategories(categories);
    }

    return dto;
  }

  public async findByEmail(email: string): Promise<PerformerDto> {
    if (!email) return null;
    const model = await this.PerformerModel.findOne({
      email: email.toLowerCase()
    });
    if (!model) return null;
    return PerformerDto.fromModel(model);
  }

  public async findByIds(ids: string[] | ObjectId[]): Promise<PerformerDto[]> {
    const items = await this.PerformerModel
      .find({
        _id: {
          $in: ids
        }
      });
    return items.map((item) => PerformerDto.fromModel(item));
  }

  public async getDetails(id: string | ObjectId, jwtToken: string): Promise<PerformerDto> {
    const performer = await this.PerformerModel.findById(id);
    if (!performer) {
      throw new EntityNotFoundException();
    }
    const [
      avatar,
      documentVerification,
      idVerification,
      cover,
      welcomeVideo
    ] = await Promise.all([
      performer.avatarId ? this.fileService.findById(performer.avatarId) : null,
      performer.documentVerificationId
        ? this.fileService.findById(performer.documentVerificationId)
        : null,
      performer.idVerificationId
        ? this.fileService.findById(performer.idVerificationId)
        : null,
      performer.coverId ? this.fileService.findById(performer.coverId) : null,
      performer.welcomeVideoId
        ? this.fileService.findById(performer.welcomeVideoId)
        : null
    ]);

    const dto = PerformerDto.fromModel(performer);
    dto.avatar = avatar ? FileDto.getPublicUrl(avatar.path) : null; // TODO - get default avatar
    dto.cover = cover ? FileDto.getPublicUrl(cover.path) : null;
    dto.welcomeVideoPath = welcomeVideo && welcomeVideo.getUrl();
    dto.idVerification = idVerification
      ? {
        _id: idVerification._id,
        url: jwtToken ? `${FileDto.getPublicUrl(idVerification.path)}?documentId=${idVerification._id}&token=${jwtToken}` : FileDto.getPublicUrl(idVerification.path),
        mimeType: idVerification.mimeType
      }
      : null;
    dto.documentVerification = documentVerification
      ? {
        _id: documentVerification._id,
        url: jwtToken ? `${FileDto.getPublicUrl(documentVerification.path)}?documentId=${documentVerification._id}&token=${jwtToken}` : FileDto.getPublicUrl(documentVerification.path),
        mimeType: documentVerification.mimeType
      }
      : null;

    const [ccbillSetting, paypalSetting, commissionSetting, bankingInformation, blockCountries] = await Promise.all([
      this.PaymentGatewaySettingModel.findOne({
        performerId: id,
        key: 'ccbill'
      }),
      this.PaymentGatewaySettingModel.findOne({
        performerId: id,
        key: 'paypal'
      }),
      this.CommissionSettingModel.findOne({
        performerId: id
      }),
      this.performerBankingService.findByPerformerId(id),
      this.performerBlockService.findOneBlockCountriesByQuery({
        sourceId: id
      })
    ]);

    dto.ccbillSetting = PaymentGatewaySettingDto.fromModel(ccbillSetting);
    dto.paypalSetting = PaymentGatewaySettingDto.fromModel(paypalSetting);
    dto.commissionSetting = CommissionSettingDto.fromModel(commissionSetting);
    dto.bankingInformation = bankingInformation;
    dto.blockCountries = blockCountries;
    return dto;
  }

  public async delete(id: string | ObjectId | any) {
    const performer = await this.PerformerModel.findById(id);
    if (!performer) throw new EntityNotFoundException();
    await this.PerformerModel.deleteOne({ _id: id });
    await this.queueEventService.publish(new QueueEvent({
      channel: DELETE_PERFORMER_CHANNEL,
      eventName: EVENT.DELETED,
      data: PerformerDto.fromModel(performer).toResponse()
    }));
    return { deleted: true };
  }

  public async create(payload: PerformerCreatePayload, user?: UserDto): Promise<PerformerDto> {
    if (payload.dateOfBirth) {
      const age = moment().diff(payload.dateOfBirth, 'years');
      if (age < 18) {
        throw new HttpException('Age must be 18+', 400);
      }
    }

    const data: Record<string, any> = {
      ...payload,
      updatedAt: new Date(),
      createdAt: new Date()
    };
    const countPerformerUsername = await this.PerformerModel.countDocuments({
      username: payload.username.trim().toLowerCase()
    });
    const countUserUsername = await this.userService.isEmailorUsernameTaken({ username: payload.username });
    if (countPerformerUsername || countUserUsername) {
      throw new UsernameExistedException();
    }

    const countPerformerEmail = await this.PerformerModel.countDocuments({
      email: payload.email.toLowerCase()
    });
    const countUserEmail = await this.userService.isEmailorUsernameTaken({ email: payload.email });
    if (countPerformerEmail || countUserEmail) {
      throw new EmailExistedException();
    }

    if (payload.avatarId) {
      const avatar = await this.fileService.findById(payload.avatarId);
      if (!avatar) {
        throw new EntityNotFoundException('Avatar not found!');
      }
      // TODO - check for other storaged
      data.avatarPath = avatar.path;
    }

    if (payload.coverId) {
      const cover = await this.fileService.findById(payload.coverId);
      if (!cover) {
        throw new EntityNotFoundException('Cover not found!');
      }
      // TODO - check for other storaged
      data.coverPath = cover.path;
    }

    // TODO - check for category Id, studio
    if (user) {
      data.createdBy = user._id;
    }
    data.username = data.username.trim().toLowerCase();
    data.email = data.email.toLowerCase();
    if (data.dateOfBirth) {
      data.dateOfBirth = new Date(data.dateOfBirth);
    }
    if (!data.name) {
      data.name = data.firstName && data.lastName ? [data.firstName, data.lastName].join(' ') : 'No_display_name';
    }
    const performer = await this.PerformerModel.create(data);

    await Promise.all([
      payload.idVerificationId
      && this.fileService.addRef(payload.idVerificationId, {
        itemId: performer._id,
        itemType: REF_TYPE.PERFORMER
      }),
      payload.documentVerificationId
      && this.fileService.addRef(payload.documentVerificationId, {
        itemId: performer._id,
        itemType: REF_TYPE.PERFORMER
      }),
      payload.avatarId
      && this.fileService.addRef(payload.avatarId, {
        itemId: performer._id,
        itemType: REF_TYPE.PERFORMER
      })
    ]);

    // TODO - fire event?
    const dto = PerformerDto.fromModel(performer);
    await this.queueEventService.publish(
      new QueueEvent({
        channel: PERFORMER_CHANNEL,
        eventName: EVENT.CREATED,
        data: dto
      })
    );
    return dto;
  }

  public async register(
    payload: PerformerRegisterPayload
  ): Promise<PerformerDto> {
    const data: Record<string, any> = {
      ...payload,
      updatedAt: new Date(),
      createdAt: new Date()
    };
    if (payload.dateOfBirth) {
      const age = moment().diff(payload.dateOfBirth, 'years');
      if (age < 18) {
        throw new HttpException('Age must be 18+', 400);
      }
      data.dateOfBirth = new Date(data.dateOfBirth);
    }
    const countPerformerUsername = await this.PerformerModel.countDocuments({
      username: payload.username.trim().toLowerCase()
    });
    const countUserUsername = await this.userService.isEmailorUsernameTaken({ username: payload.username });
    if (countPerformerUsername || countUserUsername) {
      throw new UsernameExistedException();
    }

    const countPerformerEmail = await this.PerformerModel.countDocuments({
      email: payload.email.toLowerCase()
    });
    const countUserEmail = await this.userService.isEmailorUsernameTaken({ email: payload.email });
    if (countPerformerEmail || countUserEmail) {
      throw new EmailExistedException();
    }

    if (payload.avatarId) {
      const avatar = await this.fileService.findById(payload.avatarId);
      if (!avatar) {
        throw new EntityNotFoundException('Avatar not found!');
      }
      // TODO - check for other storaged
      data.avatarPath = avatar.path;
    }
    data.username = data.username.trim().toLowerCase();
    data.email = data.email.toLowerCase();
    if (!data.name) {
      data.name = data.firstName && data.lastName ? [data.firstName, data.lastName].join(' ') : 'No_display_name';
    }
    const performer = await this.PerformerModel.create(data);

    await Promise.all([
      payload.idVerificationId
      && this.fileService.addRef(payload.idVerificationId, {
        itemId: performer._id,
        itemType: REF_TYPE.PERFORMER
      }),
      payload.documentVerificationId
      && this.fileService.addRef(payload.documentVerificationId, {
        itemId: performer._id,
        itemType: REF_TYPE.PERFORMER
      }),
      payload.avatarId && this.fileService.addRef(payload.avatarId, {
        itemId: performer._id,
        itemType: REF_TYPE.PERFORMER
      })
    ]);
    const adminEmail = await SettingService.getValueByKey(SETTING_KEYS.ADMIN_EMAIL);
    adminEmail && await this.mailService.send({
      subject: 'New model sign up',
      to: adminEmail,
      data: performer,
      template: 'new-performer-notify-admin'
    });

    const dto = PerformerDto.fromModel(performer);
    await this.queueEventService.publish(
      new QueueEvent({
        channel: PERFORMER_CHANNEL,
        eventName: EVENT.CREATED,
        data: dto
      })
    );

    return dto;
  }

  public async adminUpdate(
    id: string | ObjectId,
    payload: PerformerUpdatePayload
  ): Promise<boolean> {
    const performer = await this.PerformerModel.findById(id);
    if (!performer) {
      throw new EntityNotFoundException();
    }

    if (payload.dateOfBirth) {
      const age = moment().diff(payload.dateOfBirth, 'years');
      if (age < 18) {
        throw new HttpException('Age must be 18+', 400);
      }
    }

    const data: Record<string, any> = { ...payload };
    if (!data.name) {
      data.name = [data.firstName || '', data.lastName || ''].join(' ');
    }

    if (data.email && data.email.toLowerCase() !== performer.email) {
      const emailCheck = await this.PerformerModel.countDocuments({
        email: data.email.toLowerCase(),
        _id: { $ne: performer._id }
      });
      const countUserEmail = await this.userService.isEmailorUsernameTaken({ email: data.email });
      if (emailCheck || countUserEmail) {
        throw new EmailExistedException();
      }
      data.email = data.email.toLowerCase();
    }

    if (data.username && data.username.trim() !== performer.username) {
      const usernameCheck = await this.PerformerModel.countDocuments({
        username: data.username.trim().toLowerCase(),
        _id: { $ne: performer._id }
      });
      const countUserUsername = await this.userService.isEmailorUsernameTaken({ username: data.username });
      if (usernameCheck || countUserUsername) {
        throw new UsernameExistedException();
      }
      data.username = data.username.trim().toLowerCase();
    }

    if (
      (payload.avatarId && !performer.avatarId)
      || (performer.avatarId
        && payload.avatarId
        && payload.avatarId !== performer.avatarId.toString())
    ) {
      const avatar = await this.fileService.findById(payload.avatarId);
      if (!avatar) {
        throw new EntityNotFoundException('Avatar not found!');
      }
      // TODO - check for other storaged
      data.avatarPath = avatar.path;
    }

    if (
      (payload.coverId && !performer.coverId)
      || (performer.coverId
        && payload.coverId
        && payload.coverId !== performer.coverId.toString())
    ) {
      const cover = await this.fileService.findById(payload.coverId);
      if (!cover) {
        throw new EntityNotFoundException('Cover not found!');
      }
      // TODO - check for other storaged
      data.coverPath = cover.path;
    }
    if (data.dateOfBirth) {
      data.dateOfBirth = new Date(data.dateOfBirth);
    }
    await this.PerformerModel.updateOne({ _id: id }, data);
    const newPerformer = await this.PerformerModel.findById(performer._id);
    const oldStatus = performer.status;
    // fire event that updated performer status
    if (data.status !== performer.status) {
      await this.queueEventService.publish(
        new QueueEvent({
          channel: PERFORMER_UPDATE_STATUS_CHANNEL,
          eventName: EVENT.UPDATED,
          data: {
            ...PerformerDto.fromModel(newPerformer),
            oldStatus
          }
        })
      );
    }
    // update auth key if email has changed
    if (data.email && data.email.toLowerCase() !== performer.email) {
      await this.authService.sendVerificationEmail({
        email: newPerformer.email,
        sourceId: newPerformer._id,
        source: 'performer',
        template: 'email-verification-performer'
      });
      await this.authService.updateEmailKey(newPerformer._id, newPerformer.email);
    }
    await this.queueEventService.publish(
      new QueueEvent({
        channel: PERFORMER_CHANNEL,
        eventName: EVENT.UPDATED,
        data: PerformerDto.fromModel(newPerformer)
      })
    );
    return true;
  }

  public async selfUpdate(
    id: string | ObjectId,
    payload: SelfUpdatePayload
  ): Promise<boolean> {
    const performer = await this.PerformerModel.findById(id);
    if (!performer) {
      throw new EntityNotFoundException();
    }
    if (payload?.dateOfBirth) {
      const age = moment().diff(payload.dateOfBirth, 'years');
      if (age < 18) {
        throw new HttpException('Age must be 18+', 400);
      }
    }

    const data: Record<string, any> = { ...payload };
    if (!data.name) {
      data.name = [data.firstName || '', data.lastName || ''].join(' ');
    }
    if (data.email && data.email.toLowerCase() !== performer.email) {
      const emailCheck = await this.PerformerModel.countDocuments({
        email: data.email.toLowerCase(),
        _id: { $ne: performer._id }
      });
      const countUserEmail = await this.userService.isEmailorUsernameTaken({ email: data.email });
      if (emailCheck || countUserEmail) {
        throw new EmailHasBeenTakenException();
      }
      data.email = data.email.toLowerCase();
    }

    if (data.username && data.username.trim() !== performer.username) {
      const usernameCheck = await this.PerformerModel.countDocuments({
        username: data.username.trim().toLowerCase(),
        _id: { $ne: performer._id }
      });
      const countUserUsername = await this.userService.isEmailorUsernameTaken({ username: data.username });
      if (usernameCheck || countUserUsername) {
        throw new UsernameExistedException();
      }
      data.username = data.username.trim().toLowerCase();
    }
    if (data.dateOfBirth) {
      data.dateOfBirth = new Date(data.dateOfBirth);
    }
    if (data.welcomeVideoId) {
      delete data.welcomeVideoId;
    }
    if (data.welcomeVideoPath) {
      delete data.welcomeVideoPath;
    }
    await this.PerformerModel.updateOne({ _id: id }, data);
    const newPerformer = await this.PerformerModel.findById(id);
    // update auth key if email has changed
    if (data.email && data.email.toLowerCase() !== performer.email) {
      await this.authService.sendVerificationEmail({
        email: newPerformer.email,
        sourceId: newPerformer._id,
        source: 'performer',
        template: 'email-verification-performer'
      });
      await this.authService.updateEmailKey(newPerformer._id, newPerformer.email);
    }
    return true;
  }

  public async updateAvatar(user: PerformerDto, file: FileDto) {
    await this.PerformerModel.updateOne(
      { _id: user._id },
      {
        avatarId: file._id,
        avatarPath: file.path
      }
    );
    await this.fileService.addRef(file._id, {
      itemId: user._id,
      itemType: REF_TYPE.PERFORMER
    });

    // resend user info?
    // TODO - check others config for other storage
    return file;
  }

  public async updateCover(user: PerformerDto, file: FileDto) {
    await this.PerformerModel.updateOne(
      { _id: user._id },
      {
        coverId: file._id,
        coverPath: file.path
      }
    );
    await this.fileService.addRef(file._id, {
      itemId: user._id,
      itemType: REF_TYPE.PERFORMER
    });

    return file;
  }

  public async updateWelcomeVideo(user: PerformerDto, file: FileDto) {
    await this.PerformerModel.updateOne(
      { _id: user._id },
      {
        $set: {
          welcomeVideoId: file._id,
          welcomeVideoPath: file.path
        }
      }
    );
    await this.fileService.addRef(file._id, {
      itemId: user._id,
      itemType: REF_TYPE.PERFORMER
    });
    await this.fileService.queueProcessVideo(file._id);
    if (user.welcomeVideoId) {
      await this.fileService.remove(user.welcomeVideoId);
    }
    return file;
  }

  public async checkSubscribed(performerId: string | ObjectId, user: UserDto) {
    const count = performerId && user ? await this.subscriptionService.checkSubscribed(
      performerId,
      user._id
    ) : 0;
    return { subscribed: count > 0 };
  }

  public async viewProfile(id: string | ObjectId) {
    return this.PerformerModel.updateOne(
      { _id: id },
      {
        $inc: { 'stats.views': 1 }
      }
    );
  }

  public async updateLastStreamingTime(
    id: string | ObjectId,
    streamTime: number
  ) {
    return this.PerformerModel.updateOne(
      { _id: id },
      {
        $set: { lastStreamingTime: new Date(), live: false, streamingStatus: OFFLINE },
        $inc: { 'stats.totalStreamTime': streamTime }
      }
    );
  }

  public async updateStats(
    id: string | ObjectId,
    payload: Record<string, number>
  ) {
    return this.PerformerModel.updateOne({ _id: id }, { $inc: payload });
  }

  public async goLive(id: string | ObjectId) {
    return this.PerformerModel.updateOne({ _id: id }, { $set: { live: true } });
  }

  public async setStreamingStatus(id: string | ObjectId, streamingStatus: string) {
    return this.PerformerModel.updateOne({ _id: id }, { $set: { streamingStatus } });
  }

  public async updatePaymentGateway(payload: any) {
    let item = await this.PaymentGatewaySettingModel.findOne({
      key: payload.key,
      performerId: payload.performerId
    });
    if (!item) {
      item = new this.PaymentGatewaySettingModel();
    }
    item.key = payload.key;
    item.performerId = payload.performerId;
    item.status = 'active';
    item.value = payload.value;
    await item.save();
    return PaymentGatewaySettingDto.fromModel(item);
  }

  public async getPaymentSetting(performerId: string | ObjectId | any, service = 'ccbill') {
    const item = await this.PaymentGatewaySettingModel.findOne({
      key: service,
      performerId
    });
    if (!item) return null;

    return PaymentGatewaySettingDto.fromModel(item);
  }

  public async updateSubscriptionStat(performerId: string | ObjectId | any, num = 1) {
    const performer = await this.PerformerModel.findById(performerId);
    if (!performer) return false;
    return this.PerformerModel.updateOne(
      { _id: performerId },
      {
        $inc: { 'stats.subscribers': num }
      }
    );
  }

  public async updateLikeStat(performerId: string | ObjectId | any, num = 1) {
    return this.PerformerModel.updateOne(
      { _id: performerId },
      {
        $inc: { 'stats.likes': num }
      }
    );
  }

  public async updateCommissionSetting(performerId: string, payload: CommissionSettingPayload) {
    let item = await this.CommissionSettingModel.findOne({ performerId });
    if (!item) {
      item = new this.CommissionSettingModel();
    }

    merge(item, payload);
    await item.save();
    return CommissionSettingDto.fromModel(item);
  }

  public async updateBankingSetting(
    performerId: string,
    payload: BankingSettingPayload,
    currentUser: UserDto
  ) {
    if (
      (currentUser.roles
        && currentUser.roles.indexOf('admin') === -1
        && currentUser._id.toString() !== performerId)
      || (!currentUser.roles
        && currentUser
        && currentUser._id.toString() !== performerId)
    ) {
      throw new NotAcceptableException('Permission denied');
    }
    return this.performerBankingService.createOrUpdateForPerformer(performerId, payload);
  }

  public async updateVerificationStatus(
    userId: string | ObjectId
  ): Promise<any> {
    const user = await this.PerformerModel.findById(userId);
    if (!user) return true;
    return this.PerformerModel.updateOne(
      {
        _id: userId
      },
      { verifiedEmail: true }
    );
  }

  public async getCommissions(performerId: string | ObjectId) {
    return this.CommissionSettingModel.findOne({ performerId });
  }

  public async getMyCommissions(performerId: string | ObjectId) {
    const commission = await this.CommissionSettingModel.findOne({ performerId });
    const settingMonthlyCommission = SettingService.getValueByKey(SETTING_KEYS.MONTHLY_SUBSCRIPTION_COMMISSION);
    const settingYearlyCommission = SettingService.getValueByKey(SETTING_KEYS.YEARLY_SUBSCRIPTION_COMMISSION);
    const settingProductCommission = SettingService.getValueByKey(SETTING_KEYS.PRODUCT_SALE_COMMISSION);
    const settingVideoCommission = SettingService.getValueByKey(SETTING_KEYS.VIDEO_SALE_COMMISSION);
    const settingPrivateChatCommission = SettingService.getValueByKey(SETTING_KEYS.PRIVATE_CHAT_COMMISSION);
    const settingTipCommission = SettingService.getValueByKey(SETTING_KEYS.TOKEN_TIP_COMMISSION);
    const settingFeedCommission = SettingService.getValueByKey(SETTING_KEYS.FEED_SALE_COMMISSION);
    return {
      productSaleCommission: commission?.productSaleCommission || settingProductCommission,
      feedSaleCommission: commission?.feedSaleCommission || settingFeedCommission,
      videoSaleCommission: commission?.videoSaleCommission || settingVideoCommission,
      yearlySubscriptionCommission: commission?.yearlySubscriptionCommission || settingYearlyCommission,
      monthlySubscriptionCommission: commission?.monthlySubscriptionCommission || settingMonthlyCommission,
      privateChatCommission: commission?.privateChatCommission || settingPrivateChatCommission,
      tokenTipCommission: commission?.tokenTipCommission || settingTipCommission
    };
  }

  public async checkAuthDocument(req: any, user: UserDto) {
    const { query } = req;
    if (!query.documentId) {
      throw new ForbiddenException();
    }
    if (user.roles && user.roles.indexOf('admin') > -1) {
      return true;
    }
    // check type video
    const file = await this.fileService.findById(query.documentId);
    if (!file || !file.refItems || (file.refItems[0] && file.refItems[0].itemType !== REF_TYPE.PERFORMER)) return false;
    if (file.refItems && file.refItems[0].itemId && user._id.toString() === file.refItems[0].itemId.toString()) {
      return true;
    }
    throw new ForbiddenException();
  }

  public async updatePreApprovalCode(performerId: string | ObjectId, data: Partial<Record<'monthlyPreApprovalRequestCode' | 'yearlyPreApprovalRequestCode', string>>) {
    return this.PerformerModel.updateOne({ _id: performerId }, { $set: data });
  }

  public async findByPreApprovalCode(performerId: string | ObjectId, data: Partial<Record<'monthlyPreApprovalRequestCode' | 'yearlyPreApprovalRequestCode', string>>) {
    return this.PerformerModel.findOne({ _id: performerId, ...data });
  }

  public async increaseBalance(id: string | ObjectId, amount: number, withStats = true) {
    const $inc = withStats ? {
      balance: amount,
      'stats.totalTokenEarned': amount > 0 ? Math.abs(amount) : 0,
      'stats.totalTokenSpent': amount <= 0 ? Math.abs(amount) : 0
    } : { balance: amount };
    await this.PerformerModel.updateOne(
      { _id: id },
      {
        $inc
      }
    );

    const newBalance = await this.PerformerModel.findOne({ _id: id }).select('balance');
    if (newBalance) {
      await this.socketService.emitToUsers(id, 'balance_update', {
        balance: newBalance.balance
      });
    }

    return true;
  }

  public async setBalance(id: string | ObjectId, balance: number) {
    await this.PerformerModel.updateOne(
      { _id: id },
      {
        balance
      }
    );

    await this.socketService.emitToUsers(id, 'balance_update', {
      balance
    });

    return true;
  }

  /**
   * count num of models for stats
   * @param status
   * @returns
   */
  public async countByStatus(status: string): Promise<number> {
    return this.PerformerModel.countDocuments({ status });
  }

  public async countByQuery(query: Record<string, any>): Promise<number> {
    return this.PerformerModel.countDocuments(query);
  }
}
