import { Test, TestingModule } from '@nestjs/testing';
import { FormsController, FormSubmissionsController } from '../forms.controller';
import { FormsService } from '../forms.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../../common/guards/roles.guard';

describe('FormsController', () => {
  let controller: FormsController;
  let mockFormsService: any;

  const mockForm = {
    id: 'form-123',
    name: 'Test Form',
    description: 'Test description',
    elements: [],
    userId: 'user-123',
    version: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockFormsService = {
      findAll: jest.fn().mockResolvedValue([mockForm]),
      findAllByUser: jest.fn().mockResolvedValue([mockForm]),
      findById: jest.fn().mockResolvedValue(mockForm),
      create: jest.fn().mockResolvedValue(mockForm),
      update: jest.fn().mockResolvedValue(mockForm),
      delete: jest.fn().mockResolvedValue(mockForm),
      getVersions: jest.fn().mockResolvedValue([mockForm]),
      getVersion: jest.fn().mockResolvedValue(mockForm),
      rollback: jest.fn().mockResolvedValue(mockForm),
      getSubmissions: jest.fn().mockResolvedValue([]),
      createSubmission: jest.fn().mockResolvedValue({ id: 'sub-123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FormsController],
      providers: [
        { provide: FormsService, useValue: mockFormsService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FormsController>(FormsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all forms for admin/manager', async () => {
      const result = await controller.findAll('user-123', 'ADMIN');

      expect(result).toEqual([mockForm]);
      expect(mockFormsService.findAll).toHaveBeenCalled();
    });

    it('should return forms for specific user', async () => {
      const result = await controller.findAll('user-123', 'USER');

      expect(result).toEqual([mockForm]);
      expect(mockFormsService.findAllByUser).toHaveBeenCalledWith('user-123');
    });
  });

  describe('findOne', () => {
    it('should return a form by id', async () => {
      const result = await controller.findOne('form-123', 'user-123', 'USER');

      expect(result).toEqual(mockForm);
      expect(mockFormsService.findById).toHaveBeenCalledWith('form-123');
    });

    it('should return null when form not found', async () => {
      mockFormsService.findById.mockResolvedValue(null);

      const result = await controller.findOne('non-existent', 'user-123', 'USER');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a form', async () => {
      const body = {
        name: 'New Form',
        description: 'Description',
        elements: [],
      };

      const result = await controller.create(body, 'user-123');

      expect(result).toEqual(mockForm);
      expect(mockFormsService.create).toHaveBeenCalledWith({
        ...body,
        userId: 'user-123',
      });
    });
  });

  describe('update', () => {
    it('should update a form', async () => {
      const body = { name: 'Updated Form' };

      const result = await controller.update('form-123', body, 'user-123', 'USER');

      expect(result).toEqual(mockForm);
      expect(mockFormsService.update).toHaveBeenCalledWith('form-123', body, 'user-123');
    });

    it('should throw error when form not found', async () => {
      mockFormsService.findById.mockResolvedValue(null);

      await expect(controller.update('non-existent', {}, 'user-123', 'USER'))
        .rejects.toThrow('Form not found');
    });

    it('should throw error when user lacks permission', async () => {
      await expect(controller.update('form-123', {}, 'other-user', 'USER'))
        .rejects.toThrow('Access denied');
    });
  });

  describe('delete', () => {
    it('should delete a form', async () => {
      const result = await controller.delete('form-123', 'user-123', 'USER');

      expect(result).toEqual(mockForm);
      expect(mockFormsService.delete).toHaveBeenCalledWith('form-123');
    });

    it('should throw error when form not found', async () => {
      mockFormsService.findById.mockResolvedValue(null);

      await expect(controller.delete('non-existent', 'user-123', 'USER'))
        .rejects.toThrow('Form not found');
    });
  });

  describe('getVersions', () => {
    it('should return form versions', async () => {
      const result = await controller.getVersions('form-123', 'user-123', 'USER');

      expect(result).toEqual([mockForm]);
      expect(mockFormsService.getVersions).toHaveBeenCalledWith('form-123');
    });
  });

  describe('getVersion', () => {
    it('should return a specific version', async () => {
      const result = await controller.getVersion('form-123', 1, 'user-123', 'USER');

      expect(result).toEqual(mockForm);
      expect(mockFormsService.getVersion).toHaveBeenCalledWith('form-123', 1);
    });
  });

  describe('rollback', () => {
    it('should rollback to a specific version', async () => {
      const result = await controller.rollback('form-123', 1, 'user-123');

      expect(result).toEqual(mockForm);
      expect(mockFormsService.rollback).toHaveBeenCalledWith('form-123', 1, 'user-123');
    });
  });

  describe('getSubmissions', () => {
    it('should return form submissions', async () => {
      const result = await controller.getSubmissions('form-123', 'user-123', 'USER');

      expect(result).toEqual([]);
      expect(mockFormsService.getSubmissions).toHaveBeenCalledWith('form-123');
    });
  });

  describe('submit', () => {
    it('should create a form submission', async () => {
      const body = { data: { field1: 'value1' } };

      const result = await controller.submit('form-123', body, 'user-123');

      expect(result).toEqual({ id: 'sub-123' });
      expect(mockFormsService.createSubmission).toHaveBeenCalledWith({
        formId: 'form-123',
        userId: 'user-123',
        formData: { field1: 'value1' },
      });
    });
  });
});

describe('FormSubmissionsController', () => {
  let controller: FormSubmissionsController;
  let mockFormsService: any;

  const mockSubmission = {
    id: 'sub-123',
    formId: 'form-123',
    userId: 'user-123',
    formData: { field1: 'value1' },
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockFormsService = {
      getSubmission: jest.fn().mockResolvedValue(mockSubmission),
      updateSubmissionStatus: jest.fn().mockResolvedValue(mockSubmission),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FormSubmissionsController],
      providers: [
        { provide: FormsService, useValue: mockFormsService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FormSubmissionsController>(FormSubmissionsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSubmission', () => {
    it('should return a submission by id', async () => {
      // Use ADMIN role to bypass the userId check in the controller
      const result = await controller.getSubmission('sub-123', 'ADMIN');

      expect(result).toEqual(mockSubmission);
      expect(mockFormsService.getSubmission).toHaveBeenCalledWith('sub-123');
    });

    it('should return null when submission not found', async () => {
      mockFormsService.getSubmission.mockResolvedValue(null);

      const result = await controller.getSubmission('non-existent', 'USER');

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update submission status', async () => {
      const body: { status: 'PENDING' | 'APPROVED' | 'REJECTED' } = { status: 'APPROVED' };

      const result = await controller.updateStatus('sub-123', body);

      expect(result).toEqual(mockSubmission);
      expect(mockFormsService.updateSubmissionStatus).toHaveBeenCalledWith('sub-123', 'APPROVED');
    });
  });
});
