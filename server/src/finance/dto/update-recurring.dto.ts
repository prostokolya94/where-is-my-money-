import { PartialType } from '@nestjs/mapped-types';
import { CreateRecurringDto } from './recurring.dto';

export class UpdateRecurringDto extends PartialType(CreateRecurringDto) {}
