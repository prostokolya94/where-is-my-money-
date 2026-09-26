import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CreateTodoSectionDto, ReorderTodoSectionsDto, UpdateTodoSectionDto } from './dto/todo-section.dto';
import { TodoSectionsService } from './todo-sections.service';

@Controller('api/todo-sections')
export class TodoSectionsController {
  constructor(private readonly service: TodoSectionsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateTodoSectionDto) {
    return this.service.create(dto);
  }

  @Patch('reorder')
  reorder(@Body() dto: ReorderTodoSectionsDto) {
    return this.service.reorder(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTodoSectionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Query('items') items?: string) {
    return this.service.remove(id, items === 'delete' ? 'delete' : 'unassign');
  }
}
