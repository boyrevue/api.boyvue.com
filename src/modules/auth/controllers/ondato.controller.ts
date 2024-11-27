/**
 * Document: https://ondato.atlassian.net/wiki/spaces/PUB/pages/2295726818/Customer+onboarding+KYC+integration+with+UI
 * Authentication doc: https://ondato.atlassian.net/wiki/spaces/PUB/pages/2320990304/Authentication
 * Webhook: https://ondato.atlassian.net/wiki/spaces/PUB/pages/2296184995/Webhooks
 * Workflow:
 * 1. Create account to get access Token, callback url, success url, failure url, decline url,...
 * 2. Create Identity Verification (IDV)
 * 3. Generate IDV URL and redirect User to Ondato form
 * 4. Run callbackUrl to update related data by response from Ondato
 */

import {
  Post,
  UsePipes,
  ValidationPipe,
  Body,
  HttpCode,
  HttpStatus,
  Controller,
  forwardRef,
  Inject,
  UseGuards,
  Get,
  Param
} from '@nestjs/common';
import { DataResponse } from 'src/kernel';
import { Roles } from 'src/modules/auth';
import { OndatoGuard, RoleGuard } from 'src/modules/auth/guards';
import { OndatoService } from '../services/ondato.service';
import { OndatoCreationPayload } from '../payloads/ondato.payload';

@Controller('ondato')
export class OndatoController {
  constructor(
    @Inject(forwardRef(() => OndatoService))
    private readonly ondatoService: OndatoService
  ) {}

  @Post('generate-idv')
  @HttpCode(HttpStatus.OK)
  async generateIDVUrl(
    @Body() payload: OndatoCreationPayload
  ): Promise<DataResponse<any>> {
    const response = await this.ondatoService.generateIDVUrl(payload);
    return DataResponse.ok(response);
  }

  @Get('idv/:modelId')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async loadIDV(
    @Param('modelId') modelId: string
  ): Promise<DataResponse<any>> {
    const response = await this.ondatoService.loadIDV(modelId);
    return DataResponse.ok(response);
  }

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OndatoGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async callback(
    @Body() payload: any // todo - should add interface
  ): Promise<DataResponse<any>> {
    const response = await this.ondatoService.callback(payload);
    return DataResponse.ok(response);
  }
}
