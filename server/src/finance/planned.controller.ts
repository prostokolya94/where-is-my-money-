import {
  BadRequestException,
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
import { SwapPlannedDto } from './dto/swap-planned.dto';
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

  /** Обмен всех разовых планов между двумя днями. Повторяющиеся правила не затрагиваются. */
  @Post('swap')
  async swap(@Body() dto: SwapPlannedDto) {
    if (dto.from === dto.to) {
      throw new BadRequestException('Даты должны различаться');
    }
    const fromEntries = await this.repo.find({ where: { date: dto.from } });
    const toEntries = await this.repo.find({ where: { date: dto.to } });
    for (const e of fromEntries) e.date = dto.to;
    for (const e of toEntries) e.date = dto.from;
    await this.repo.save([...fromEntries, ...toEntries]);
    return { ok: true };
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
