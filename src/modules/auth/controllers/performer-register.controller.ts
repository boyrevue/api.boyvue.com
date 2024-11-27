import {
  Post,
  HttpCode,
  HttpStatus,
  Body,
  Controller,
  UseInterceptors,
  HttpException,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { DataResponse, getConfig } from 'src/kernel';
import { MailerService } from 'src/modules/mailer/services';
import { MultiFileUploadInterceptor, FilesUploaded, FileDto } from 'src/modules/file';
import { FileService } from 'src/modules/file/services';
import { PerformerService } from 'src/modules/performer/services';
import { PERFORMER_STATUSES } from 'src/modules/performer/constants';
import { SETTING_KEYS } from 'src/modules/settings/constants';
import { SettingService } from 'src/modules/settings';
import { pick } from 'lodash';
import { PerformerRegisterPayload } from '../payloads';
import { AuthService } from '../services';
import { OndatoService } from '../services/ondato.service';

@Controller('auth/performers')
export class PerformerRegisterController {
  constructor(
    private readonly performerService: PerformerService,
    private readonly authService: AuthService,
    private readonly fileService: FileService,
    private readonly mailService: MailerService,
    private readonly ondatoService: OndatoService
  ) { }

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    // TODO - check and support multiple files!!!
    MultiFileUploadInterceptor(
      [
        {
          type: 'performer-document',
          fieldName: 'idVerification',
          options: {
            destination: getConfig('file').documentDir
          }
        },
        {
          type: 'performer-document',
          fieldName: 'documentVerification',
          options: {
            destination: getConfig('file').documentDir
          }
        }
      ],
      {}
    )
  )
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true
  }))
  async performerRegister(
    @Body() payload: PerformerRegisterPayload,
    @FilesUploaded() files: Record<string, FileDto>
  ): Promise<DataResponse<{ message: string }>> {
    try {
      if (!files.idVerification || !files.documentVerification) {
        throw new HttpException('Missing document!', 400);
      }

      // TODO - define key for performer separately
      const requireEmailVerification = SettingService.getValueByKey(
        SETTING_KEYS.REQUIRE_EMAIL_VERIFICATION_PERFORMER
      );
      const performer = await this.performerService.register({
        ...payload,
        avatarId: null,
        status: PERFORMER_STATUSES.PENDING,
        idVerificationId: files.idVerification._id,
        documentVerificationId: files.documentVerification._id
      } as any);

      // create auth, email notification, etc...
      if (payload.password) {
        await this.authService.createAuthPassword({
          source: 'performer',
          sourceId: performer._id,
          type: 'password',
          key: performer.email,
          value: payload.password
        });
      }

      // notify to verify email address
      if (performer.email) {
        const {
          email, name, username
        } = performer;
        await this.authService.sendVerificationEmail({
          source: 'performer',
          sourceId: performer._id,
          email,
          template: 'email-verification-performer'
        });

        const sendInstruction = SettingService.getValueByKey(
          SETTING_KEYS.SEND_MODEL_ONBOARD_INSTRUCTION
        );
        if (sendInstruction) {
          await this.mailService.send({
            subject: 'Model Onboarding Instructions',
            to: email,
            data: {
              name: name || username
            },
            template: 'model-onboard-instructions'
          });
        }
      }

      const ondatoEnabled = SettingService.getValueByKey(
        SETTING_KEYS.ONDATO_ENABLED
      );

      let response = null;

      const ondatoBody = {
        registration: pick(performer, ['email']),
        externalReferenceId: performer?._id?.toString()
      };
      if (ondatoEnabled) {
        response = await this.ondatoService.generateIDVUrl(ondatoBody);
      }

      return DataResponse.ok({
        data: response,
        message: requireEmailVerification ? 'Please verify your account using the verification email sent to you.' : 'Your account is active, please login !'
      });
    } catch (e) {
      files.idVerification && await this.fileService.remove(files.idVerification._id);
      files.documentVerification && await this.fileService.remove(files.documentVerification._id);

      throw e;
    }
  }
}
