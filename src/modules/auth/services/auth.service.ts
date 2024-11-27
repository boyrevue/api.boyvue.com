import {
  Injectable, Inject, forwardRef
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { UserService } from 'src/modules/user/services';
import { PerformerService } from 'src/modules/performer/services';
import { SettingService } from 'src/modules/settings';
import { StringHelper, EntityNotFoundException, getConfig } from 'src/kernel';
import { MailerService } from 'src/modules/mailer';
import { SETTING_KEYS } from 'src/modules/settings/constants';
import { InjectModel } from '@nestjs/mongoose';
import { AuthDto, ForgotDto } from '../dtos';
import { Auth } from '../schemas/auth.schema';
import { AuthPayload } from '../payloads';
import { Forgot, Verification } from '../schemas';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Auth.name) private readonly AuthModel: Model<Auth>,
    @InjectModel(Forgot.name) private readonly ForgotModel: Model<Forgot>,
    @InjectModel(Verification.name) private readonly VerificationModel: Model<Verification>,
    private readonly mailService: MailerService,
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService
  ) { }

  /**
   * generate password salt
   * @param byteSize integer
   */
  public generateSalt(byteSize = 16): string {
    return crypto.randomBytes(byteSize).toString('base64');
  }

  public encryptPassword(pw: string, salt: string): string {
    const defaultIterations = 10000;
    const defaultKeyLength = 64;

    return crypto.pbkdf2Sync(pw, salt, defaultIterations, defaultKeyLength, 'sha1').toString('base64');
  }

  public async findOne(query: any): Promise<AuthDto> {
    const data = await this.AuthModel.findOne(query);
    if (!data) return null;
    return AuthDto.fromModel(data);
  }

  public async find(query: any): Promise<AuthDto[]> {
    const data = await this.AuthModel.find(query);
    return data.map((d) => AuthDto.fromModel(d));
  }

  public async createAuthPassword(data: AuthPayload): Promise<AuthDto> {
    const salt = this.generateSalt();
    const newVal = this.encryptPassword(data.value, salt);
    // avoid admin update
    // TODO - should listen via user event?
    let auth = await this.AuthModel.findOne({
      type: 'password',
      sourceId: data.sourceId
    });
    if (!auth) {
      // eslint-disable-next-line new-cap
      auth = new this.AuthModel({
        type: 'password',
        source: data.source,
        sourceId: data.sourceId
      });
    }

    auth.salt = salt;
    auth.value = newVal;
    auth.key = data.key;

    await auth.save();
    return AuthDto.fromModel(auth);
  }

  /**
   * change user password
   * @param data
   */
  public async updateAuthPassword(data: AuthPayload) {
    const user = data.source === 'user'
      ? await this.userService.findById(data.sourceId)
      : await this.performerService.findById(data.sourceId);
    if (!user) {
      throw new EntityNotFoundException();
    }
    await this.createAuthPassword({
      source: data.source,
      sourceId: data.sourceId,
      key: user.email,
      value: data.value
    });
  }

  public async updateEmailKey(sourceId: string | ObjectId | any, email: string) {
    await this.AuthModel.updateMany({ sourceId, type: 'password' }, {
      $set: {
        key: email
      }
    });
  }

  public async findBySource(options: {
    source?: string;
    sourceId?: ObjectId;
    type?: string;
    key?: string;
  }): Promise<any> {
    return this.AuthModel.findOne(options);
  }

  public verifyPassword(pw: string, auth): boolean {
    if (!pw || !auth || !auth.salt) {
      return false;
    }
    return this.encryptPassword(pw, auth.salt) === auth.value;
  }

  public generateJWT(auth: any, options: any = {}): string {
    const newOptions = {
      // 30d, in miliseconds
      expiresIn: 60 * 60 * 24 * 7,
      ...(options || {})
    };
    return jwt.sign(
      {
        authId: auth._id,
        source: auth.source,
        sourceId: auth.sourceId
      },
      process.env.TOKEN_SECRET,
      {
        expiresIn: newOptions.expiresIn
      }
    );
  }

  public verifyJWT(token: any) {
    try {
      return jwt.verify(token, process.env.TOKEN_SECRET);
    } catch (e) {
      return false;
    }
  }

  public async getSourceFromJWT(jwtToken: any): Promise<any> {
    const decodded = this.verifyJWT(jwtToken);
    if (!decodded) {
      return null;
    }
    if (decodded.source === 'user') {
      const user = await this.userService.findById(decodded.sourceId);
      // TODO - check activated status here
      return user;
    }
    if (decodded.source === 'performer') {
      const user = await this.performerService.findById(decodded.sourceId);
      return user;
    }

    return null;
  }

  /**
   * send email reset password to user
   * @param auth
   * @param source
   * @returns
   */
  public async forgot(
    auth,
    source: {
      _id: ObjectId;
      email: string;
    }
  ) {
    const token = StringHelper.randomString(14);
    await this.ForgotModel.create({
      token,
      source: auth.source,
      sourceId: source._id,
      authId: auth._id,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const forgotLink = new URL(`auth/password-change?token=${token}`, getConfig('app').baseUrl).href;
    await this.mailService.send({
      subject: 'Recover password',
      to: source.email,
      data: {
        forgotLink
      },
      template: 'forgot'
    });
    return true;
  }

  /**
   * get forgot password
   * @param token reset password token
   * @returns
   */
  public async getForgotByToken(token: string): Promise<ForgotDto> {
    const item = await this.ForgotModel.findOne({ token });
    if (!item) return null;

    return ForgotDto.fromModel(item);
  }

  public async deleteForgotById(id: string | ObjectId | any) {
    await this.ForgotModel.deleteOne(id);
    return true;
  }

  async sendVerificationEmail({
    source,
    sourceId,
    email,
    template = 'email-verification-user'
  }: {
    email: string,
    source: string;
    sourceId: string | ObjectId | any;
    template?: string;
  }): Promise<void> {
    const verification = await this.VerificationModel.findOne({
      value: email.toLowerCase()
    });
    const token = StringHelper.randomString(15);
    if (!verification) {
      await this.VerificationModel.create({
        sourceId,
        source,
        value: email.toLowerCase(),
        token
      });
    } else {
      await this.VerificationModel.updateOne({ _id: verification._id }, {
        $set: {
          token
        }
      });
    }
    const verificationLink = new URL(`auth/email-verification?token=${token}`, getConfig('app').baseUrl).href;
    const siteName = await SettingService.getValueByKey(SETTING_KEYS.SITE_NAME) || process.env.DOMAIN;
    await this.mailService.send({
      to: email.toLowerCase(),
      subject: 'Verify your email address',
      data: {
        source,
        verificationLink,
        siteName
      },
      template
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const verification = await this.VerificationModel.findOne({ token });
    if (!verification) {
      throw new EntityNotFoundException();
    }
    if (verification.source === 'user') await this.userService.updateVerificationStatus(verification.sourceId);
    else if (verification.source === 'performer') await this.performerService.updateVerificationStatus(verification.sourceId);
    verification.verified = true;

    await verification.save();
  }
}
