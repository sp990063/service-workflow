import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FormsModule } from './forms/forms.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    FormsModule,
    WorkflowsModule,
    ApprovalsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
