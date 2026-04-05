/**
 * Form Templates Service Unit Tests
 */

import { FormTemplatesService } from '../form-templates.service';

describe('FormTemplatesService', () => {
  let service: FormTemplatesService;

  const mockPrisma = {
    formTemplate: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(() => {
    service = new FormTemplatesService(mockPrisma as any);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all templates', async () => {
      const templates = [
        { id: '1', name: 'Leave Request', isBuiltIn: true },
        { id: '2', name: 'Expense Report', isBuiltIn: true },
      ];
      mockPrisma.formTemplate.findMany.mockResolvedValue(templates);

      const result = await service.findAll();

      expect(result).toEqual(templates);
      expect(mockPrisma.formTemplate.findMany).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return template by id', async () => {
      const template = { id: '1', name: 'Leave Request' };
      mockPrisma.formTemplate.findUnique.mockResolvedValue(template);

      const result = await service.findById('1');

      expect(result).toEqual(template);
    });
  });

  describe('create', () => {
    it('should create a new template', async () => {
      const data = {
        name: 'My Template',
        description: 'Test',
        elements: [{ type: 'text' }],
        category: 'general',
      };
      const created = { id: '1', ...data, isBuiltIn: false };
      mockPrisma.formTemplate.create.mockResolvedValue(created);

      const result = await service.create(data, 'user-1');

      expect(result).toEqual(created);
      expect(mockPrisma.formTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'My Template',
          isBuiltIn: false,
          userId: 'user-1',
        }),
      });
    });
  });

  describe('clone', () => {
    it('should clone an existing template', async () => {
      const original = {
        id: '1',
        name: 'Leave Request',
        description: 'Test',
        elements: '[{"type":"text"}]',
        category: 'leave',
        isBuiltIn: true,
      };
      const cloned = { ...original, id: '2', name: 'Leave Request (Copy)', isBuiltIn: false };

      mockPrisma.formTemplate.findUnique.mockResolvedValue(original);
      mockPrisma.formTemplate.create.mockResolvedValue(cloned);

      const result = await service.clone('1', 'user-1');

      expect(result.name).toContain('(Copy)');
      expect(result.isBuiltIn).toBe(false);
    });

    it('should throw error if template not found', async () => {
      mockPrisma.formTemplate.findUnique.mockResolvedValue(null);

      await expect(service.clone('999', 'user-1')).rejects.toThrow('Template not found');
    });
  });

  describe('delete', () => {
    it('should delete non-built-in template', async () => {
      mockPrisma.formTemplate.findUnique.mockResolvedValue({ id: '1', isBuiltIn: false });
      mockPrisma.formTemplate.delete.mockResolvedValue({ id: '1' });

      await service.delete('1');

      expect(mockPrisma.formTemplate.delete).toHaveBeenCalled();
    });

    it('should not delete built-in template', async () => {
      mockPrisma.formTemplate.findUnique.mockResolvedValue({ id: '1', isBuiltIn: true });

      await expect(service.delete('1')).rejects.toThrow('Cannot delete built-in templates');
    });
  });

  describe('seedBuiltInTemplates', () => {
    it('should not seed if already seeded', async () => {
      mockPrisma.formTemplate.count.mockResolvedValue(4);

      await service.seedBuiltInTemplates();

      expect(mockPrisma.formTemplate.create).not.toHaveBeenCalled();
    });

    it('should seed if no built-in templates exist', async () => {
      mockPrisma.formTemplate.count.mockResolvedValue(0);
      mockPrisma.formTemplate.create.mockResolvedValue({});

      await service.seedBuiltInTemplates();

      expect(mockPrisma.formTemplate.create).toHaveBeenCalledTimes(4);
    });
  });
});
