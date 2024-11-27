import { Socket } from 'socket.io';

interface ExtendedSocket extends Socket {
  authUser: {
    source: string;
    sourceId: string | any;
    authId: string | any;
  }
}
