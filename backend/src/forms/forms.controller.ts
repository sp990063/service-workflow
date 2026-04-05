import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../common/guards/roles.guard';
import { FormsService } from './forms.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('forms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FormsController {
  constructor(private formsService: FormsService) {}

  @Get()
  async findAll(@CurrentUser('id') userId: string, @CurrentUser('role') role: string) {
    if (role === Role.USER) {
      return this.formsService.findAllByUser(userId);
    }
    return this.formsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: string) {
    const form = await this.formsService.findById(id);
    if (!form) return null;
    
    if (role === Role.USER && form.userId !== userId) {
      throw new Error('Access denied');
    }
    return form;
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  async create(
    @Body() body: { name: string; description?: string; elements: any[] },
    @CurrentUser('id') userId: string,
  ) {
    return this.formsService.create({
      ...body,
      userId,
    });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; elements?: any[] },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const form = await this.formsService.findById(id);
    if (!form) throw new Error('Form not found');
    
    if (role === Role.USER && form.userId !== userId) {
      throw new Error('Access denied');
    }
    return this.formsService.update(id, body, userId);
  }

  // ============ Versioning ============

  @Get(':id/versions')
  async getVersions(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: string) {
    const form = await this.formsService.findById(id);
    if (!form) throw new Error('Form not found');
    
    if (role === Role.USER && form.userId !== userId) {
      throw new Error('Access denied');
    }
    return this.formsService.getVersions(id);
  }

  @Get(':id/versions/:version')
  async getVersion(
    @Param('id') id: string,
    @Param('version') version: number,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const form = await this.formsService.findById(id);
    if (!form) throw new Error('Form not found');
    
    if (role === Role.USER && form.userId !== userId) {
      throw new Error('Access denied');
    }
    return this.formsService.getVersion(id, version);
  }

  @Post(':id/rollback/:version')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  async rollback(
    @Param('id') id: string,
    @Param('version') version: number,
    @CurrentUser('id') userId: string,
  ) {
    return this.formsService.rollback(id, version, userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: string) {
    const form = await this.formsService.findById(id);
    if (!form) throw new Error('Form not found');
    
    if (role === Role.USER && form.userId !== userId) {
      throw new Error('Access denied');
    }
    return this.formsService.delete(id);
  }

  @Get(':id/submissions')
  async getSubmissions(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: string) {
    const form = await this.formsService.findById(id);
    if (!form) throw new Error('Form not found');
    
    if (role === Role.USER && form.userId !== userId) {
      throw new Error('Access denied');
    }
    return this.formsService.getSubmissions(id);
  }

  @Post(':id/submit')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  async submit(
    @Param('id') id: string,
    @Body() body: { data: Record<string, any> },
    @CurrentUser('id') userId: string, // userId from JWT, not body
  ) {
    return this.formsService.createSubmission({ formId: id, userId, formData: body.data });
  }
}

@Controller('form-submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FormSubmissionsController {
  constructor(private formsService: FormsService) {}

  @Get(':id')
  async getSubmission(@Param('id') id: string, @CurrentUser('role') role: string) {
    const submission = await this.formsService.getSubmission(id);
    if (!submission) return null;
    
    if (role === Role.USER && submission.userId !== id) {
      throw new Error('Access denied');
    }
    return submission;
  }

  @Put(':id/status')
  @Roles(Role.ADMIN, Role.MANAGER) // Only admins/managers can update status
  async updateStatus(@Param('id') id: string, @Body() body: { status: 'PENDING' | 'APPROVED' | 'REJECTED' }) {
    return this.formsService.updateSubmissionStatus(id, body.status);
  }
}
