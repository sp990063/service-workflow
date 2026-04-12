import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowsController, WorkflowInstancesController } from '../workflows.controller';
import { WorkflowsService } from '../workflows.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../../common/guards/roles.guard';

describe('WorkflowsController', () => {
  let controller: WorkflowsController;
  let mockWorkflowsService: any;

  const mockWorkflow = {
    id: 'wf-123',
    name: 'Test Workflow',
    description: 'Test description',
    nodes: [],
    connections: [],
    userId: 'user-123',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockWorkflowsService = {
      findAll: jest.fn().mockResolvedValue([mockWorkflow]),
      findById: jest.fn().mockResolvedValue(mockWorkflow),
      create: jest.fn().mockResolvedValue(mockWorkflow),
      update: jest.fn().mockResolvedValue(mockWorkflow),
      delete: jest.fn().mockResolvedValue(mockWorkflow),
      startInstance: jest.fn().mockResolvedValue({ id: 'inst-123' }),
      getInstances: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkflowsController],
      providers: [
        { provide: WorkflowsService, useValue: mockWorkflowsService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WorkflowsController>(WorkflowsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all workflows', async () => {
      const result = await controller.findAll('user-123', 'USER');

      expect(result).toEqual([mockWorkflow]);
      expect(mockWorkflowsService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a workflow by id', async () => {
      const result = await controller.findOne('wf-123', 'user-123', 'USER');

      expect(result).toEqual(mockWorkflow);
      expect(mockWorkflowsService.findById).toHaveBeenCalledWith('wf-123');
    });

    it('should return null when workflow not found', async () => {
      mockWorkflowsService.findById.mockResolvedValue(null);

      const result = await controller.findOne('non-existent', 'user-123', 'USER');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a workflow', async () => {
      const body = {
        name: 'New Workflow',
        description: 'Description',
        nodes: [],
        connections: [],
      };

      const result = await controller.create(body, 'user-123');

      expect(result).toEqual(mockWorkflow);
      expect(mockWorkflowsService.create).toHaveBeenCalledWith({
        ...body,
        userId: 'user-123',
      });
    });
  });

  describe('update', () => {
    it('should update a workflow', async () => {
      const body = { name: 'Updated Workflow' };

      const result = await controller.update('wf-123', body, 'user-123', 'USER');

      expect(result).toEqual(mockWorkflow);
      expect(mockWorkflowsService.update).toHaveBeenCalledWith('wf-123', body);
    });

    it('should throw error when workflow not found', async () => {
      mockWorkflowsService.findById.mockResolvedValue(null);

      await expect(controller.update('non-existent', {}, 'user-123', 'USER'))
        .rejects.toThrow('Workflow not found');
    });

    it('should throw error when user lacks permission', async () => {
      await expect(controller.update('wf-123', {}, 'other-user', 'USER'))
        .rejects.toThrow('Access denied');
    });
  });

  describe('delete', () => {
    it('should delete a workflow', async () => {
      const result = await controller.delete('wf-123', 'user-123', 'USER');

      expect(result).toEqual(mockWorkflow);
      expect(mockWorkflowsService.delete).toHaveBeenCalledWith('wf-123');
    });

    it('should throw error when workflow not found', async () => {
      mockWorkflowsService.findById.mockResolvedValue(null);

      await expect(controller.delete('non-existent', 'user-123', 'USER'))
        .rejects.toThrow('Workflow not found');
    });
  });

  describe('startInstance', () => {
    it('should start a workflow instance', async () => {
      const result = await controller.startInstance('wf-123', 'user-123');

      expect(result).toEqual({ id: 'inst-123' });
      expect(mockWorkflowsService.startInstance).toHaveBeenCalledWith('wf-123', 'user-123');
    });
  });

  describe('getInstances', () => {
    it('should return instances for a workflow', async () => {
      const result = await controller.getInstances('wf-123', 'user-123', 'USER');

      expect(result).toEqual([]);
      expect(mockWorkflowsService.getInstances).toHaveBeenCalledWith('wf-123');
    });

    it('should throw error when workflow not found', async () => {
      mockWorkflowsService.findById.mockResolvedValue(null);

      await expect(controller.getInstances('non-existent', 'user-123', 'USER'))
        .rejects.toThrow('Workflow not found');
    });
  });
});

describe('WorkflowInstancesController', () => {
  let controller: WorkflowInstancesController;
  let mockWorkflowsService: any;

  const mockInstance = {
    id: 'inst-123',
    workflowId: 'wf-123',
    userId: 'user-123',
    status: 'PENDING',
    currentNodeId: 'node-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockWorkflowsService = {
      getInstance: jest.fn().mockResolvedValue(mockInstance),
      getAllInstances: jest.fn().mockResolvedValue([mockInstance]),
      getInstances: jest.fn().mockResolvedValue([mockInstance]),
      updateInstance: jest.fn().mockResolvedValue(mockInstance),
      advanceInstance: jest.fn().mockResolvedValue(mockInstance),
      completeInstance: jest.fn().mockResolvedValue(mockInstance),
      rejectInstance: jest.fn().mockResolvedValue(mockInstance),
      createChildInstance: jest.fn().mockResolvedValue(mockInstance),
      getChildInstances: jest.fn().mockResolvedValue([]),
      initParallelApproval: jest.fn().mockResolvedValue(mockInstance),
      approveParallel: jest.fn().mockResolvedValue(mockInstance),
      rejectParallel: jest.fn().mockResolvedValue(mockInstance),
      getMyPendingInstances: jest.fn().mockResolvedValue([mockInstance]),
      getMySubmittedInstances: jest.fn().mockResolvedValue([mockInstance]),
      findById: jest.fn().mockResolvedValue({ id: 'wf-123', userId: 'user-123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkflowInstancesController],
      providers: [
        { provide: WorkflowsService, useValue: mockWorkflowsService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WorkflowInstancesController>(WorkflowInstancesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all instances', async () => {
      const result = await controller.findAll(undefined, 'user-123');

      expect(result).toEqual([mockInstance]);
      expect(mockWorkflowsService.getAllInstances).toHaveBeenCalled();
    });

    it('should return instances for specific workflow', async () => {
      const result = await controller.findAll('wf-123', 'user-123');

      expect(result).toEqual([mockInstance]);
      expect(mockWorkflowsService.getInstances).toHaveBeenCalledWith('wf-123');
    });
  });

  describe('getInstance', () => {
    it('should return an instance by id', async () => {
      const result = await controller.getInstance('inst-123', 'user-123', 'USER');

      expect(result).toEqual(mockInstance);
      expect(mockWorkflowsService.getInstance).toHaveBeenCalledWith('inst-123');
    });

    it('should return null when instance not found', async () => {
      mockWorkflowsService.getInstance.mockResolvedValue(null);

      const result = await controller.getInstance('non-existent', 'user-123', 'USER');

      expect(result).toBeNull();
    });
  });

  describe('updateInstance', () => {
    it('should update an instance', async () => {
      const body = { data: { key: 'value' } };

      const result = await controller.updateInstance('inst-123', body, 'user-123', 'USER');

      expect(result).toEqual(mockInstance);
      expect(mockWorkflowsService.updateInstance).toHaveBeenCalledWith('inst-123', body);
    });

    it('should throw error when instance not found', async () => {
      mockWorkflowsService.getInstance.mockResolvedValue(null);

      await expect(controller.updateInstance('non-existent', {}, 'user-123', 'USER'))
        .rejects.toThrow('Instance not found');
    });

    it('should throw error when user lacks permission', async () => {
      await expect(controller.updateInstance('inst-123', {}, 'other-user', 'USER'))
        .rejects.toThrow('Access denied');
    });
  });

  describe('advanceInstance', () => {
    it('should advance an instance', async () => {
      const body = { nextNodeId: 'node-2', addToHistory: [] };

      const result = await controller.advanceInstance('inst-123', body);

      expect(result).toEqual(mockInstance);
      expect(mockWorkflowsService.advanceInstance).toHaveBeenCalledWith('inst-123', 'node-2', []);
    });
  });

  describe('completeInstance', () => {
    it('should complete an instance', async () => {
      const result = await controller.completeInstance('inst-123');

      expect(result).toEqual(mockInstance);
      expect(mockWorkflowsService.completeInstance).toHaveBeenCalledWith('inst-123');
    });
  });

  describe('rejectInstance', () => {
    it('should reject an instance', async () => {
      const result = await controller.rejectInstance('inst-123');

      expect(result).toEqual(mockInstance);
      expect(mockWorkflowsService.rejectInstance).toHaveBeenCalledWith('inst-123');
    });
  });

  describe('createChildInstance', () => {
    it('should create a child instance', async () => {
      const body = { childWorkflowId: 'wf-456', formData: {} };

      const result = await controller.createChildInstance('inst-123', body, 'user-123');

      expect(result).toEqual(mockInstance);
      expect(mockWorkflowsService.createChildInstance).toHaveBeenCalledWith('inst-123', 'wf-456', 'user-123', {});
    });
  });

  describe('getChildInstances', () => {
    it('should return child instances', async () => {
      const result = await controller.getChildInstances('inst-123');

      expect(result).toEqual([]);
      expect(mockWorkflowsService.getChildInstances).toHaveBeenCalledWith('inst-123');
    });
  });

  describe('parallel approval', () => {
    it('should init parallel approval', async () => {
      const body = { nodeId: 'node-1', requiredApprovers: ['user-1', 'user-2'] };

      const result = await controller.initParallelApproval('inst-123', body);

      expect(result).toEqual(mockInstance);
      expect(mockWorkflowsService.initParallelApproval).toHaveBeenCalledWith('inst-123', 'node-1', ['user-1', 'user-2']);
    });

    it('should approve parallel', async () => {
      const body = { nodeId: 'node-1', approverId: 'user-1' };

      const result = await controller.approveParallel('inst-123', body);

      expect(result).toEqual(mockInstance);
      expect(mockWorkflowsService.approveParallel).toHaveBeenCalledWith('inst-123', 'node-1', 'user-1');
    });

    it('should reject parallel', async () => {
      const body = { nodeId: 'node-1', approverId: 'user-1' };

      const result = await controller.rejectParallel('inst-123', body);

      expect(result).toEqual(mockInstance);
      expect(mockWorkflowsService.rejectParallel).toHaveBeenCalledWith('inst-123', 'node-1', 'user-1');
    });
  });

  describe('getMyPending', () => {
    it('should return pending instances for user', async () => {
      const result = await controller.getMyPending('user-123');

      expect(result).toEqual([mockInstance]);
      expect(mockWorkflowsService.getMyPendingInstances).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getMySubmitted', () => {
    it('should return submitted instances for user', async () => {
      const result = await controller.getMySubmitted('user-123');

      expect(result).toEqual([mockInstance]);
      expect(mockWorkflowsService.getMySubmittedInstances).toHaveBeenCalledWith('user-123');
    });
  });
});
