import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FormsService } from './forms.service';

@Controller('forms')
@UseGuards(JwtAuthGuard)
export class FormsController {
  constructor(private formsService: FormsService) {}

  @Get()
  async findAll() {
    return this.formsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.formsService.findById(id);
  }

  @Post()
  async create(@Body() body: { name: string; description?: string; elements: any[] }) {
    return this.formsService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { name?: string; description?: string; elements?: any[] }) {
    return this.formsService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.formsService.delete(id);
  }

  @Get(':id/submissions')
  async getSubmissions(@Param('id') id: string) {
    return this.formsService.getSubmissions(id);
  }

  @Post(':id/submit')
  async submit(@Param('id') id: string, @Body() body: { userId: string; data: Record<string, any> }) {
    return this.formsService.createSubmission({ formId: id, userId: body.userId, formData: body.data });
  }
}

@Controller('form-submissions')
@UseGuards(JwtAuthGuard)
export class FormSubmissionsController {
  constructor(private formsService: FormsService) {}

  @Get(':id')
  async getSubmission(@Param('id') id: string) {
    return this.formsService.getSubmission(id);
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: 'PENDING' | 'APPROVED' | 'REJECTED' }) {
    return this.formsService.updateSubmissionStatus(id, body.status);
  }
}
