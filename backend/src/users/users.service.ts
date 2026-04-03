import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: { email: string; password: string; name: string }) {
    return this.prisma.user.create({ data });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, department: true, createdAt: true },
    });
  }

  async update(id: string, data: { name?: string; role?: 'ADMIN' | 'MANAGER' | 'USER'; department?: string }) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}
