/**
 * Form Templates Controller
 */

import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FormTemplatesService } from './form-templates.service';

@Controller('form-templates')
export class FormTemplatesController {
  constructor(private readonly templatesService: FormTemplatesService) {}

  @Get()
  findAll() {
    return this.templatesService.findAll();
  }

  @Get('category/:category')
  findByCategory(@Param('category') category: string) {
    return this.templatesService.findByCategory(category);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.templatesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() body: { name: string; description?: string; elements: any[]; category?: string }, @Body('userId') userId?: string) {
    return this.templatesService.create(body, userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() body: any) {
    return this.templatesService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  delete(@Param('id') id: string) {
    return this.templatesService.delete(id);
  }

  @Post(':id/clone')
  @UseGuards(JwtAuthGuard)
  clone(@Param('id') id: string, @Body('userId') userId: string) {
    return this.templatesService.clone(id, userId);
  }
}
