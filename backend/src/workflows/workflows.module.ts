import { Module } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { WorkflowInstancesController } from './workflows.controller';
import { WorkflowEngineController } from './workflow-engine.controller';
import { WorkflowsService } from './workflows.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import { WorkflowValidatorService } from './validators/workflow-validator.service';
import { SimulationEngineService } from './simulation-engine.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WorkflowsController, WorkflowInstancesController, WorkflowEngineController],
  providers: [WorkflowsService, WorkflowEngineService, ConditionEvaluatorService, WorkflowValidatorService, SimulationEngineService],
  exports: [WorkflowsService, WorkflowEngineService, ConditionEvaluatorService, WorkflowValidatorService, SimulationEngineService],
})
export class WorkflowsModule {}
