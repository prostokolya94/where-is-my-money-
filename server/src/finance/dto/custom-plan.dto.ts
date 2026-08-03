import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCustomPlanDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsNumber()
  initialBalance?: number;
}

export class UpdateCustomPlanDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsNumber()
  initialBalance?: number;
}

export class CreateCustomPlanRowDto {
  @IsDateString()
  date: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsNumber()
  overrideBefore?: number | null;

  @IsOptional()
  @IsNumber()
  overrideSnapshot?: number | null;
}

export class UpdateCustomPlanRowDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsNumber()
  overrideBefore?: number | null;

  @IsOptional()
  @IsNumber()
  overrideSnapshot?: number | null;
}
