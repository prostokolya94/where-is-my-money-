import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TodoSection } from './entities/todo-section.entity';
import { TodoItem } from './entities/todo.entity';
import { TodoSectionsController } from './todo-sections.controller';
import { TodoSectionsService } from './todo-sections.service';
import { TodosController } from './todos.controller';
import { TodosService } from './todos.service';

@Module({
  imports: [TypeOrmModule.forFeature([TodoItem, TodoSection])],
  controllers: [TodosController, TodoSectionsController],
  providers: [TodosService, TodoSectionsService],
})
export class TodosModule {}
