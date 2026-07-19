import { SetMetadata } from '@nestjs/common';

export const IS_CLIENT_KEY = 'isClient';
export const Client = () => SetMetadata(IS_CLIENT_KEY, true);
