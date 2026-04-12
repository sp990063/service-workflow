import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowEngineController } from '../workflow-engine.controller';
import { WorkflowEngineService } from '../workflow-engine.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('WorkflowEngineController', () => {
  let controller: WorkflowEngineController;
  let mockEngineService: any;

  const mockInstance = {
    id: 'inst-123',
    workflowId: 'wf-123',
    userId: 'user-123',
    status: 'IN_PROGRESS',
    currentNodeId: 'approval-1',
    formData: {},
    history: [],
  };

  const mockExecutionResult = {
    success: true,
    nextNodeId: 'node-2',
  };

  beforeEach(async () => {
    mockEngineService = {
      startInstance: jest.fn().mockResolvedValue(mockInstance),
      getInstance: jest.fn().mockResolvedValue(mockInstance),
      executeCurrentNode: jest.fn().mockResolvedValue(mockExecutionResult),
      getAvailableActions: jest.fn().mockResolvedValue([
        { action: 'approve', label: 'Approve' },
        { action: 'reject', label: 'Reject' },
      ]),
      submitApproval: jest.fn().mockResolvedValue(mockExecutionResult),
      submitFormData: jest.fn().mockResolvedValue(mockExecutionResult),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkflowEngineController],
      providers: [
        { provide: WorkflowEngineService, useValue: mockEngineService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WorkflowEngineController>(WorkflowEngineController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startInstance', () => {
    it('should start a workflow instance', async () => {
      const req = { user: { id: 'user-123' } };
      const body = { initialData: { field: 'value' } };

      const result = await controller.startInstance('wf-123', body, req);

      expect(result).toEqual(mockInstance);
      expect(mockEngineService.startInstance).toHaveBeenCalledWith('wf-123', 'user-123', { field: 'value' });
    });

    it('should start instance without initial data', async () => {
      const req = { user: { id: 'user-123' } };
      const body = {};

      const result = await controller.startInstance('wf-123', body, req);

      expect(result).toEqual(mockInstance);
      expect(mockEngineService.startInstance).toHaveBeenCalledWith('wf-123', 'user-123', undefined);
    });
  });

  describe('getInstance', () => {
    it('should return instance details', async () => {
      const result = await controller.getInstance('inst-123');

      expect(result).toEqual(mockInstance);
      expect(mockEngineService.getInstance).toHaveBeenCalledWith('inst-123');
    });

    it('should return null for non-existent instance', async () => {
      mockEngineService.getInstance.mockResolvedValue(null);

      const result = await controller.getInstance('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('execute', () => {
    it('should execute current node', async () => {
      const result = await controller.execute('inst-123');

      expect(result).toEqual(mockExecutionResult);
      expect(mockEngineService.executeCurrentNode).toHaveBeenCalledWith('inst-123');
    });

    it('should return error when instance not found', async () => {
      mockEngineService.executeCurrentNode.mockResolvedValue({
        success: false,
        error: 'Instance not found',
      });

      const result = await controller.execute('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Instance not found');
    });
  });

  describe('getActions', () => {
    it('should return available actions', async () => {
      const result = await controller.getActions('inst-123');

      expect(result).toEqual([
        { action: 'approve', label: 'Approve' },
        { action: 'reject', label: 'Reject' },
      ]);
      expect(mockEngineService.getAvailableActions).toHaveBeenCalledWith('inst-123');
    });

    it('should return empty array when instance not found', async () => {
      mockEngineService.getAvailableActions.mockResolvedValue([]);

      const result = await controller.getActions('non-existent');

      expect(result).toEqual([]);
    });
  });

  describe('submit - approve', () => {
    it('should submit approval', async () => {
      const req = { user: { id: 'approver-1' } };
      const body = { action: 'approve', comment: 'LGTM' };

      const result = await controller.submit('inst-123', body, req);

      expect(result).toEqual(mockExecutionResult);
      expect(mockEngineService.submitApproval).toHaveBeenCalledWith('inst-123', 'approver-1', 'approve', 'LGTM');
    });

    it('should submit rejection', async () => {
      const req = { user: { id: 'approver-1' } };
      const body = { action: 'reject', comment: 'Not approved' };

      const result = await controller.submit('inst-123', body, req);

      expect(mockEngineService.submitApproval).toHaveBeenCalledWith('inst-123', 'approver-1', 'reject', 'Not approved');
    });
  });

  describe('submit - submit_form', () => {
    it('should submit form data', async () => {
      const req = { user: { id: 'user-123' } };
      const body = { action: 'submit_form', data: { field1: 'value1', field2: 'value2' } };

      const result = await controller.submit('inst-123', body, req);

      expect(result).toEqual(mockExecutionResult);
      expect(mockEngineService.submitFormData).toHaveBeenCalledWith('inst-123', { field1: 'value1', field2: 'value2' });
    });

    it('should handle empty data for submit_form', async () => {
      const req = { user: { id: 'user-123' } };
      const body = { action: 'submit_form' };

      const result = await controller.submit('inst-123', body, req);

      expect(mockEngineService.submitFormData).toHaveBeenCalledWith('inst-123', {});
    });
  });

  describe('submit - invalid action', () => {
    it('should return error for invalid action', async () => {
      const req = { user: { id: 'user-123' } };
      const body = { action: 'invalid_action' };

      const result = await controller.submit('inst-123', body, req);

      expect(result).toEqual({ success: false, error: 'Invalid action' });
      expect(mockEngineService.submitApproval).not.toHaveBeenCalled();
      expect(mockEngineService.submitFormData).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should cancel workflow instance', async () => {
      const result = await controller.cancel('inst-123');

      expect(result).toEqual({ success: true, message: 'Workflow cancelled' });
      expect(mockEngineService.getInstance).toHaveBeenCalledWith('inst-123');
    });

    it('should return error when instance not found', async () => {
      mockEngineService.getInstance.mockResolvedValue(null);

      const result = await controller.cancel('non-existent');

      expect(result).toEqual({ success: false, error: 'Instance not found' });
    });
  });
});
