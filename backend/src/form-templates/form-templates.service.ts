/**
 * Form Templates Service
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface CreateTemplateDto {
  name: string;
  description?: string;
  elements: any[];
  category?: string;
}

export interface UpdateTemplateDto {
  name?: string;
  description?: string;
  elements?: any[];
  category?: string;
}

@Injectable()
export class FormTemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.formTemplate.findMany({
      where: { OR: [{ isBuiltIn: true }, { isBuiltIn: false }] },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.formTemplate.findUnique({ where: { id } });
  }

  async findByCategory(category: string) {
    return this.prisma.formTemplate.findMany({
      where: { category, OR: [{ isBuiltIn: true }, { isBuiltIn: false }] },
    });
  }

  async create(data: CreateTemplateDto, userId?: string) {
    return this.prisma.formTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        elements: JSON.stringify(data.elements),
        category: data.category || 'general',
        isBuiltIn: false,
        userId,
      },
    });
  }

  async update(id: string, data: UpdateTemplateDto) {
    const updateData: any = { ...data };
    if (data.elements) {
      updateData.elements = JSON.stringify(data.elements);
    }
    return this.prisma.formTemplate.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string) {
    // Only allow deleting non-built-in templates
    const template = await this.prisma.formTemplate.findUnique({ where: { id } });
    if (template?.isBuiltIn) {
      throw new Error('Cannot delete built-in templates');
    }
    return this.prisma.formTemplate.delete({ where: { id } });
  }

  async clone(id: string, userId: string) {
    const original = await this.prisma.formTemplate.findUnique({ where: { id } });
    if (!original) {
      throw new Error('Template not found');
    }

    return this.prisma.formTemplate.create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description,
        elements: original.elements,
        category: original.category,
        isBuiltIn: false,
        userId,
      },
    });
  }

  async seedBuiltInTemplates() {
    const existingCount = await this.prisma.formTemplate.count({
      where: { isBuiltIn: true },
    });

    if (existingCount > 0) {
      return; // Already seeded
    }

    const builtInTemplates = [
      {
        name: 'Leave Request',
        description: 'Standard leave/vacation request form',
        category: 'leave',
        elements: JSON.stringify([
          { type: 'text', label: 'Employee Name', required: true },
          { type: 'date-range', label: 'Leave Period', required: true },
          { type: 'select', label: 'Leave Type', options: ['Annual Leave', 'Sick Leave', 'Personal Leave', 'Other'], required: true },
          { type: 'textarea', label: 'Reason', required: false },
        ]),
      },
      {
        name: 'Expense Report',
        description: 'Submit expense reimbursement requests',
        category: 'expense',
        elements: JSON.stringify([
          { type: 'text', label: 'Employee Name', required: true },
          { type: 'date', label: 'Expense Date', required: true },
          { type: 'number', label: 'Amount', required: true },
          { type: 'select', label: 'Expense Category', options: ['Travel', 'Meals', 'Equipment', 'Other'], required: true },
          { type: 'textarea', label: 'Description', required: true },
          { type: 'file', label: 'Receipt', required: false },
        ]),
      },
      {
        name: 'IT Equipment Request',
        description: 'Request IT equipment or software',
        category: 'it',
        elements: JSON.stringify([
          { type: 'text', label: 'Employee Name', required: true },
          { type: 'text', label: 'Department', required: true },
          { type: 'select', label: 'Equipment Type', options: ['Laptop', 'Monitor', 'Keyboard', 'Mouse', 'Software License', 'Other'], required: true },
          { type: 'number', label: 'Quantity', required: true },
          { type: 'date', label: 'Required By', required: false },
          { type: 'textarea', label: 'Business Justification', required: true },
        ]),
      },
      {
        name: 'General Request',
        description: 'Generic request form for any purpose',
        category: 'general',
        elements: JSON.stringify([
          { type: 'text', label: 'Request Title', required: true },
          { type: 'textarea', label: 'Details', required: true },
          { type: 'date', label: 'Required By', required: false },
        ]),
      },
    ];

    for (const template of builtInTemplates) {
      await this.prisma.formTemplate.create({
        data: {
          ...template,
          isBuiltIn: true,
        },
      });
    }
  }
}
