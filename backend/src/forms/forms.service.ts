import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class FormsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.form.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.form.findUnique({ where: { id } });
  }

  async create(data: { name: string; description?: string; elements: any[] }) {
    return this.prisma.form.create({
      data: {
        name: data.name,
        description: data.description,
        elements: data.elements,
      },
    });
  }

  async update(id: string, data: { name?: string; description?: string; elements?: any[] }) {
    return this.prisma.form.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.form.update({ where: { id }, data: { isActive: false } });
  }

  async createSubmission(data: { formId: string; userId: string; formData: Record<string, any> }) {
    return this.prisma.formSubmission.create({
      data: {
        formId: data.formId,
        userId: data.userId,
        data: data.formData,
      },
    });
  }

  async getSubmissions(formId: string) {
    return this.prisma.formSubmission.findMany({
      where: { formId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSubmission(id: string) {
    return this.prisma.formSubmission.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async updateSubmissionStatus(id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return this.prisma.formSubmission.update({ where: { id }, data: { status } });
  }
}
