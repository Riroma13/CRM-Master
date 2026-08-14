import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class TenantSettingsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  logo?: string | null;
}
