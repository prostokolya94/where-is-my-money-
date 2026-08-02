import { IsDateString } from 'class-validator';

export class SwapPlannedDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}
