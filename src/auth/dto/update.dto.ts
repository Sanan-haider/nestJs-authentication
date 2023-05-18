import { IsOptional, IsString } from 'class-validator';

export class UpdateDto {
  @IsOptional()
  @IsString()
  readonly firstname?: string;

  @IsOptional()
  @IsString()
  readonly lastname?: string;

  @IsOptional()
  @IsString()
  readonly email?: string;

  @IsOptional()
  @IsString()
  readonly role?: string;
}
