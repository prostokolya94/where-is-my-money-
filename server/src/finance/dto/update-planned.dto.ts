import { PartialType } from '@nestjs/mapped-types';
import { CreatePlannedDto } from './planned.dto';

export class UpdatePlannedDto extends PartialType(CreatePlannedDto) {}
