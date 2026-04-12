import { Test, TestingModule } from '@nestjs/testing';
import { EscalationsController } from '../escalations.controller';
import { EscalationsService } from '../escalations.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

describe('EscalationsController', () => {
  let controller: EscalationsController;
  let mockEscalationsService: any;

  const mockRule = {
    id: 'rule-123',
    workflowId: 'wf-123',
    nodeType: 'APPROVAL',
    timeoutMinutes: 60,
    level1ApproverId: 'approver-1',
    level2ApproverId: 'approver-2',
    level3ApproverId: 'approver-3',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockHistory = {
    id: 'history-123',
    instanceId: 'inst-123',
    ruleId: 'rule-123',
    fromApproverId: 'approver-1',
    toApproverId: 'approver-2',
    reason: 'Timeout',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockEscalationsService = {
      createRule: jest.fn().mockResolvedValue(mockRule),
      getRules: jest.fn().mockResolvedValue([mockRule]),
      getRulesForWorkflow: jest.fn().mockResolvedValue([mockRule]),
      getEscalationHistory: jest.fn().mockResolvedValue([mockHistory]),
      updateRule: jest.fn().mockResolvedValue(mockRule),
      deleteRule: jest.fn().mockResolvedValue({ id: 'rule-123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EscalationsController],
      providers: [
        { provide: EscalationsService, useValue: mockEscalationsService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EscalationsController>(EscalationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an escalation rule', async () => {
      const body = {
        workflowId: 'wf-123',
        nodeType: 'APPROVAL',
        timeoutMinutes: 60,
        level1ApproverId: 'approver-1',
      };

      const result = await controller.create(body);

      expect(result).toEqual(mockRule);
      expect(mockEscalationsService.createRule).toHaveBeenCalledWith(body);
    });
  });

  describe('getAll', () => {
    it('should return all escalation rules', async () => {
      const result = await controller.getAll();

      expect(result).toEqual([mockRule]);
      expect(mockEscalationsService.getRules).toHaveBeenCalled();
    });

    it('should return empty array when no rules exist', async () => {
      mockEscalationsService.getRules.mockResolvedValue([]);
      const result = await controller.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('getForWorkflow', () => {
    it('should return rules for a workflow', async () => {
      const result = await controller.getForWorkflow('wf-123');

      expect(result).toEqual([mockRule]);
      expect(mockEscalationsService.getRulesForWorkflow).toHaveBeenCalledWith('wf-123');
    });

    it('should return empty array when no rules for workflow', async () => {
      mockEscalationsService.getRulesForWorkflow.mockResolvedValue([]);
      const result = await controller.getForWorkflow('wf-without-rules');

      expect(result).toEqual([]);
    });
  });

  describe('getHistory', () => {
    it('should return escalation history for an instance', async () => {
      const result = await controller.getHistory('inst-123');

      expect(result).toEqual([mockHistory]);
      expect(mockEscalationsService.getEscalationHistory).toHaveBeenCalledWith('inst-123');
    });

    it('should return empty array when no history exists', async () => {
      mockEscalationsService.getEscalationHistory.mockResolvedValue([]);
      const result = await controller.getHistory('inst-without-history');

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update an escalation rule', async () => {
      const body = { timeoutMinutes: 120 };

      const result = await controller.update('rule-123', body);

      expect(result).toEqual(mockRule);
      expect(mockEscalationsService.updateRule).toHaveBeenCalledWith('rule-123', body);
    });

    it('should throw error when updating non-existent rule', async () => {
      mockEscalationsService.updateRule.mockRejectedValue(new Error('Rule not found'));

      await expect(controller.update('non-existent', {}))
        .rejects.toThrow('Rule not found');
    });
  });

  describe('delete', () => {
    it('should delete an escalation rule', async () => {
      const result = await controller.delete('rule-123');

      expect(result).toEqual({ id: 'rule-123' });
      expect(mockEscalationsService.deleteRule).toHaveBeenCalledWith('rule-123');
    });

    it('should throw error when deleting non-existent rule', async () => {
      mockEscalationsService.deleteRule.mockRejectedValue(new Error('Rule not found'));

      await expect(controller.delete('non-existent'))
        .rejects.toThrow('Rule not found');
    });
  });
});
