import { z } from 'zod';
import { ClientUserResponse, MeResponse } from './schemas';

export type ClientUserResponseType = z.infer<typeof ClientUserResponse>;
export type MeResponseType = z.infer<typeof MeResponse>;
