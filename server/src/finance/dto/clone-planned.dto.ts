import { IsDateString } from 'class-validator';

export class ClonePlannedDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}