import { IsDateString, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePlannedDto {
  @IsDateString()
  date: string;

  @IsIn(['expense', 'income'])
  type: 'expense' | 'income';

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
