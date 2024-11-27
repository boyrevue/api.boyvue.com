import { ApiProperty } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsObject
} from 'class-validator';

export class OndatoCreationPayload {
//   {
//   "registration": {
//     "email": "John@email.com",
//     "firstName": "John",
//     "middleName": "Adam",
//     "lastName": "Johnson",
//     "personalCode": "1214148111000",
//     "phoneNumber": 370624515141,
//     "dateOfBirth": "2021-01-14"
//   },
//   "externalReferenceId": "123",
//   "setupId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
//   }
  @ApiProperty()
  @IsObject()
  @IsNotEmpty()
  registration: any;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  externalReferenceId: string;
}
export class OndatoCallbackPayload {
  // "Id": "45a51829-965c-49ac-8fbb-940aa3d8486f",
  // "ApplicationId": "d73da14e-a6b9-4bb1-b9df-f3b40ba1ed34",
  // "CreatedUtc": "2022-07-26T07:16:41.873Z",
  // "Payload": {
  //   "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  //   "applicationId": "d73da14e-a6b9-4bb1-b9df-f3b40ba1ed34",
  //   "setup": {
  //     "id": "56d0b462-6f88-4725-9a7a-578c58acd85a",
  //     "versionId": "5c45f048-70f5-4f11-a623-b001087b78ac"
  //   },
  //   "createdUtc": "2022-07-26T07:16:40.873Z",
  //   "identityVerificationId": "9eae922a-00af-4e54-830b-ca6f7fe5af16",
  //   "status": "Unfinished"
  // },
  // "Type": "Form.Created"
}
