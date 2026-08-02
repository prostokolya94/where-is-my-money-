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
  Query,
} from '@nestjs/common';
import { Between, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreatePlannedDto } from './dto/planned.dto';
import { PlannedQueryDto } from './dto/planned-query.dto';
import { UpdatePlannedDto } from './dto/update-planned.dto';
import { PlannedEntry } from './entities/planned-entry.entity';

@Controller('api/planned')
export class PlannedController {
  constructor(
    @InjectRepository(PlannedEntry)
    private readonly repo: Repository<PlannedEntry>,
  ) {}

  @Get()
  find(@Query() q: PlannedQueryDto) {
    if (q.date) {
      return this.repo.find({ where: { date: q.date }, order: { id: 'ASC' } });
    }
    if (q.from && q.to) {
      return this.repo.find({ where: { date: Between(q.from, q.to) }, order: { date: 'ASC', id: 'ASC' } });
    }
    return this.repo.find({ order: { date: 'ASC', id: 'ASC' } });
  }

  @Post()
  create(@Body() dto: CreatePlannedDto) {
    return this.repo.save(this.repo.create(dto));
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePlannedDto) {
    const entry = await this.repo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException('Запись не найдена');
    Object.assign(entry, dto);
    return this.repo.save(entry);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.repo.delete({ id });
    return { ok: true };
  }
}
