import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ConfigService } from '../config/configuration';
import { LdapService } from '../config/ldap.service';
import { EmailService } from '../notifications/email.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, ConfigService, LdapService, EmailService],
  exports: [AdminService],
})
export class AdminModule {}
