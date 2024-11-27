import * as sharp from 'sharp';

export class ImageService {
  public async createThumbnail(filePath: string, options?: {
    width?: number;
    height?: number;
    toPath?: string;
  }) {
    // eslint-disable-next-line no-param-reassign
    options = options || {
      width: 200, // TODO - from config
      height: null
    };

    if (options.toPath) {
      return sharp(filePath)
        .resize(options.width, options.height)
        .rotate()
        .toFile(options.toPath);
    }

    return sharp(filePath)
      .resize(options.width, options.height)
      .rotate()
      .toBuffer();
  }

  public async getMetaData(filePath: string) {
    return sharp(filePath).metadata();
  }

  public async replaceWithoutExif(filePath: string) {
    return sharp(filePath)
      .rotate()
      .toBuffer();
  }

  public async blur(input: string | Buffer, options = {
    sigma: 6, // a value between 0.3 and 1000 representing the sigma of the Gaussian mask, where sigma = 1 + radius / 2
    width: 100,
    height: 100
  }) {
    let { sigma = 10 } = options;
    const { width = 100, height = 100 } = options;
    if (sigma < 0.3 || sigma > 1000) sigma = 10;

    return sharp(input)
      .resize(width, height)
      .blur(sigma)
      .jpeg({ force: true, quality: 50 })
      .toBuffer();
  }
}
