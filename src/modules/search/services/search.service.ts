import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { STATUS } from 'src/kernel/constants';
import { PerformerBlockService } from 'src/modules/block/services';
import { PerformerService } from 'src/modules/performer/services';
import { GalleryService, ProductService, VideoService } from 'src/modules/performer-assets/services';
import { SearchPayload } from '../payloads';

@Injectable()
export class SearchService {
  constructor(
    @Inject(forwardRef(() => PerformerBlockService))
    private readonly performerBlockService: PerformerBlockService,
    private readonly performerService: PerformerService,
    private readonly videoService: VideoService,
    private readonly galleryService: GalleryService,
    private readonly productService: ProductService
  ) { }

  public async countTotal(req: SearchPayload, countryCode: string): Promise<any> {
    const query: Record<string, any> = {
      status: STATUS.ACTIVE
    };
    if (req.q) {
      const searchValue = { $regex: new RegExp(req.q.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, ''), 'i') };
      query.$or = [
        { name: searchValue },
        { username: searchValue },
        { title: searchValue },
        { tags: { $elemMatch: searchValue } }
      ];
    }
    if (countryCode) {
      const blockCountries = await this.performerBlockService.findBlockCountriesByQuery({ countryCodes: { $in: [countryCode] } });
      const performerIds = blockCountries.map((b) => b.sourceId);
      if (performerIds.length > 0) {
        query._id = { $nin: performerIds };
      }
    }
    const [totalPerformers, totalVideos, totalGalleries, totalProducts] = await Promise.all([
      this.performerService.countByQuery(query),
      this.videoService.countByQuery(query),
      this.galleryService.countByQuery(query),
      this.productService.countByQuery(query)
    ]);

    return {
      totalPerformers, totalVideos, totalGalleries, totalProducts
    };
  }
}
