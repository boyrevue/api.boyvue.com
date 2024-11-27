import {
  Injectable, CanActivate, ExecutionContext
} from '@nestjs/common';
import { ONDATO_AUTHORIZATION } from '../constants/ondato';

@Injectable()
export class OndatoGuard implements CanActivate {
  constructor() { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization || request.query.Authorization;

    if (!token) return false;

    const decodded = Buffer.from(token.split(' ')[1], 'base64').toString();
    if (!decodded) {
      return false;
    }
    const auth = decodded.split(':');

    if (auth && auth[0] === ONDATO_AUTHORIZATION.USERNAME && auth[1] === ONDATO_AUTHORIZATION.PASSWORD) {
      return true;
    }

    return false;
  }
}
