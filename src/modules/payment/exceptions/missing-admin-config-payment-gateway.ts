import { HttpException } from '@nestjs/common';
import { MISSING_ADMIN_CONFIG_PAYMENT_GATEWAY } from '../constants';

export class MissingAdminConfigPaymentException extends HttpException {
  constructor() {
    super(MISSING_ADMIN_CONFIG_PAYMENT_GATEWAY, 400);
  }
}
