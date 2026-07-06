import { Module } from '@nestjs/common';
import { TareasController } from './tareas.controller';
import { TareasService } from './tareas.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [TareasController],
  providers: [TareasService, PrismaService],
})
export class TareasModule {}
