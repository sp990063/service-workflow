import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FormsModule } from './forms/forms.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma.module';
import { RbacModule } from './rbac/rbac.module';
import { AdminModule } from './admin/admin.module';
import { DelegationsModule } from './delegations/delegations.module';
import { EscalationsModule } from './escalations/escalations.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { FormTemplatesModule } from './form-templates/form-templates.module';
import { LoggingModule } from './common/logging/logging.module';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';

@Module({
  imports: [
    // Rate limiting: 100 requests per minute globally
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    LoggingModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    FormsModule,
    WorkflowsModule,
    ApprovalsModule,
    NotificationsModule,
    RbacModule,
    AdminModule,
    DelegationsModule,
    EscalationsModule,
    AnalyticsModule,
    FormTemplatesModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ThrottlerExceptionFilter,
    },
  ],
})
export class AppModule {}
