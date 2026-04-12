import { Test, TestingModule } from '@nestjs/testing';
import { FormTemplatesController } from '../form-templates.controller';
import { FormTemplatesService } from '../form-templates.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('FormTemplatesController', () => {
  let controller: FormTemplatesController;
  let mockTemplatesService: any;

  const mockTemplate = {
    id: 'template-123',
    name: 'Test Template',
    description: 'A test form template',
    elements: [{ type: 'text', name: 'field1' }],
    category: 'GENERAL',
    userId: 'user-123',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockTemplatesService = {
      findAll: jest.fn().mockResolvedValue([mockTemplate]),
      findByCategory: jest.fn().mockResolvedValue([mockTemplate]),
      findById: jest.fn().mockResolvedValue(mockTemplate),
      create: jest.fn().mockResolvedValue(mockTemplate),
      update: jest.fn().mockResolvedValue(mockTemplate),
      delete: jest.fn().mockResolvedValue({ id: 'template-123' }),
      clone: jest.fn().mockResolvedValue({ ...mockTemplate, id: 'clone-123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FormTemplatesController],
      providers: [
        { provide: FormTemplatesService, useValue: mockTemplatesService },
      ],
    }).compile();

    controller = module.get<FormTemplatesController>(FormTemplatesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all templates', async () => {
      const result = await controller.findAll();

      expect(result).toEqual([mockTemplate]);
      expect(mockTemplatesService.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no templates exist', async () => {
      mockTemplatesService.findAll.mockResolvedValue([]);
      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findByCategory', () => {
    it('should return templates in a category', async () => {
      const result = await controller.findByCategory('GENERAL');

      expect(result).toEqual([mockTemplate]);
      expect(mockTemplatesService.findByCategory).toHaveBeenCalledWith('GENERAL');
    });

    it('should return empty array when no templates in category', async () => {
      mockTemplatesService.findByCategory.mockResolvedValue([]);
      const result = await controller.findByCategory('NONEXISTENT');

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return a template by id', async () => {
      const result = await controller.findById('template-123');

      expect(result).toEqual(mockTemplate);
      expect(mockTemplatesService.findById).toHaveBeenCalledWith('template-123');
    });

    it('should return null when template not found', async () => {
      mockTemplatesService.findById.mockResolvedValue(null);
      const result = await controller.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a template', async () => {
      const body = {
        name: 'Test Template',
        description: 'A test form template',
        elements: [{ type: 'text', name: 'field1' }],
        category: 'GENERAL',
        userId: 'user-123',
      };

      const result = await controller.create(body, 'user-123');

      expect(result).toEqual(mockTemplate);
      expect(mockTemplatesService.create).toHaveBeenCalledWith(body, 'user-123');
    });

    it('should create a template without userId', async () => {
      const body = {
        name: 'Test Template',
        description: 'A test form template',
        elements: [{ type: 'text', name: 'field1' }],
      };

      const result = await controller.create(body, undefined);

      expect(result).toEqual(mockTemplate);
      expect(mockTemplatesService.create).toHaveBeenCalledWith(body, undefined);
    });
  });

  describe('update', () => {
    it('should update a template', async () => {
      const body = { name: 'Updated Template' };

      const result = await controller.update('template-123', body);

      expect(result).toEqual(mockTemplate);
      expect(mockTemplatesService.update).toHaveBeenCalledWith('template-123', body);
    });

    it('should throw error when updating non-existent template', async () => {
      mockTemplatesService.update.mockRejectedValue(new Error('Template not found'));

      await expect(controller.update('non-existent', {}))
        .rejects.toThrow('Template not found');
    });
  });

  describe('delete', () => {
    it('should delete a template', async () => {
      const result = await controller.delete('template-123');

      expect(result).toEqual({ id: 'template-123' });
      expect(mockTemplatesService.delete).toHaveBeenCalledWith('template-123');
    });

    it('should throw error when deleting non-existent template', async () => {
      mockTemplatesService.delete.mockRejectedValue(new Error('Template not found'));

      await expect(controller.delete('non-existent'))
        .rejects.toThrow('Template not found');
    });
  });

  describe('clone', () => {
    it('should clone a template', async () => {
      const result = await controller.clone('template-123', 'user-123');

      expect(result).toEqual({ ...mockTemplate, id: 'clone-123' });
      expect(mockTemplatesService.clone).toHaveBeenCalledWith('template-123', 'user-123');
    });

    it('should throw error when cloning non-existent template', async () => {
      mockTemplatesService.clone.mockRejectedValue(new Error('Template not found'));

      await expect(controller.clone('non-existent', 'user-123'))
        .rejects.toThrow('Template not found');
    });
  });
});
