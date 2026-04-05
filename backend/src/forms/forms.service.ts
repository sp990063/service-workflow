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

  async findAllByUser(userId: string) {
    const forms = await this.prisma.form.findMany({
      where: { isActive: true, userId },
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

  async create(data: { name: string; description?: string; elements: any[]; userId: string }) {
    const form = await this.prisma.form.create({
      data: {
        name: data.name,
        description: data.description,
        elements: JSON.stringify(data.elements),
        userId: data.userId,
        version: 1,
      },
    });

    // Create initial version
    await this.prisma.formVersion.create({
      data: {
        formId: form.id,
        version: 1,
        name: form.name,
        elements: form.elements,
        createdBy: data.userId,
      },
    });

    return { ...form, elements: JSON.parse(form.elements as string) };
  }

  async update(id: string, data: { name?: string; description?: string; elements?: any[] }, userId: string) {
    // Get current form
    const currentForm = await this.prisma.form.findUnique({ where: { id } });
    if (!currentForm) {
      throw new Error('Form not found');
    }

    // Create version snapshot BEFORE updating
    const newVersion = currentForm.version + 1;
    await this.prisma.formVersion.create({
      data: {
        formId: id,
        version: newVersion,
        name: currentForm.name,
        elements: currentForm.elements,
        createdBy: userId,
      },
    });

    // Update form with new content
    const updateData: any = { ...data, version: newVersion };
    if (data.elements !== undefined) {
      updateData.elements = JSON.stringify(data.elements);
    }

    const updated = await this.prisma.form.update({ where: { id }, data: updateData });
    return { ...updated, elements: JSON.parse(updated.elements as string) };
  }

  async delete(id: string) {
    return this.prisma.form.update({ where: { id }, data: { isActive: false } });
  }

  // ============ Versioning ============

  async getVersions(formId: string) {
    const versions = await this.prisma.formVersion.findMany({
      where: { formId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        formId: true,
        version: true,
        name: true,
        createdAt: true,
        createdBy: true,
      },
    });
    return versions;
  }

  async getVersion(formId: string, version: number) {
    const formVersion = await this.prisma.formVersion.findUnique({
      where: {
        formId_version: { formId, version },
      },
    });

    if (formVersion) {
      return {
        ...formVersion,
        elements: JSON.parse(formVersion.elements as string),
      };
    }
    return null;
  }

  async rollback(formId: string, targetVersion: number, userId: string) {
    // Get the version to rollback to
    const targetFormVersion = await this.prisma.formVersion.findUnique({
      where: {
        formId_version: { formId, version: targetVersion },
      },
    });

    if (!targetFormVersion) {
      throw new Error('Version not found');
    }

    // Get current form for snapshot
    const currentForm = await this.prisma.form.findUnique({ where: { id: formId } });
    if (!currentForm) {
      throw new Error('Form not found');
    }

    // Create new version with current state (before rollback)
    const newVersion = currentForm.version + 1;
    await this.prisma.formVersion.create({
      data: {
        formId,
        version: newVersion,
        name: currentForm.name,
        elements: currentForm.elements,
        createdBy: userId,
      },
    });

    // Apply rollback by creating another new version with target's content
    await this.prisma.formVersion.create({
      data: {
        formId,
        version: newVersion + 1,
        name: targetFormVersion.name,
        elements: targetFormVersion.elements,
        createdBy: userId,
      },
    });

    // Update form with rolled back content
    const updated = await this.prisma.form.update({
      where: { id: formId },
      data: {
        name: targetFormVersion.name,
        elements: targetFormVersion.elements,
        version: newVersion + 1,
      },
    });

    return { ...updated, elements: JSON.parse(updated.elements as string) };
  }

  // ============ Submissions ============

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
