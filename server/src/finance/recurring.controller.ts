import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRecurringDto } from './dto/recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';
import { RecurringRule } from './entities/recurring-rule.entity';

@Controller('api/recurring')
export class RecurringController {
  constructor(
    @InjectRepository(RecurringRule)
    private readonly repo: Repository<RecurringRule>,
  ) {}

  @Get()
  findAll() {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  @Post()
  create(@Body() dto: CreateRecurringDto) {
    return this.repo.save(this.repo.create(dto));
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRecurringDto) {
    const rule = await this.repo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Правило не найдено');
    Object.assign(rule, dto);
    return this.repo.save(rule);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.repo.delete({ id });
    return { ok: true };
  }
}
