import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkflowsService } from './workflows.service';

@Controller('workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowsController {
  constructor(private workflowsService: WorkflowsService) {}

  @Get()
  async findAll() {
    return this.workflowsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.workflowsService.findById(id);
  }

  @Post()
  async create(@Body() body: { name: string; description?: string; nodes: any[]; connections: any[] }) {
    return this.workflowsService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { name?: string; nodes?: any[]; connections?: any[] }) {
    return this.workflowsService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.workflowsService.delete(id);
  }

  @Post(':id/start')
  async startInstance(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.workflowsService.startInstance(id, body.userId);
  }

  @Get(':id/instances')
  async getInstances(@Param('id') id: string) {
    return this.workflowsService.getInstances(id);
  }
}

@Controller('workflow-instances')
@UseGuards(JwtAuthGuard)
export class WorkflowInstancesController {
  constructor(private workflowsService: WorkflowsService) {}

  @Get()
  async findAll(@Query('workflowId') workflowId?: string) {
    if (workflowId) {
      return this.workflowsService.getInstances(workflowId);
    }
    return this.workflowsService.getAllInstances();
  }

  @Get(':id')
  async getInstance(@Param('id') id: string) {
    return this.workflowsService.getInstance(id);
  }

  @Put(':id')
  async updateInstance(@Param('id') id: string, @Body() body: any) {
    return this.workflowsService.updateInstance(id, body);
  }

  @Post(':id/advance')
  async advanceInstance(@Param('id') id: string, @Body() body: { nextNodeId: string; addToHistory: any[] }) {
    return this.workflowsService.advanceInstance(id, body.nextNodeId, body.addToHistory);
  }

  @Post(':id/complete')
  async completeInstance(@Param('id') id: string) {
    return this.workflowsService.completeInstance(id);
  }

  @Post(':id/child')
  async createChildInstance(
    @Param('id') id: string,
    @Body() body: { childWorkflowId: string; userId: string; formData: any },
  ) {
    return this.workflowsService.createChildInstance(id, body.childWorkflowId, body.userId, body.formData);
  }

  @Get(':id/children')
  async getChildInstances(@Param('id') id: string) {
    return this.workflowsService.getChildInstances(id);
  }
}
