import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { EmailService } from './email.service';
import { PrismaModule } from '../prisma.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfigService } from '../config/configuration';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, EmailService, ConfigService],
  exports: [NotificationsService, NotificationsGateway, EmailService],
})
export class NotificationsModule {}
