import { Controller, Get, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { name?: string; role?: 'ADMIN' | 'MANAGER' | 'USER'; department?: string }) {
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
