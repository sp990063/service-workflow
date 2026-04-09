/**
 * Form Versioning Unit Tests
 */

import { FormsService } from '../forms.service';

describe('FormsService - Versioning', () => {
  let service: FormsService;

  const mockPrisma = {
    form: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    formVersion: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => {
    service = new FormsService(mockPrisma as any);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create form with version 1 and initial version record', async () => {
      const mockForm = {
        id: 'form-1',
        name: 'Test Form',
        description: 'A test form',
        elements: '[]',
        version: 1,
        userId: 'user-1',
      };

      mockPrisma.form.create.mockResolvedValue(mockForm);
      mockPrisma.formVersion.create.mockResolvedValue({ id: 'v-1', ...mockForm });

      const result = await service.create({
        name: 'Test Form',
        description: 'A test form',
        elements: [],
        userId: 'user-1',
      });

      expect(result.version).toBe(1);
      expect(mockPrisma.formVersion.create).toHaveBeenCalledWith({
        data: {
          formId: 'form-1',
          version: 1,
          name: 'Test Form',
          elements: '[]',
          createdBy: 'user-1',
        },
      });
    });
  });

  describe('update', () => {
    it('should increment version on update', async () => {
      const currentForm = {
        id: 'form-1',
        name: 'Test Form',
        elements: '[{"type":"text"}]',
        version: 1,
        userId: 'user-1',
      };

      const updatedForm = {
        ...currentForm,
        elements: '[{"type":"text"},{"type":"email"}]',
        version: 2,
      };

      mockPrisma.form.findUnique.mockResolvedValue(currentForm);
      mockPrisma.formVersion.upsert.mockResolvedValue({ id: 'v-upsert' });
      mockPrisma.formVersion.create.mockResolvedValue({ id: 'v-2' });
      mockPrisma.form.update.mockResolvedValue(updatedForm);

      const result = await service.update(
        'form-1',
        { elements: [{ type: 'text' }, { type: 'email' }] },
        'user-1'
      );

      expect(result.version).toBe(2);
      // Should upsert a version snapshot of old state
      expect(mockPrisma.formVersion.upsert).toHaveBeenCalled();
    });
  });

  describe('getVersions', () => {
    it('should return all versions for a form', async () => {
      const versions = [
        { id: 'v-1', formId: 'form-1', version: 1, name: 'Version 1', createdAt: new Date() },
        { id: 'v-2', formId: 'form-1', version: 2, name: 'Version 2', createdAt: new Date() },
      ];

      mockPrisma.formVersion.findMany.mockResolvedValue(versions);

      const result = await service.getVersions('form-1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.formVersion.findMany).toHaveBeenCalledWith({
        where: { formId: 'form-1' },
        orderBy: { version: 'desc' },
        select: expect.any(Object),
      });
    });
  });

  describe('getVersion', () => {
    it('should return specific version with parsed elements', async () => {
      const version = {
        id: 'v-2',
        formId: 'form-1',
        version: 2,
        name: 'Version 2',
        elements: '[{"type":"text"},{"type":"email"}]',
        createdAt: new Date(),
        createdBy: 'user-1',
      };

      mockPrisma.formVersion.findUnique.mockResolvedValue(version);

      const result = await service.getVersion('form-1', 2);

      expect(result.version).toBe(2);
      expect(result.elements).toEqual([{ type: 'text' }, { type: 'email' }]);
    });

    it('should return null for non-existent version', async () => {
      mockPrisma.formVersion.findUnique.mockResolvedValue(null);

      const result = await service.getVersion('form-1', 99);

      expect(result).toBeNull();
    });
  });

  describe('rollback', () => {
    it('should rollback to previous version', async () => {
      const targetVersion = {
        id: 'v-1',
        formId: 'form-1',
        version: 1,
        name: 'Original Form',
        elements: '[{"type":"text"}]',
        createdBy: 'user-1',
      };

      const currentForm = {
        id: 'form-1',
        name: 'Current Form',
        elements: '[{"type":"text"},{"type":"email"}]',
        version: 2,
        userId: 'user-1',
      };

      const rolledBackForm = {
        ...currentForm,
        name: 'Original Form',
        elements: '[{"type":"text"}]',
        version: 4, // Incremented twice: once for snapshot, once for rollback
      };

      mockPrisma.formVersion.findUnique.mockResolvedValue(targetVersion);
      mockPrisma.form.findUnique.mockResolvedValue(currentForm);
      mockPrisma.formVersion.create.mockResolvedValue({ id: 'v-3' });
      mockPrisma.form.update.mockResolvedValue(rolledBackForm);

      const result = await service.rollback('form-1', 1, 'user-1');

      expect(result.version).toBe(4);
      expect(result.name).toBe('Original Form');
      // Should have created two version records
      expect(mockPrisma.formVersion.create).toHaveBeenCalledTimes(2);
    });
  });
});
