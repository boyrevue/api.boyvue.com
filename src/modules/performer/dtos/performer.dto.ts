import { ObjectId } from 'mongodb';
import { FileDto } from 'src/modules/file';
import { Expose, Transform, plainToInstance } from 'class-transformer';
import { CategoryDto } from 'src/modules/category/dtos';

export interface IPerformerStats {
  likes: number;
  subscribers: number;
  views: number;
  totalVideos: number;
  totalPhotos: number;
  totalGalleries: number;
  totalProducts: number;
  totalStreamTime: number;
  totalTokenEarned: number;
  totalTokenSpent: number;
  totalFeeds: number;
}
export class PerformerDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  name: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  username: string;

  @Expose()
  email: string;

  @Expose()
  phone: string;

  @Expose()
  phoneCode: string; // international code prefix

  @Expose()
  status: string;

  @Expose()
  @Transform(({ obj }) => obj.avatarId)
  avatarId: ObjectId;

  @Expose()
  avatarPath: string;

  @Expose()
  @Transform(({ obj }) => obj.coverId)
  coverId: ObjectId;

  @Expose()
  coverPath: string;

  @Expose()
  @Transform(({ obj }) => obj.idVerificationId)
  idVerificationId: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.documentVerificationId)
  documentVerificationId: ObjectId;

  @Expose()
  idVerification: any;

  @Expose()
  verifiedEmail: boolean;

  @Expose()
  verifiedAccount: boolean;

  @Expose()
  verifiedDocument: boolean;

  @Expose()
  documentVerification: any;

  @Expose()
  avatar: string;

  @Expose()
  cover: string;

  @Expose()
  completedAccount: boolean;

  @Expose()
  gender: string;

  @Expose()
  country: string;

  @Expose()
  city: string;

  @Expose()
  state: string;

  @Expose()
  zipcode: string;

  @Expose()
  address: string;

  @Expose()
  languages: string[];

  @Expose()
  @Transform(({ obj }) => obj.categoryIds)
  categoryIds: ObjectId[];

  @Expose()
  categories: Partial<CategoryDto>[];

  @Expose()
  height: string;

  @Expose()
  weight: string;

  @Expose()
  bio: string;

  @Expose()
  eyes: string;

  @Expose()
  sexualPreference: string;

  @Expose()
  monthlyPrice: number;

  @Expose()
  yearlyPrice: number;

  @Expose()
  stats: IPerformerStats;

  @Expose()
  score: number;

  @Expose()
  bankingInformation: any;

  @Expose()
  ccbillSetting: any;

  @Expose()
  paypalSetting: any;

  @Expose()
  commissionSetting: any;

  @Expose()
  blockCountries: any;

  @Expose()
  isOnline: boolean;

  @Expose()
  @Transform(({ obj }) => obj.welcomeVideoId)
  welcomeVideoId: ObjectId;

  @Expose()
  welcomeVideoPath: string;

  @Expose()
  activateWelcomeVideo: boolean;

  @Expose()
  lastStreamingTime: Date;

  @Expose()
  maxParticipantsAllowed: number;

  @Expose()
  live: boolean;

  @Expose()
  streamingStatus: string;

  @Expose()
  ondatoIDV: string;

  @Expose()
  ondatoMetadata: any;

  @Expose()
  isSubscribed: boolean;

  @Expose()
  @Transform(({ obj }) => {
    if (obj.balance < 0) return 0;
    const newVal = parseFloat((obj.balance || 0).toFixed(2));
    return newVal;
  })
  balance: number;

  @Expose()
  privateChatPrice: number;

  @Expose()
  groupChatPrice: number;

  @Expose()
  pubicHair: string;

  @Expose()
  ethnicity: string;

  @Expose()
  bodyType: string;

  @Expose()
  dateOfBirth: Date;

  @Expose()
  butt: string;

  @Expose()
  hair: string;

  @Expose()
  createdBy: ObjectId;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  // flag to set model
  isPerformer: boolean = true;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(PerformerDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  toResponse(includePrivateInfo = false, isAdmin = false) {
    const publicInfo = {
      _id: this._id,
      name: this.getName(),
      avatar: FileDto.getPublicUrl(this.avatarPath),
      cover: FileDto.getPublicUrl(this.coverPath),
      username: this.username,
      gender: this.gender,
      country: this.country,
      stats: this.stats,
      score: this.score,
      isPerformer: true,
      isOnline: this.isOnline,
      isSubscribed: this.isSubscribed,
      verifiedAccount: this.verifiedAccount,
      lastStreamingTime: this.lastStreamingTime,
      live: this.live,
      streamingStatus: this.streamingStatus,
      groupChatPrice: this.groupChatPrice,
      privateChatPrice: this.privateChatPrice,
      dateOfBirth: this.dateOfBirth,
      monthlyPrice: this.monthlyPrice,
      yearlyPrice: this.yearlyPrice,
      phone: this.phone
    };
    const privateInfo = {
      verifiedEmail: this.verifiedEmail,
      verifiedDocument: this.verifiedDocument,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      phone: this.phone,
      phoneCode: this.phoneCode,
      status: this.status,
      city: this.city,
      state: this.state,
      zipcode: this.zipcode,
      address: this.address,
      languages: this.languages,
      categoryIds: this.categoryIds,
      categories: this.categories,
      completedAccount: this.completedAccount,
      idVerificationId: this.idVerificationId,
      documentVerificationId: this.documentVerificationId,
      documentVerification: this.documentVerification,
      idVerification: this.idVerification,
      welcomeVideoId: this.welcomeVideoId,
      welcomeVideoPath: FileDto.getPublicUrl(this.welcomeVideoPath),
      activateWelcomeVideo: this.activateWelcomeVideo,
      height: this.height,
      weight: this.weight,
      bio: this.bio,
      eyes: this.eyes,
      hair: this.hair,
      pubicHair: this.pubicHair,
      ethnicity: this.ethnicity,
      bodyType: this.bodyType,
      butt: this.butt,
      sexualPreference: this.sexualPreference,
      monthlyPrice: this.monthlyPrice,
      yearlyPrice: this.yearlyPrice,
      bankingInformation: this.bankingInformation,
      blockCountries: this.blockCountries,
      paypalSetting: this.paypalSetting,
      maxParticipantsAllowed: this.maxParticipantsAllowed,
      balance: this.balance,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };

    if (isAdmin) {
      return {
        ...publicInfo,
        ...privateInfo,
        ccbillSetting: this.ccbillSetting,
        commissionSetting: this.commissionSetting,
        ondatoIDV: this.ondatoIDV,
        ondatoMetadata: this.ondatoMetadata
      };
    }

    if (!includePrivateInfo) {
      return publicInfo;
    }

    return {
      ...publicInfo,
      ...privateInfo
    };
  }

  getName() {
    if (this.name) return this.name;
    return this.username || [this.firstName || '', this.lastName || ''].filter((i) => !!i).join(' ');
  }

  toSearchResponse() {
    return {
      _id: this._id,
      name: this.getName(),
      avatar: FileDto.getPublicUrl(this.avatarPath),
      username: this.username,
      gender: this.gender,
      country: this.country,
      stats: this.stats,
      score: this.score,
      isPerformer: true,
      verifiedAccount: this.verifiedAccount,
      lastStreamingTime: this.lastStreamingTime,
      live: this.live,
      streamingStatus: this.streamingStatus,
      isOnline: this.isOnline,
      dateOfBirth: this.dateOfBirth,
      monthlyPrice: this.monthlyPrice,
      yearlyPrice: this.yearlyPrice,
      phone: this.phone
    };
  }

  toPublicDetailsResponse() {
    return {
      _id: this._id,
      name: this.getName(),
      avatar: FileDto.getPublicUrl(this.avatarPath),
      cover: FileDto.getPublicUrl(this.coverPath),
      username: this.username,
      status: this.status,
      gender: this.gender,
      country: this.country,
      city: this.city,
      state: this.state,
      zipcode: this.zipcode,
      address: this.address,
      languages: this.languages,
      categoryIds: this.categoryIds,
      categories: this.categories,
      height: this.height,
      weight: this.weight,
      bio: this.bio,
      eyes: this.eyes,
      hair: this.hair,
      pubicHair: this.pubicHair,
      ethnicity: this.ethnicity,
      bodyType: this.bodyType,
      dateOfBirth: this.dateOfBirth,
      butt: this.butt,
      sexualPreference: this.sexualPreference,
      monthlyPrice: this.monthlyPrice,
      yearlyPrice: this.yearlyPrice,
      stats: this.stats,
      isPerformer: true,
      score: this.score,
      balance: this.balance,
      isOnline: this.isOnline,
      welcomeVideoId: this.welcomeVideoId,
      welcomeVideoPath: FileDto.getPublicUrl(this.welcomeVideoPath),
      activateWelcomeVideo: this.activateWelcomeVideo,
      isSubscribed: this.isSubscribed,
      verifiedAccount: this.verifiedAccount,
      live: this.live,
      streamingStatus: this.streamingStatus,
      groupChatPrice: this.groupChatPrice,
      privateChatPrice: this.privateChatPrice,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      phone: this.phone
    };
  }

  public setCategories(categories: CategoryDto[]) {
    if (!categories?.length) return;
    this.categories = categories.map((cat) => cat.toResponse());
  }
}
