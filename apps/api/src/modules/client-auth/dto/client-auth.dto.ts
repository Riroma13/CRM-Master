import { IsEmail, IsString, MinLength } from 'class-validator';
import { z } from 'zod';

export const ClientLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export class ClientLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export interface ClientAuthResponseDto {
  clientUser: {
    id: string;
    email: string;
    isActive: boolean;
    clienteId: string;
    createdAt: string;
    updatedAt: string;
  };
  cliente: {
    id: string;
    tenantId: string;
    nombre: string;
  };
}

export interface ClientMeDto {
  clientUser: {
    id: string;
    email: string;
    isActive: boolean;
    clienteId: string;
    createdAt: string;
    updatedAt: string;
  };
  cliente: {
    id: string;
    tenantId: string;
    nombre: string;
  };
}
