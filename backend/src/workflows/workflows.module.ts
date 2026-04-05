import { Module } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { WorkflowEngineController } from './workflow-engine.controller';
import { WorkflowsService } from './workflows.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WorkflowsController, WorkflowEngineController],
  providers: [WorkflowsService, WorkflowEngineService],
  exports: [WorkflowsService, WorkflowEngineService],
})
export class WorkflowsModule {}
