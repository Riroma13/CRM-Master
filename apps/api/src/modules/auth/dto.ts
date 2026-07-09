import { IsEmail, IsString, MinLength } from 'class-validator';
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export interface AuthResponseDto {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
  session: {
    token: string;
    expiresAt: string;
  };
}

export interface MeDto {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
  createdAt: string;
}
