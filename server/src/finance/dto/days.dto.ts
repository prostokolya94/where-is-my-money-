import { IsDateString, IsNumber } from 'class-validator';

export class DayRangeQueryDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}

export class SetBalanceDto {
  @IsNumber({ allowNaN: false, allowInfinity: false })
  amount: number;
}
