import { IsEmail, IsString, IsUUID, MinLength } from 'class-validator';
import { z } from 'zod';

export const CreateClientUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  clienteId: z.string().uuid(),
});

export const ResetPasswordSchema = z.object({
  password: z.string().min(8),
});

export class CreateClientUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsUUID()
  clienteId!: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  password!: string;
}

export interface ClientUserResponseDto {
  id: string;
  email: string;
  isActive: boolean;
  clienteId: string;
  createdAt: string;
  updatedAt: string;
  cliente?: {
    id: string;
    nombre: string;
  };
}
