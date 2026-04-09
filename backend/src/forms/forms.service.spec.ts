import { Test, TestingModule } from '@nestjs/testing';
import { FormsService } from './forms.service';
import { PrismaService } from '../prisma.service';
import { createMockForm, createMockFormSubmission } from '../../tests/factories';

describe('FormsService', () => {
  let service: FormsService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      form: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      formVersion: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      formSubmission: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FormsService>(FormsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper to create properly formatted mock form data as Prisma would return (elements/sections as JSON strings)
  // Provide elements/sections as already-stringified JSON, or they will be stringified automatically
  const createPrismaMockForm = (options: { elementsJson?: string; sectionsJson?: string; overrides?: any } = {}) => {
    const defaultElements = [
      { id: 'el-1', type: 'text', label: 'Name', required: true },
      { id: 'el-2', type: 'dropdown', label: 'Priority', required: false, options: ['Low', 'Medium', 'High'] },
    ];
    const base = {
      id: 'form-test-id',
      name: 'Test Form',
      description: null,
      elements: options.elementsJson ?? JSON.stringify(defaultElements),
      sections: options.sectionsJson ?? null,
      version: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'user-123',
    };
    return { ...base, ...options.overrides };
  };

  const createPrismaMockFormWithSections = (options: { elementsJson?: string; sectionsJson?: string; overrides?: any } = {}) => {
    const defaultElements = [{ id: 'el-1', type: 'text', label: 'Name', required: true }];
    const defaultSections = [{ id: 'sec-1', title: 'Section 1', columns: 2 }];
    const base = {
      id: 'form-test-id',
      name: 'Test Form',
      description: null,
      elements: options.elementsJson ?? JSON.stringify(defaultElements),
      sections: options.sectionsJson ?? JSON.stringify(defaultSections),
      version: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'user-123',
    };
    return { ...base, ...options.overrides };
  };

  describe('findAll', () => {
    it('should return all active forms with parsed elements', async () => {
      const mockForms = [createPrismaMockForm({ overrides: { id: 'form-1' } }), createPrismaMockForm({ overrides: { id: 'form-2' } })];
      mockPrisma.form.findMany.mockResolvedValue(mockForms);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('elements');
      expect(Array.isArray(result[0].elements)).toBe(true);
      expect(mockPrisma.form.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no forms exist', async () => {
      mockPrisma.form.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return form with parsed elements', async () => {
      const mockForm = createPrismaMockForm({ overrides: { id: 'form-123' } });
      mockPrisma.form.findUnique.mockResolvedValue(mockForm);

      const result = await service.findById('form-123');

      expect(result).toBeDefined();
      expect(result!.id).toBe('form-123');
      expect(result!.elements).toBeDefined();
      expect(Array.isArray(result!.elements)).toBe(true);
    });

    it('should return null for non-existent form', async () => {
      mockPrisma.form.findUnique.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create form with elements and version 1', async () => {
      const formData = {
        name: 'New Form',
        description: 'Test description',
        elements: [{ id: 'el-1', type: 'text', label: 'Name', required: true }],
        sections: [],
        userId: 'user-123',
      };
      const mockForm = createPrismaMockFormWithSections({
        elementsJson: JSON.stringify(formData.elements),
        sectionsJson: JSON.stringify(formData.sections),
        overrides: { name: formData.name, description: formData.description, userId: formData.userId, version: 1 }
      });
      mockPrisma.form.create.mockResolvedValue(mockForm);
      mockPrisma.formVersion.create.mockResolvedValue({});

      const result = await service.create(formData);

      expect(result.version).toBe(1);
      expect(mockPrisma.form.create).toHaveBeenCalledWith({
        data: {
          name: 'New Form',
          description: 'Test description',
          elements: JSON.stringify(formData.elements),
          sections: JSON.stringify([]),
          userId: 'user-123',
          version: 1,
        },
      });
      expect(mockPrisma.formVersion.create).toHaveBeenCalled();
    });

    it('should create form without sections', async () => {
      const formData = {
        name: 'New Form',
        elements: [{ id: 'el-1', type: 'text', label: 'Name', required: false }],
        userId: 'user-123',
      };
      const mockForm = createPrismaMockForm({
        overrides: { name: formData.name, userId: formData.userId }
      });
      mockPrisma.form.create.mockResolvedValue(mockForm);
      mockPrisma.formVersion.create.mockResolvedValue({});

      await service.create(formData);

      expect(mockPrisma.form.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Form',
          sections: undefined,
        }),
      });
    });
  });

  describe('update', () => {
    it('should update form and increment version', async () => {
      const existingForm = createPrismaMockForm({ overrides: { id: 'form-123', version: 1 } });
      const updatedForm = createPrismaMockForm({ overrides: { id: 'form-123', name: 'Updated Form', version: 2 } });
      mockPrisma.form.findUnique.mockResolvedValue(existingForm);
      mockPrisma.form.update.mockResolvedValue(updatedForm);

      const result = await service.update('form-123', { name: 'Updated Form' }, 'user-123');

      expect(result.name).toBe('Updated Form');
      expect(mockPrisma.form.update).toHaveBeenCalled();
    });

    it('should throw error if form not found', async () => {
      mockPrisma.form.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', { name: 'Test' }, 'user-123')).rejects.toThrow('Form not found');
    });

    it('should update elements and sections', async () => {
      const existingForm = createPrismaMockForm({ overrides: { id: 'form-123', version: 1 } });
      const newElements = [{ id: 'el-1', type: 'textarea', label: 'Description', required: false }];
      const newSections = [{ id: 'sec-1', title: 'Section 1', columns: 2 }];
      const updatedForm = createPrismaMockFormWithSections({
        elementsJson: JSON.stringify(newElements),
        sectionsJson: JSON.stringify(newSections),
        overrides: { id: 'form-123', version: 2 }
      });
      mockPrisma.form.findUnique.mockResolvedValue(existingForm);
      mockPrisma.form.update.mockResolvedValue(updatedForm);

      const result = await service.update('form-123', { elements: newElements, sections: newSections }, 'user-123');

      expect(result.elements).toEqual(newElements);
      expect(mockPrisma.form.update).toHaveBeenCalledWith({
        where: { id: 'form-123' },
        data: expect.objectContaining({
          elements: JSON.stringify(newElements),
          sections: JSON.stringify(newSections),
          version: 2,
        }),
      });
    });
  });

  describe('delete', () => {
    it('should set isActive to false', async () => {
      const mockForm = { ...createPrismaMockForm({ overrides: { id: 'form-123' } }), isActive: false };
      mockPrisma.form.update.mockResolvedValue(mockForm);

      const result = await service.delete('form-123');

      expect(result.isActive).toBe(false);
      expect(mockPrisma.form.update).toHaveBeenCalledWith({
        where: { id: 'form-123' },
        data: { isActive: false },
      });
    });
  });

  describe('getVersions', () => {
    it('should return all versions sorted by version desc', async () => {
      const mockVersions = [
        { id: 'v-2', formId: 'form-123', version: 2, name: 'Form v2', createdAt: new Date(), createdBy: 'user-123' },
        { id: 'v-1', formId: 'form-123', version: 1, name: 'Form v1', createdAt: new Date(), createdBy: 'user-123' },
      ];
      mockPrisma.formVersion.findMany.mockResolvedValue(mockVersions);

      const result = await service.getVersions('form-123');

      expect(result).toHaveLength(2);
      expect(result[0].version).toBe(2);
      expect(mockPrisma.formVersion.findMany).toHaveBeenCalledWith({
        where: { formId: 'form-123' },
        orderBy: { version: 'desc' },
        select: { id: true, formId: true, version: true, name: true, createdAt: true, createdBy: true },
      });
    });
  });

  describe('getVersion', () => {
    it('should return specific version with parsed elements', async () => {
      const mockVersion = {
        id: 'v-1',
        formId: 'form-123',
        version: 1,
        name: 'Form v1',
        elements: JSON.stringify([{ id: 'el-1', type: 'text', label: 'Name' }]),
        createdAt: new Date(),
        createdBy: 'user-123',
      };
      mockPrisma.formVersion.findUnique.mockResolvedValue(mockVersion);

      const result = await service.getVersion('form-123', 1);

      expect(result).toBeDefined();
      expect(result!.version).toBe(1);
      expect(result!.elements).toEqual([{ id: 'el-1', type: 'text', label: 'Name' }]);
    });

    it('should return null for non-existent version', async () => {
      mockPrisma.formVersion.findUnique.mockResolvedValue(null);

      const result = await service.getVersion('form-123', 999);

      expect(result).toBeNull();
    });
  });

  describe('rollback', () => {
    it('should rollback to target version', async () => {
      const targetVersion = {
        id: 'v-1',
        formId: 'form-123',
        version: 1,
        name: 'Original Form',
        elements: JSON.stringify([{ id: 'el-1', type: 'text', label: 'Original' }]),
        createdAt: new Date(),
        createdBy: 'user-123',
      };
      const currentForm = createPrismaMockForm({
        elementsJson: JSON.stringify([{ id: 'el-new', type: 'text', label: 'New' }]),
        overrides: { id: 'form-123', version: 3 }
      });
      const rolledBackForm = createPrismaMockForm({
        elementsJson: JSON.stringify([{ id: 'el-1', type: 'text', label: 'Original' }]),
        overrides: { id: 'form-123', name: 'Original Form', version: 4 }
      });
      mockPrisma.formVersion.findUnique.mockResolvedValue(targetVersion);
      mockPrisma.form.findUnique.mockResolvedValue(currentForm);
      mockPrisma.form.update.mockResolvedValue(rolledBackForm);

      const result = await service.rollback('form-123', 1, 'user-123');

      expect(result.version).toBe(4);
      expect(result.name).toBe('Original Form');
    });

    it('should throw error if target version not found', async () => {
      mockPrisma.formVersion.findUnique.mockResolvedValue(null);

      await expect(service.rollback('form-123', 999, 'user-123')).rejects.toThrow('Version not found');
    });
  });

  describe('createSubmission', () => {
    it('should create form submission', async () => {
      const submissionData = {
        formId: 'form-123',
        userId: 'user-123',
        formData: { name: 'John', email: 'john@example.com' },
      };
      const mockSubmission = {
        id: 'sub-test-id',
        formId: 'form-123',
        userId: 'user-123',
        data: JSON.stringify(submissionData.formData),
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.formSubmission.create.mockResolvedValue(mockSubmission);

      const result = await service.createSubmission(submissionData);

      expect(result.formId).toBe('form-123');
      expect(mockPrisma.formSubmission.create).toHaveBeenCalledWith({
        data: {
          formId: 'form-123',
          userId: 'user-123',
          data: JSON.stringify(submissionData.formData),
        },
      });
    });
  });

  describe('getSubmissions', () => {
    it('should return all submissions with parsed data', async () => {
      const mockSubmissions = [
        {
          id: 'sub-1',
          formId: 'form-123',
          userId: 'user-123',
          data: JSON.stringify({ name: 'John' }),
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: 'user-123', name: 'John', email: 'john@example.com' },
        },
      ];
      mockPrisma.formSubmission.findMany.mockResolvedValue(mockSubmissions);

      const result = await service.getSubmissions('form-123');

      expect(result).toHaveLength(1);
      expect(result[0].data).toEqual({ name: 'John' });
      expect(result[0]).toHaveProperty('user');
    });
  });

  describe('getSubmission', () => {
    it('should return submission with parsed data', async () => {
      const mockSubmission = {
        id: 'sub-123',
        formId: 'form-123',
        userId: 'user-123',
        data: JSON.stringify({ name: 'John' }),
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user-123', name: 'John', email: 'john@example.com' },
      };
      mockPrisma.formSubmission.findUnique.mockResolvedValue(mockSubmission);

      const result = await service.getSubmission('sub-123');

      expect(result).toBeDefined();
      expect(result!.data).toEqual({ name: 'John' });
    });

    it('should return null for non-existent submission', async () => {
      mockPrisma.formSubmission.findUnique.mockResolvedValue(null);

      const result = await service.getSubmission('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateSubmissionStatus', () => {
    it('should update submission status to APPROVED', async () => {
      const mockSubmission = {
        id: 'sub-123',
        formId: 'form-123',
        userId: 'user-123',
        data: '{}',
        status: 'APPROVED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.formSubmission.update.mockResolvedValue(mockSubmission);

      const result = await service.updateSubmissionStatus('sub-123', 'APPROVED');

      expect(result.status).toBe('APPROVED');
      expect(mockPrisma.formSubmission.update).toHaveBeenCalledWith({
        where: { id: 'sub-123' },
        data: { status: 'APPROVED' },
      });
    });

    it('should update submission status to REJECTED', async () => {
      const mockSubmission = {
        id: 'sub-123',
        formId: 'form-123',
        userId: 'user-123',
        data: '{}',
        status: 'REJECTED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.formSubmission.update.mockResolvedValue(mockSubmission);

      const result = await service.updateSubmissionStatus('sub-123', 'REJECTED');

      expect(result.status).toBe('REJECTED');
    });
  });
});
