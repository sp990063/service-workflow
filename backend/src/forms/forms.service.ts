import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class FormsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const forms = await this.prisma.form.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return forms.map(f => ({ ...f, elements: JSON.parse(f.elements as string) }));
  }

  async findById(id: string) {
    const form = await this.prisma.form.findUnique({ where: { id } });
    if (form) {
      return { ...form, elements: JSON.parse(form.elements as string) };
    }
    return null;
  }

  async create(data: { name: string; description?: string; elements: any[] }) {
    return this.prisma.form.create({
      data: {
        name: data.name,
        description: data.description,
        elements: JSON.stringify(data.elements),
      },
    });
  }

  async update(id: string, data: { name?: string; description?: string; elements?: any[] }) {
    const updateData: any = { ...data };
    if (data.elements !== undefined) {
      updateData.elements = JSON.stringify(data.elements);
    }
    return this.prisma.form.update({ where: { id }, data: updateData });
  }

  async delete(id: string) {
    return this.prisma.form.update({ where: { id }, data: { isActive: false } });
  }

  async createSubmission(data: { formId: string; userId: string; formData: Record<string, any> }) {
    return this.prisma.formSubmission.create({
      data: {
        formId: data.formId,
        userId: data.userId,
        data: JSON.stringify(data.formData),
      },
    });
  }

  async getSubmissions(formId: string) {
    const submissions = await this.prisma.formSubmission.findMany({
      where: { formId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return submissions.map(s => ({ ...s, data: JSON.parse(s.data as string) }));
  }

  async getSubmission(id: string) {
    const submission = await this.prisma.formSubmission.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (submission) {
      return { ...submission, data: JSON.parse(submission.data as string) };
    }
    return null;
  }

  async updateSubmissionStatus(id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return this.prisma.formSubmission.update({ where: { id }, data: { status } });
  }
}
