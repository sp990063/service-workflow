import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../common/guards/roles.guard';
import { WorkflowsService } from './workflows.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('workflows')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkflowsController {
  constructor(private workflowsService: WorkflowsService) {}

  @Get()
  async findAll(@CurrentUser('id') userId: string, @CurrentUser('role') role: string) {
    // Non-admins can only see their own workflows
    if (role === Role.USER) {
      return this.workflowsService.findAllByUser(userId);
    }
    return this.workflowsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: string) {
    const workflow = await this.workflowsService.findById(id);
    if (!workflow) return null;
    
    // Users can only see their own workflows
    if (role === Role.USER && workflow.userId !== userId) {
      throw new Error('Access denied');
    }
    return workflow;
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  async create(
    @Body() body: { name: string; description?: string; nodes: any[]; connections: any[] },
    @CurrentUser('id') userId: string,
  ) {
    return this.workflowsService.create({
      ...body,
      userId, // Set owner to current user from JWT
    });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; nodes?: any[]; connections?: any[] },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const workflow = await this.workflowsService.findById(id);
    if (!workflow) throw new Error('Workflow not found');
    
    // Users can only update their own workflows, admins/managers can update any
    if (role === Role.USER && workflow.userId !== userId) {
      throw new Error('Access denied');
    }
    return this.workflowsService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: string) {
    const workflow = await this.workflowsService.findById(id);
    if (!workflow) throw new Error('Workflow not found');
    
    // Users can only delete their own workflows, admins can delete any
    if (role === Role.USER && workflow.userId !== userId) {
      throw new Error('Access denied');
    }
    return this.workflowsService.delete(id);
  }

  @Post(':id/start')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  async startInstance(@Param('id') id: string, @CurrentUser('id') userId: string) {
    // userId comes from JWT, not request body - prevents impersonation
    return this.workflowsService.startInstance(id, userId);
  }

  @Get(':id/instances')
  async getInstances(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: string) {
    const workflow = await this.workflowsService.findById(id);
    if (!workflow) throw new Error('Workflow not found');
    
    if (role === Role.USER && workflow.userId !== userId) {
      throw new Error('Access denied');
    }
    return this.workflowsService.getInstances(id);
  }
}

@Controller('workflow-instances')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkflowInstancesController {
  constructor(private workflowsService: WorkflowsService) {}

  @Get()
  async findAll(@Query('workflowId') workflowId?: string, @CurrentUser('id') userId?: string) {
    if (workflowId) {
      return this.workflowsService.getInstances(workflowId);
    }
    return this.workflowsService.getAllInstances();
  }

  @Get(':id')
  async getInstance(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: string) {
    const instance = await this.workflowsService.getInstance(id);
    if (!instance) return null;
    
    // Check ownership via workflow
    const workflow = await this.workflowsService.findById(instance.workflowId);
    if (role === Role.USER && workflow?.userId !== userId) {
      throw new Error('Access denied');
    }
    return instance;
  }

  @Put(':id')
  async updateInstance(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const instance = await this.workflowsService.getInstance(id);
    if (!instance) throw new Error('Instance not found');
    
    const workflow = await this.workflowsService.findById(instance.workflowId);
    if (role === Role.USER && workflow?.userId !== userId) {
      throw new Error('Access denied');
    }
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
    @Body() body: { childWorkflowId: string; formData: any },
    @CurrentUser('id') userId: string, // userId from JWT, not body
  ) {
    return this.workflowsService.createChildInstance(id, body.childWorkflowId, userId, body.formData);
  }

  @Get(':id/children')
  async getChildInstances(@Param('id') id: string) {
    return this.workflowsService.getChildInstances(id);
  }
}
