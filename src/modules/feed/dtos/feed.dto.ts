import { ObjectId } from 'mongodb';
import { PerformerDto } from 'src/modules/performer/dtos';
import { Expose, Transform, plainToInstance } from 'class-transformer';
import { FileDto } from 'src/modules/file';
import { PollDto } from './poll.dto';

export class FeedDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId | string;

  @Expose()
  type: string;

  @Expose()
  @Transform(({ obj }) => obj.fromSourceId)
  fromSourceId: ObjectId | string;

  @Expose()
  fromSource: string;

  @Expose()
  @Transform(({ obj }) => obj.performerId || obj.fromSourceId)
  performerId: string | ObjectId;

  @Expose()
  title: string;

  @Expose()
  text: string;

  @Expose()
  @Transform(({ obj }) => obj.fileIds)
  fileIds: Array<string | ObjectId>;

  @Expose()
  @Transform(({ obj }) => obj.pollIds)
  pollIds: Array<string | ObjectId>;

  @Expose()
  pollExpiredAt: Date;

  @Expose()
  totalLike: number;

  @Expose()
  totalComment: number;

  @Expose()
  totalTips: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  isLiked: boolean;

  @Expose()
  isSubscribed: boolean;

  @Expose()
  isBought: boolean;

  performer: Partial<PerformerDto>;

  @Expose()
  files: Array<Partial<FileDto | Record<string, any>>>;

  polls: Partial<PollDto>[];

  @Expose()
  isSale: boolean;

  @Expose()
  price: number;

  @Expose()
  isBookMarked: boolean;

  @Expose()
  orientation: string;

  @Expose()
  @Transform(({ obj }) => obj.teaserId)
  teaserId: ObjectId;

  @Expose()
  teaser: Record<string, any>;

  @Expose()
  @Transform(({ obj }) => obj.thumbnailId)
  thumbnailId: ObjectId;

  @Expose()
  thumbnailUrl: string;

  @Expose()
  tagline: string;

  @Expose()
  isPinned: boolean;

  @Expose()
  pinnedAt: Date;

  @Expose()
  status: string;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(FeedDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  setFiles(files: FileDto[], options?: Record<string, any>) {
    if (!files?.length) return;

    const { token = '' } = options || {};

    this.files = files.map((file) => {
      let fileUrl = null;
      const canView = (this.isSale && this.isBought) || (!this.isSale && this.isSubscribed);
      if (canView) {
        fileUrl = file.getUrl();
      }
      if (canView && token) {
        const urlParser = new URL(fileUrl);
        urlParser.searchParams.append('feedId', this._id.toString());
        urlParser.searchParams.append('token', token);
        fileUrl = urlParser.href;
      }
      return {
        ...file.toPublicResponse(),
        thumbnails: (file.thumbnails || []).map((thumb) => FileDto.getPublicUrl(thumb.path)),
        url: fileUrl,
        preview: file.getBlurImage()
      };
    });
  }

  setIsLiked(value: boolean) {
    this.isLiked = value;
  }

  setIsBought(value: boolean) {
    this.isBought = value;
  }

  setIsBookmarked(value: boolean) {
    this.isBookMarked = value;
  }

  setIsSubscribed(value: boolean) {
    this.isSubscribed = value;
  }

  setThumbnail(thumbnail: FileDto) {
    if (!thumbnail) return;
    // TODO - check me
    this.thumbnailUrl = thumbnail.getUrl();
  }

  setTeaser(teaser: FileDto) {
    if (!teaser) return;
    this.teaser = teaser.toPublicResponse();
  }

  setPerformer(performer: PerformerDto) {
    if (!performer) return;
    this.performer = performer.toPublicDetailsResponse();
  }

  public setPolls(polls: PollDto[] | any[]) {
    const dtos = polls.map((p) => plainToInstance(PollDto, p));
    const feedPollStringIds = (this.pollIds || []).map((pollId) => pollId.toString());
    this.polls = dtos.filter((p) => feedPollStringIds.includes(p._id.toString()))
      .map((p) => p.toPublicList());
  }
}
