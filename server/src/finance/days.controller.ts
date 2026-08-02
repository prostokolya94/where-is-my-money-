import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { ParseIntPipe } from '@nestjs/common';
import { BalanceService } from './balance.service';
import { DayRangeQueryDto, SetBalanceDto } from './dto/days.dto';
import { ParseDatePipe } from './parse-date.pipe';

@Controller('api/days')
export class DaysController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get()
  getRange(@Query() q: DayRangeQueryDto) {
    if (q.from > q.to) {
      throw new BadRequestException('from должен быть не позже to');
    }
    return this.balanceService.computeRange(q.from, q.to).then((days) => ({ days }));
  }

  @Get(':date')
  getDay(@Param('date', ParseDatePipe) date: string) {
    return this.balanceService.getDayDetail(date);
  }

  @Put(':date')
  setBalance(@Param('date', ParseDatePipe) date: string, @Body() body: SetBalanceDto) {
    return this.balanceService.setBalance(date, body.amount);
  }

  @Delete(':date')
  async deleteBalance(@Param('date', ParseDatePipe) date: string) {
    await this.balanceService.deleteBalance(date);
    return { ok: true };
  }
}
