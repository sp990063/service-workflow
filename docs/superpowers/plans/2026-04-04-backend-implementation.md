# Backend Implementation Plan - Service Workflow Platform

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans

**Goal:** Implement a REST API backend with PostgreSQL database, JWT authentication, and the core services needed to replace LocalStorage.

**Architecture:** NestJS backend with TypeORM/Prisma for PostgreSQL, JWT for auth, structured around the services defined in SPEC-MVP.

**Tech Stack:** NestJS, TypeScript, PostgreSQL, Redis, JWT, Prisma

---

## File Structure

### Backend Structure
```
backend/
├── src/
│   ├── main.ts                    # NestJS bootstrap
│   ├── app.module.ts              # Root module
│   ├── auth/                      # Authentication
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── jwt.strategy.ts
│   │   └── guards/
│   ├── users/                    # User Management
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── entities/user.entity.ts
│   ├── forms/                    # Form Builder
│   │   ├── forms.module.ts
│   │   ├── forms.controller.ts
│   │   ├── forms.service.ts
│   │   └── entities/form.entity.ts
│   ├── workflows/                # Workflow Engine
│   │   ├── workflows.module.ts
│   │   ├── workflows.controller.ts
│   │   ├── workflows.service.ts
│   │   └── entities/workflow.entity.ts
│   ├── approvals/                # Approval System
│   │   ├── approvals.module.ts
│   │   ├── approvals.controller.ts
│   │   ├── approvals.service.ts
│   │   └── entities/approval.entity.ts
│   ├── notifications/             # Notifications
│   │   ├── notifications.module.ts
│   │   ├── notifications.service.ts
│   │   └── email.service.ts
│   └── common/                   # Shared
│       ├── decorators/
│       ├── filters/
│       └── interceptors/
├── prisma/
│   └── schema.prisma             # Database schema
└── package.json
```

---

## Task 1: Project Setup

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/tsconfig.build.json`
- Create: `backend/nest-cli.json`
- Create: `backend/.env.example`
- Create: `backend/prisma/schema.prisma`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "service-workflow-api",
  "version": "1.0.0",
  "description": "Service Workflow Platform API",
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "dev": "nest start --watch",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:push": "prisma db push"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@prisma/client": "^5.0.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.0",
    "bcrypt": "^5.0.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.0",
    "dotenv": "^16.0.0",
    "rxjs": "^7.0.0"
  }
}
```

- [ ] **Step 2: Create Prisma schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  password      String
  name          String
  role          Role      @default(USER)
  department    String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  formSubmissions FormSubmission[]
  approvalRequests ApprovalRequest[]
  workflowInstances WorkflowInstance[]
}

enum Role {
  ADMIN
  MANAGER
  USER
}

model Form {
  id          String   @id @default(uuid())
  name        String
  description String?
  elements    Json     // FormElement[]
  version     Int      @default(1)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  submissions FormSubmission[]
}

model FormSubmission {
  id        String   @id @default(uuid())
  formId    String
  form      Form     @relation(fields: [formId], references: [id])
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  data      Json     // Submitted form data
  status    SubmissionStatus @default(PENDING)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum SubmissionStatus {
  PENDING
  APPROVED
  REJECTED
}

model Workflow {
  id          String   @id @default(uuid())
  name        String
  description String?
  nodes       Json     // WorkflowNode[]
  connections Json     // WorkflowConnection[]
  version     Int      @default(1)
  isActive    Boolean  @default(true)
  category    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  instances   WorkflowInstance[]
}

model WorkflowInstance {
  id            String   @id @default(uuid())
  workflowId    String
  workflow      Workflow @relation(fields: [workflowId], references: [id])
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  currentNodeId String?
  status        InstanceStatus @default(PENDING)
  formData      Json     @default("{}")
  history       Json     @default("[]")
  childInstanceId String? // For sub-workflow
  parentInstanceId String? // For sub-workflow
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum InstanceStatus {
  PENDING
  IN_PROGRESS
  WAITING_FOR_CHILD
  COMPLETED
  CANCELLED
}

model ApprovalRequest {
  id          String   @id @default(uuid())
  instanceId  String
  nodeId      String
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  decision    Decision?
  comment     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum Decision {
  APPROVED
  REJECTED
}

model Notification {
  id        String   @id @default(uuid())
  userId    String
  type      NotificationType
  title     String
  message   String
  data      Json?
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
}

enum NotificationType {
  WORKFLOW_STARTED
  WORKFLOW_COMPLETED
  APPROVAL_REQUIRED
  APPROVAL_GRANTED
  APPROVAL_REJECTED
  FORM_SUBMITTED
}
```

- [ ] **Step 3: Create basic NestJS app structure**

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(3000);
}
bootstrap();
```

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FormsModule } from './forms/forms.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    FormsModule,
    WorkflowsModule,
    ApprovalsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 4: Install dependencies and generate Prisma**

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
```

- [ ] **Step 5: Commit**

---

## Task 2: Authentication Module

**Files:**
- Create: `backend/src/auth/auth.module.ts`
- Create: `backend/src/auth/auth.controller.ts`
- Create: `backend/src/auth/auth.service.ts`
- Create: `backend/src/auth/jwt.strategy.ts`
- Create: `backend/src/auth/jwt-auth.guard.ts`
- Create: `backend/src/auth/local.strategy.ts`

- [ ] **Step 1: Create AuthModule**

```typescript
// auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 2: Create AuthService**

```typescript
// auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async register(email: string, password: string, name: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    return this.usersService.create({ email, password: hashedPassword, name });
  }
}
```

- [ ] **Step 3: Create AuthController**

```typescript
// auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('register')
  async register(@Body() body: { email: string; password: string; name: string }) {
    return this.authService.register(body.email, body.password, body.name);
  }
}
```

- [ ] **Step 4: Create JwtStrategy**

```typescript
// jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
```

- [ ] **Step 5: Create JwtAuthGuard**

```typescript
// jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 6: Build and test**

```bash
cd backend
npm run build
```

- [ ] **Step 7: Commit**

---

## Task 3: Users Module

**Files:**
- Create: `backend/src/users/users.module.ts`
- Create: `backend/src/users/users.controller.ts`
- Create: `backend/src/users/users.service.ts`

- [ ] **Step 1: Create UsersService**

```typescript
// users.service.ts
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
    return this.prisma.user.findMany();
  }
}
```

- [ ] **Step 2: Create UsersController with protected routes**

```typescript
// users.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }
}
```

- [ ] **Step 3: Build and commit**

---

## Task 4: Forms Module (REST API)

**Files:**
- Create: `backend/src/forms/forms.module.ts`
- Create: `backend/src/forms/forms.controller.ts`
- Create: `backend/src/forms/forms.service.ts`

- [ ] **Step 1: Create FormsService**

```typescript
// forms.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class FormsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.form.findMany({ where: { isActive: true } });
  }

  async findById(id: string) {
    return this.prisma.form.findUnique({ where: { id } });
  }

  async create(data: { name: string; description?: string; elements: any[] }) {
    return this.prisma.form.create({
      data: {
        name: data.name,
        description: data.description,
        elements: data.elements,
      },
    });
  }

  async update(id: string, data: { name?: string; description?: string; elements?: any[] }) {
    return this.prisma.form.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.form.update({ where: { id }, data: { isActive: false } });
  }

  async createSubmission(data: { formId: string; userId: string; formData: Record<string, any> }) {
    return this.prisma.formSubmission.create({ data });
  }

  async getSubmissions(formId: string) {
    return this.prisma.formSubmission.findMany({ where: { formId } });
  }
}
```

- [ ] **Step 2: Create FormsController**

```typescript
// forms.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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
  async update(@Param('id') id: string, @Body() body: any) {
    return this.formsService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.formsService.delete(id);
  }

  @Post(':id/submit')
  async submit(@Param('id') id: string, @Body() body: { userId: string; data: Record<string, any> }) {
    return this.formsService.createSubmission({ formId: id, ...body });
  }
}
```

- [ ] **Step 3: Build and commit**

---

## Task 5: Workflows Module (REST API)

**Files:**
- Create: `backend/src/workflows/workflows.module.ts`
- Create: `backend/src/workflows/workflows.controller.ts`
- Create: `backend/src/workflows/workflows.service.ts`

- [ ] **Step 1: Create WorkflowsService**

```typescript
// workflows.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class WorkflowsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.workflow.findMany({ where: { isActive: true } });
  }

  async findById(id: string) {
    return this.prisma.workflow.findUnique({ where: { id } });
  }

  async create(data: { name: string; description?: string; nodes: any[]; connections: any[] }) {
    return this.prisma.workflow.create({
      data: {
        name: data.name,
        description: data.description,
        nodes: data.nodes,
        connections: data.connections,
      },
    });
  }

  async update(id: string, data: { name?: string; nodes?: any[]; connections?: any[] }) {
    return this.prisma.workflow.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.workflow.update({ where: { id }, data: { isActive: false } });
  }

  // Instance management
  async startInstance(workflowId: string, userId: string) {
    const workflow = await this.findById(workflowId);
    const startNode = workflow.nodes.find((n: any) => n.type === 'start');
    
    return this.prisma.workflowInstance.create({
      data: {
        workflowId,
        userId,
        currentNodeId: startNode?.id,
        status: 'PENDING',
        formData: {},
        history: [],
      },
    });
  }

  async getInstance(id: string) {
    return this.prisma.workflowInstance.findUnique({ where: { id } });
  }

  async updateInstance(id: string, data: any) {
    return this.prisma.workflowInstance.update({ where: { id }, data });
  }

  async getInstances(workflowId: string) {
    return this.prisma.workflowInstance.findMany({ where: { workflowId } });
  }
}
```

- [ ] **Step 2: Create WorkflowsController**

```typescript
// workflows.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkflowsService } from './workflows.service';

@Controller('workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowsController {
  constructor(private workflowsService: WorkflowsService) {}

  @Get()
  async findAll() {
    return this.workflowsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.workflowsService.findById(id);
  }

  @Post()
  async create(@Body() body: { name: string; description?: string; nodes: any[]; connections: any[] }) {
    return this.workflowsService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.workflowsService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.workflowsService.delete(id);
  }

  @Post(':id/start')
  async startInstance(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.workflowsService.startInstance(id, body.userId);
  }

  @Get(':id/instances')
  async getInstances(@Param('id') id: string) {
    return this.workflowsService.getInstances(id);
  }
}

@Controller('workflow-instances')
@UseGuards(JwtAuthGuard)
export class WorkflowInstancesController {
  constructor(private workflowsService: WorkflowsService) {}

  @Get(':id')
  async getInstance(@Param('id') id: string) {
    return this.workflowsService.getInstance(id);
  }

  @Put(':id')
  async updateInstance(@Param('id') id: string, @Body() body: any) {
    return this.workflowsService.updateInstance(id, body);
  }
}
```

- [ ] **Step 3: Build and commit**

---

## Task 6: Approvals Module

**Files:**
- Create: `backend/src/approvals/approvals.module.ts`
- Create: `backend/src/approvals/approvals.controller.ts`
- Create: `backend/src/approvals/approvals.service.ts`

- [ ] **Step 1: Create ApprovalsService**

```typescript
// approvals.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ApprovalsService {
  constructor(private prisma: PrismaService) {}

  async createApprovalRequest(instanceId: string, nodeId: string, userId: string) {
    return this.prisma.approvalRequest.create({
      data: { instanceId, nodeId, userId },
    });
  }

  async getPendingApprovals(userId: string) {
    return this.prisma.approvalRequest.findMany({
      where: { userId, decision: null },
      include: { user: true },
    });
  }

  async approve(id: string, comment?: string) {
    return this.prisma.approvalRequest.update({
      where: { id },
      data: { decision: 'APPROVED', comment },
    });
  }

  async reject(id: string, comment?: string) {
    return this.prisma.approvalRequest.update({
      where: { id },
      data: { decision: 'REJECTED', comment },
    });
  }

  async getApprovalHistory(instanceId: string) {
    return this.prisma.approvalRequest.findMany({
      where: { instanceId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

- [ ] **Step 2: Create ApprovalsController**

```typescript
// approvals.controller.ts
import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApprovalsService } from './approvals.service';

@Controller('approvals')
@UseGuards(JwtAuthGuard)
export class ApprovalsController {
  constructor(private approvalsService: ApprovalsService) {}

  @Get('pending')
  async getPending(@Body() body: { userId: string }) {
    return this.approvalsService.getPendingApprovals(body.userId);
  }

  @Post()
  async create(@Body() body: { instanceId: string; nodeId: string; userId: string }) {
    return this.approvalsService.createApprovalRequest(body.instanceId, body.nodeId, body.userId);
  }

  @Put(':id/approve')
  async approve(@Param('id') id: string, @Body() body: { comment?: string }) {
    return this.approvalsService.approve(id, body.comment);
  }

  @Put(':id/reject')
  async reject(@Param('id') id: string, @Body() body: { comment?: string }) {
    return this.approvalsService.reject(id, body.comment);
  }
}
```

- [ ] **Step 3: Build and commit**

---

## Task 7: Notifications Module

**Files:**
- Create: `backend/src/notifications/notifications.module.ts`
- Create: `backend/src/notifications/notifications.service.ts`
- Create: `backend/src/notifications/email.service.ts`

- [ ] **Step 1: Create NotificationsService**

```typescript
// notifications.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, type: string, title: string, message: string, data?: any) {
    return this.prisma.notification.create({
      data: { userId, type: type as any, title, message, data },
    });
  }

  async getForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }
}
```

- [ ] **Step 2: Create EmailService**

```typescript
// email.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  async sendEmail(to: string, subject: string, body: string) {
    // TODO: Implement with Nodemailer
    console.log(`Sending email to ${to}: ${subject}`);
    return { success: true };
  }

  async sendApprovalRequest(to: string, workflowName: string) {
    return this.sendEmail(
      to,
      `Approval Required: ${workflowName}`,
      `You have a pending approval request.`,
    );
  }

  async sendApprovalNotification(to: string, decision: string, workflowName: string) {
    return this.sendEmail(
      to,
      `Request ${decision}: ${workflowName}`,
      `Your request has been ${decision.toLowerCase()}.`,
    );
  }
}
```

- [ ] **Step 3: Build and commit**

---

## Task 8: Prisma Service (Singleton)

**Files:**
- Create: `backend/src/prisma.service.ts`

```typescript
// prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 2: Update AppModule to include PrismaService**

- [ ] **Step 3: Build and commit**

---

## Task 9: Integration with Frontend

**Files:**
- Modify: `frontend/src/environments/environment.ts`
- Create: `frontend/src/app/api/` (API services)

- [ ] **Step 1: Create API service**

```typescript
// api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // Auth
  login(email: string, password: string) {
    return this.http.post(`${this.baseUrl}/auth/login`, { email, password });
  }

  // Forms
  getForms() {
    return this.http.get(`${this.baseUrl}/forms`, { headers: this.getHeaders() });
  }

  // Workflows
  getWorkflows() {
    return this.http.get(`${this.baseUrl}/workflows`, { headers: this.getHeaders() });
  }

  startWorkflow(id: string, userId: string) {
    return this.http.post(`${this.baseUrl}/workflows/${id}/start`, { userId }, { headers: this.getHeaders() });
  }

  // Approvals
  getPendingApprovals(userId: string) {
    return this.http.get(`${this.baseUrl}/approvals/pending`, { headers: this.getHeaders() });
  }
}
```

- [ ] **Step 2: Update environment**

```typescript
// environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
};
```

- [ ] **Step 3: Build and commit**

---

## Summary

| Task | Description | Status |
|------|-------------|--------|
| 1 | Project Setup (NestJS + Prisma) | ⬜ |
| 2 | Authentication Module | ⬜ |
| 3 | Users Module | ⬜ |
| 4 | Forms Module | ⬜ |
| 5 | Workflows Module | ⬜ |
| 6 | Approvals Module | ⬜ |
| 7 | Notifications Module | ⬜ |
| 8 | Prisma Service | ⬜ |
| 9 | Frontend Integration | ⬜ |

**Total Tasks: 9**

Each task should be committed separately after completion.
