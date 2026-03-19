import {languages} from './common_config';

type Impossible<K extends keyof any> = {
    // eslint-disable-next-line no-unused-vars
    [P in K]: never;
  };
export type Perfect<T, U extends T = T> = U & Impossible<Exclude<keyof U, keyof T>>;
export type StandardResponse<T> = {
    success?: boolean;
    error?: unknown;
    message?: string;
    data?: T;
};
export type HTTP_STATUS_CODE_TYPE = 'OK' | 'CREATED' | 'PROCESSING'
  | 'BAD REQUEST' | 'CONFLICT' | 'UNAUTHORIZED' | 'FORBIDDEN'
  | 'NOT FOUND' | 'UNSUPPORTED MEDIA TYPE' | 'INTERNAL SERVER ERROR'
  | 'NOT IMPLEMENTED' | 'SERVICE UNAVAILABLE';

  type Language = typeof languages[number];

