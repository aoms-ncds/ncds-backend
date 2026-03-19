import {Response} from 'express';
import {HTTP_STATUS_CODE_TYPE, Perfect, StandardResponse} from './common_types';
export const sendStandardResponse = <T>(res: Response, httpStatusText: HTTP_STATUS_CODE_TYPE, body: Perfect<StandardResponse<T>>) => res.status(HTTP[httpStatusText]).json(body);

const HTTP = {
  'OK': 200,
  'CREATED': 201,
  'PROCESSING': 202,
  'BAD REQUEST': 400,
  'UNAUTHORIZED': 401,
  'FORBIDDEN': 403,
  'NOT FOUND': 404,
  'CONFLICT': 409,
  'UNSUPPORTED MEDIA TYPE': 415,
  'INTERNAL SERVER ERROR': 500,
  'NOT IMPLEMENTED': 501,
  'SERVICE UNAVAILABLE': 503,
};

export const sendMail = () => {
  //
};
