/* eslint-disable camelcase */
import {
  Injectable, Inject, forwardRef, HttpException
} from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { toObjectId } from 'src/kernel/helpers/string.helper';
import { SETTING_KEYS } from 'src/modules/settings/constants';
import { PerformerService } from 'src/modules/performer/services';
import axios from 'axios';
import { SettingService } from 'src/modules/settings';
import { stringify } from 'qs';
import { EntityNotFoundException } from 'src/kernel';
import { PROD_API, SANDBOX_API } from '../constants/ondato';
import { OndatoCreationPayload } from '../payloads/ondato.payload';

@Injectable()
export class OndatoService {
  constructor(
    @Inject(forwardRef(() => PerformerService))
    private readonly performerService: PerformerService,
    @Inject(forwardRef(() => SettingService))
    private readonly settingService: SettingService
  ) { }

  public async getAccessToken(
    requestUrl: string,
    client_id: string,
    client_secret: string,
    scope?: string,
    grant_type: string = 'client_credentials'
  ) {
    try {
      const { data } = await axios.post(
        requestUrl,
        stringify({
          grant_type,
          client_id,
          client_secret,
          scope
        }),
        {
          headers: {
            Content_Type: 'application/x-www-form-urlencoded'
          }
        }
      );
      if (!data?.access_token) {
        throw new HttpException('Can not get Ondato access token!', 500);
      }
      return `${data?.token_type || 'Bearer'} ${data?.access_token}`;
    } catch (e) {
      throw new HttpException('Can not get Ondato access token!', 500);
    }
  }

  public async generateIDVUrl(payload: OndatoCreationPayload) {
    const [
      mode,
      version,
      setupId,
      client_id,
      client_secret
    ] = await Promise.all([
      this.settingService.getKeyValue(SETTING_KEYS.ONDATO_MODE) || 'sandbox',
      this.settingService.getKeyValue(SETTING_KEYS.ONDATO_VERSION) || 'v1',
      this.settingService.getKeyValue(SETTING_KEYS.ONDATO_SETUP_ID),
      this.settingService.getKeyValue(SETTING_KEYS.ONDATO_CLIENT_ID),
      this.settingService.getKeyValue(SETTING_KEYS.ONDATO_CLIENT_SECRET)
    ]);

    if (!setupId || !client_id || !client_secret) {
      throw new HttpException('Missing Ondato setup!', 400);
    }

    // check api mode
    const ondatoAPI = mode === 'live' ? PROD_API : SANDBOX_API;
    const Authorization = await this.getAccessToken(
      ondatoAPI.GET_ACCESS_TOKEN,
      client_id,
      client_secret,
      'idv_api'
    );

    const body = { ...payload, setupId };
    return new Promise((resolver, reject) => {
      axios
        .post(`${ondatoAPI.MAIN}/${version}/identity-verifications`, body, {
          headers: { Authorization }
        })
        .then(async (response) => {
          const { data } = response;
          await this.performerService.updateOne(
            { id: toObjectId(payload.externalReferenceId) },
            {
              ondatoIDV: data?.id
            }
          );
          resolver({
            url: `${ondatoAPI.KYC_FORM}${data?.id}`
          });
        })
        .catch((e) => {
          console.log(e);
          reject(e);
        });
    });
  }

  // https://ondato.atlassian.net/wiki/spaces/PUB/pages/2296184995/Webhooks
  // https://ondato.atlassian.net/wiki/spaces/PUB/pages/2411331613/Webhooks+examples
  //  | payload {
  //  |   id: 'f1997509-050a-46c4-8358-59aab54825f2',
  //  |   applicationId: '3bd79b24-c2e5-4854-a12c-f646d8c4ab86',
  //  |   createdUtc: '2023-04-04T08:01:46.2425824Z',
  //  |   payload: {
  //  |     id: '10b91aa1-1610-496a-8734-74466b03fd06',
  //  |     applicationId: '3bd79b24-c2e5-4854-a12c-f646d8c4ab86',
  //  |     createdUtc: '2023-04-04T07:59:23.222Z',
  //  |     setup: {
  //  |       id: 'ad0e8183-adb8-4f0a-9910-11b3c44029af',
  //  |       versionId: 'f7097925-6d1d-4293-9daa-49f249085f14'
  //  |     },
  //  |     identityVerificationId: 'da06ab1f-05a1-408b-b7f8-da68760b4217',
  //  |     status: 'Rejected',
  //  |     statusReason: 'PoorPhotoQuality',
  //  |     isCrossChecked: true,
  //  |     document: {
  //  |       type: 'IdCard',
  //  |       mrzVerified: false,
  //  |       files: [Array],
  //  |       ocrValidations: [Array]
  //  |     },
  //  |     face: {
  //  |       enrollmentId: '3d7b180f-61c7-4fa1-b537-4dfe9be2ff92',
  //  |       ageEstimation: 'Age30AndOver',
  //  |       files: [Array]
  //  |     },
  //  |     rules: [
  //  |       [Object], [Object],
  //  |       [Object], [Object],
  //  |       [Object], [Object],
  //  |       [Object], [Object],
  //  |       [Object]
  //  |     ],
  //  |     registries: [],
  //  |     fraudChecks: [ [Object] ],
  //  |     scores: [ [Object] ],
  //  |     completedUtc: '2023-04-04T08:00:59Z'
  //  |   },
  //  |   type: 'KycIdentification.Rejected'
  //  | }
  public async callback(data: any) {
    try {
      const { payload, type } = data;
      if (!payload || !type || !type.includes('KycIdentification')) { return false; }

      await this.performerService.updateOne(
        {
          ondatoIDV: payload?.identityVerificationId
        },
        {
          $set: {
            ondatoMetadata: data
          }
        }
      );
      if (type.includes('Approved')) {
        // Document is verified, then update performer data
        const performer = await this.performerService.findOne({
          ondatoIDV: payload?.identityVerificationId
        });
        if (!performer || !performer._id) {
          return false;
        }
        performer.verifiedDocument = true;
        // const bankingInformation = await this.performerService.getBankingSettings(
        //   performer._id
        // );
        // performer.completedAccount = !!(bankingInformation?._id);
        // await performer.save();
        return true;
      }
      return false;
    } catch (error) {
      throw new HttpException(error, 400);
    }
  }

  // eslint-disable-next-line consistent-return
  public async loadIDV(performerId: string | ObjectId) {
    const performer = await this.performerService.findById(performerId);
    if (!performer) {
      throw new EntityNotFoundException();
    }
    if (!performer?.ondatoIDV && !performer?.ondatoMetadata?.payload?.identityVerificationId) {
      performer.verifiedDocument = false;
      // performer.completedAccount = false;
      // await performer.save();
      return performer;
      // throw new HttpException('Ondato IDV is not found!', 400);
    }
    const [
      mode,
      version,
      client_id,
      client_secret
    ] = await Promise.all([
      this.settingService.getKeyValue(SETTING_KEYS.ONDATO_MODE) || 'sandbox',
      this.settingService.getKeyValue(SETTING_KEYS.ONDATO_VERSION) || 'v1',
      this.settingService.getKeyValue(SETTING_KEYS.ONDATO_CLIENT_ID),
      this.settingService.getKeyValue(SETTING_KEYS.ONDATO_CLIENT_SECRET)
    ]);

    // check api mode
    const ondatoAPI = mode === 'live' ? PROD_API : SANDBOX_API;
    const IDV = performer?.ondatoIDV || performer?.ondatoMetadata?.payload?.identityVerificationId;

    const AuthorizationIdv = await this.getAccessToken(
      ondatoAPI.GET_ACCESS_TOKEN,
      client_id,
      client_secret,
      'idv_api'
    );

    const AuthorizationKyc = await this.getAccessToken(
      ondatoAPI.GET_ACCESS_TOKEN,
      client_id,
      client_secret,
      'kyc_identifications_api'
    );

    const getDetailKycData = async (data) => {
      try {
        const KYC_ID = data?.step?.kycIdentification?.id || null;
        if (KYC_ID) {
          // todo - get KYC detail
          const kycData = await axios.get(`${ondatoAPI.KYC_API}/${version}/identifications/${KYC_ID}`, {
            headers: { Authorization: AuthorizationKyc }
          });
          /** KYC DATA
          kycData.data: {
            id: '00326305-3df6-4878-8e36-aa87787ae75d',
            applicationId: '3bd79b24-c2e5-4854-a12c-f646d8c4ab86',
            createdUtc: '2023-02-10T21:40:02.711Z',
            setup: {
              id: 'ad0e8183-adb8-4f0a-9910-11b3c44029af',
              versionId: 'd0f64457-9398-42ce-bb72-937d1ad29376'
            },
            identityVerificationId: '2fe552af-0889-463c-93c0-6e3bc0a19669',    status: 'Approved',
            statusReason: 'ManuallyIdentified',
            isCrossChecked: true,
            document: {
              fullName: 'HOLLY MAE BROWN',
              firstName: 'HOLLY MAE',
              lastName: 'BROWN',
              documentNumber: 'BROWN961136HM9JV20',
              dateOfIssue: '2015-03-25',
              dateOfExpiration: '2025-03-24',
              dateOfBirth: '1996-11-13',
              countryIso3: 'GBR',
              type: 'DriverLicense',
              mrzVerified: true,
              category: 'AM/A/B/f/k/q',
              files: [Array],
              ocrValidations: [Array]
            },
            face: {
              enrollmentId: '55518d02-4793-4877-8cc8-4a33adffb47c',
              ageEstimation: 'Age22AndOver',
              files: [Array]
            },
            rules: [
              [Object], [Object],
              [Object], [Object],
              [Object], [Object],
              [Object], [Object],
              [Object]
            ],
            registries: [],
            fraudChecks: [],
            scores: [ [Object] ],
            completedUtc: '2023-02-10T21:41:43Z'
          }
         */
          // Document is verified, then update performer data
          performer.verifiedDocument = kycData?.data?.status === 'Approved';
          performer.ondatoMetadata = kycData?.data; // overwrite no luon
          // const bankingInformation = await this.performerService.getBankingSettings(performerId);
          // performer.completedAccount = !!(bankingInformation?._id && kycData.data?.status === 'Approved');
        } else {
          performer.verifiedDocument = false;
          // performer.completedAccount = false;
        }
        // await performer.save();
        return performer;
      } catch (error) {
        throw new HttpException('error', 400);
      }
    };

    try {
      const { data } = await axios.get(`${ondatoAPI.MAIN}/${version}/identity-verifications/${IDV}`, {
        headers: { Authorization: AuthorizationIdv }
      });
      // todo - get KYC ID from data
      getDetailKycData(data);
    } catch (error) {
      throw new HttpException(error, 400);
    }
  }
}
