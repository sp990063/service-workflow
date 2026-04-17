# Technical Architecture

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Angular | 18.2.0 | SPA framework |
| TypeScript | ~5.5.0 | Type safety |
| RxJS | ~7.8.0 | Reactive programming |
| Angular CDK | 18.2.0 | Component toolkit |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| NestJS | 10.3.0 | API framework |
| Prisma | 5.8.0 | ORM |
| SQLite | dev | Database (PostgreSQL in prod) |
| JWT | 10.2.0 | Authentication |
| Passport | 0.7.0 | Auth strategies |
| Socket.io | 4.8.3 | Real-time/WebSocket |
| Swagger | 11.2.6 | API documentation |
| Winston | 3.19.0 | Logging |
| Helmet | 8.1.0 | Security headers |
| Nodemailer | 8.0.4 | Email notifications |
| ldapjs | 3.0.7 | LDAP integration |

## Project Structure

```
service-workflow/
├── backend/                    # NestJS API
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   ├── dev.db              # SQLite dev database
│   │   └── seed.ts             # Seed data
│   └── src/
│       ├── main.ts             # App entry point
│       ├── app.module.ts       # Root module
│       ├── auth/               # JWT authentication
│       ├── users/              # User management
│       ├── forms/              # Form CRUD + versioning
│       ├── workflows/          # Workflow design + engine
│       ├── approvals/          # Approval processing
│       ├── notifications/      # Email + WebSocket notifications
│       ├── delegations/        # Approval delegation
│       ├── escalations/        # Timeout escalation rules
│       ├── analytics/          # Statistics dashboard
│       ├── form-templates/      # Built-in templates
│       ├── admin/              # LDAP sync, settings
│       ├── rbac/               # Role-based access control
│       ├── comments/           # Workflow comments
│       └── common/            # Shared utilities, guards, filters
├── src/                        # Angular frontend
│   ├── app/
│   │   ├── core/
│   │   │   ├── services/       # API, Auth, Form, Workflow services
│   │   │   ├── models/         # TypeScript interfaces
│   │   │   └── guards/         # Auth guard
│   │   ├── features/
│   │   │   ├── auth/           # Login component
│   │   │   ├── dashboard/      # Main dashboard
│   │   │   ├── admin/          # User management, settings
│   │   │   ├── form-builder/   # Drag-drop form creation
│   │   │   ├── form-fill/      # Form submission
│   │   │   ├── forms/          # Forms list
│   │   │   ├── workflow-designer/ # Visual workflow design
│   │   │   ├── workflow-player/   # Execute workflows
│   │   │   ├── workflow-instance-detail/ # View instance progress
│   │   │   ├── workflows/      # Workflows list
│   │   │   ├── analytics/     # Stats dashboard
│   │   │   ├── delegations/   # Delegation management
│   │   │   └── my-workspace/   # User workspace
│   │   └── shared/
│   │       └── components/     # Reusable UI components
│   ├── index.html
│   ├── main.ts
│   └── styles.css
├── docs/                       # Documentation files
├── docker-compose.yml          # Docker setup
└── package.json
```

## Backend Module Architecture

```
AppModule
├── AuthModule (JWT authentication)
│   ├── AuthController (login, register, profile)
│   ├── AuthService (token generation)
│   └── JwtStrategy (Passport strategy)
├── UsersModule (User management)
├── FormsModule (Form CRUD + versioning)
│   ├── FormsController
│   └── FormsService
├── WorkflowsModule (Workflow design + execution)
│   ├── WorkflowsController (CRUD)
│   ├── WorkflowsService
│   ├── WorkflowEngineController
│   ├── WorkflowEngineService (execution logic)
│   └── WorkflowInstancesController
├── ApprovalsModule (Approval processing)
│   ├── ApprovalsController
│   └── ApprovalsService
├── NotificationsModule (Email + WebSocket)
│   ├── NotificationsController
│   ├── NotificationsService
│   ├── NotificationsGateway (Socket.io)
│   └── EmailService
├── DelegationsModule (Proxy approvals)
│   ├── DelegationsController
│   └── DelegationsService
├── EscalationsModule (Timeout escalation)
│   ├── EscalationsController
│   └── EscalationsService
├── AnalyticsModule (Stats dashboard)
├── FormTemplatesModule (Built-in templates)
├── AdminModule (LDAP sync, settings)
├── RbacModule (Permission checking)
├── CommentsModule (Workflow comments)
├── PrismaModule (Database access)
└── LoggingModule (Winston logger)
```

## Frontend Architecture

### Core Services (src/app/core/services/)
| Service | Purpose |
|---------|---------|
| ApiService | HTTP client with JWT token management |
| AuthService | Login/logout, user state (Angular signals) |
| WorkflowService | Workflow CRUD, instance management |
| FormService | Form CRUD, submission |
| NotificationService | Notification state management |
| StorageService | localStorage wrapper |

### Feature Components (src/app/features/)
| Component | Purpose |
|-----------|---------|
| LoginComponent | User authentication |
| DashboardComponent | Overview statistics |
| FormBuilderComponent | Drag-drop form creation with 22 element types |
| FormFillComponent | Form submission interface |
| WorkflowDesignerComponent | Visual workflow design canvas |
| WorkflowPlayerComponent | Execute workflow steps |
| WorkflowInstanceDetailComponent | View instance progress, approve/reject |
| FormsListComponent | Form management |
| WorkflowsListComponent | Workflow management |
| AdminUsersComponent | User management |
| AnalyticsComponent | Statistics dashboard |
| DelegationsComponent | Delegation management |

## Database Architecture

### Prisma Models
ServiceFlow uses Prisma ORM with SQLite (development) or PostgreSQL (production).

**Core Models:**
- User, Role, Permission, Member (RBAC)
- Form, FormVersion, FormSubmission, FormTemplate
- Workflow, WorkflowInstance, WorkflowInstanceNode
- ApprovalRequest, Delegation, EscalationRule, EscalationLog
- Notification, Comment

### Entity Relationships
```
User ─────< Member >───── Role ─────< Permission
User ─────< FormSubmission
User ─────< ApprovalRequest
User ─────< Delegation
Form ─────< FormVersion
Form ─────< FormSubmission
Workflow ─────< WorkflowInstance
WorkflowInstance ─────< WorkflowInstanceNode
WorkflowInstance ─────< ApprovalRequest
Workflow ─────< EscalationRule
```

## Security Architecture

### Authentication
- JWT-based stateless authentication
- Passport.js for strategy extension
- LDAP integration for enterprise user sync

### Authorization
- Role-based access control (RBAC)
- Three roles: ADMIN, MANAGER, USER
- Decorators: @Roles('ADMIN'), @Roles('MANAGER'), @Roles('USER')
- Guards: RolesGuard for endpoint protection

### API Security
- Helmet for security headers
- CORS configured for frontend origin
- JWT token expiration and refresh

## Deployment Architecture

### Docker Services
| Service | Port | Purpose |
|---------|------|---------|
| backend | 3000 | NestJS API |
| frontend | 4200 (dev) / 80 (prod) | Angular app |
| mailhog | 1025 (SMTP) / 8025 (Web) | Email testing |
| openldap | 389 | LDAP directory |

## Related Pages

- [[Overview]] — Project purpose and key capabilities
- [[Module Structure]] — Backend NestJS modules
- [[Frontend Structure]] — Angular components and services
- [[Workflow Engine]] — Workflow execution engine
- [[Form Builder]] — Form creation system
