import { ObjectId } from 'mongodb';
import { Expose, Transform, plainToInstance } from 'class-transformer';
import { PerformerDto } from 'src/modules/performer/dtos';
import { FileDto } from 'src/modules/file';
import { CategoryDto } from 'src/modules/category/dtos';

export class VideoDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.performerId)
  performerId: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.fileId)
  fileId: ObjectId;

  @Expose()
  type: string;

  @Expose()
  title: string;

  @Expose()
  slug: string;

  @Expose()
  description: string;

  @Expose()
  status: string;

  @Expose()
  tags: string[];

  @Expose()
  processing: boolean;

  @Expose()
  @Transform(({ obj }) => obj.thumbnailId)
  thumbnailId: ObjectId;

  @Expose()
  thumbnail: Record<string, any>;

  @Expose()
  isSaleVideo: boolean;

  @Expose()
  price: number;

  @Expose()
  @Transform(({ obj }) => obj.teaserId)
  teaserId: ObjectId;

  @Expose()
  teaser: any;

  @Expose()
  teaserProcessing: boolean;

  @Expose()
  video: Record<string, any>;

  @Expose()
  performer: Partial<PerformerDto>;

  @Expose()
  stats: {
    views: number;
    likes: number;
    comments: number;
    favourites: number;
    wishlists: number;
  };

  @Expose()
  categories: Array<Partial<CategoryDto>>;

  @Expose()
  @Transform(({ obj }) => obj.createdBy)
  createdBy: ObjectId;

  @Expose()
  @Transform(({ obj }) => obj.updatedBy)
  updatedBy: ObjectId;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  @Transform(({ obj }) => obj.participantIds)
  participantIds: string[];

  @Expose()
  participants: Partial<PerformerDto>[];

  @Expose()
  tagline: string;

  @Expose()
  isSubscribed: boolean;

  @Expose()
  isBought: boolean;

  @Expose()
  isLiked: boolean;

  @Expose()
  isFavourited: boolean;

  @Expose()
  isWishlist: boolean;

  public static fromModel(model) {
    if (!model) return null;

    return plainToInstance(VideoDto, typeof model.toObject === 'function' ? model.toObject() : model);
  }

  public setPerformer(performer: PerformerDto) {
    if (!performer) return;
    this.performer = performer.toSearchResponse();
  }

  public setThumbnail(thumbnail: FileDto) {
    if (!thumbnail) return;

    this.thumbnail = {
      url: thumbnail.getUrl(),
      blurImage: thumbnail.getBlurImage(),
      thumbnails: thumbnail.getThumbnails()
    };
  }

  public setVideo(video: FileDto) {
    if (!video) return;

    this.video = {
      url: video.getUrl(),
      thumbnails: video.getThumbnails(),
      blurImage: video.getBlurImage(),
      duration: video.duration
    };
  }

  public setCategories(categories: Array<CategoryDto>) {
    if (!categories) return;
    this.categories = categories.map((c) => c.toResponse());
  }
}
