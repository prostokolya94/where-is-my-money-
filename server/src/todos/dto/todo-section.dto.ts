import { PartialType } from '@nestjs/mapped-types';
import { IsArray, IsInt, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export class CreateTodoSectionDto {
  @IsString()
  @MaxLength(60)
  name: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR)
  color?: string;
}

export class UpdateTodoSectionDto extends PartialType(CreateTodoSectionDto) {}

export class ReorderTodoSectionsDto {
  @IsArray()
  @IsInt({ each: true })
  ids: number[];
}
