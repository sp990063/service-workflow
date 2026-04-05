# ServiceFlow

A workflow automation platform with drag-and-drop form builder, visual workflow designer, and role-based access control.

## Features

### Core Features
- **Form Builder** - Drag-and-drop form creation with 20+ element types
- **Workflow Designer** - Visual workflow automation with 10+ node types
- **RBAC** - OpenProject-style role-based access control
- **Approval Workflows** - Multi-step approval with parallel branches
- **Real-time Progress** - Track workflow execution step by step

### Enterprise Features
- **LDAP User Sync** - Integration with enterprise LDAP/AD directories
- **Delegations** - Proxy approvals to another user
- **Escalations** - Automatic escalation on timeout
- **Form Versioning** - Track changes and rollback
- **Form Templates** - Built-in templates (Leave, Expense, IT)

### Analytics & Monitoring
- **Dashboard** - Overview of workflows and approvals
- **Workflow Analytics** - Usage stats and trends
- **WebSocket Notifications** - Real-time updates
- **Audit Logging** - Complete action trail

### Developer Experience
- **Swagger API Docs** - Interactive API documentation
- **Docker Compose** - One-command deployment
- **Centralized Logging** - Structured JSON logs
- **Enhanced Error Handling** - Consistent error responses

## Quick Start

### Docker (Recommended)

```bash
git clone https://github.com/sp990063/service-workflow.git
cd service-workflow
cp backend/.env.example backend/.env
docker-compose up -d
```

Access: http://localhost  
Default Login: admin@example.com / password123

### Manual Installation

See [Installation Guide](docs/INSTALLATION.md)

## Documentation

| Document | Description |
|----------|-------------|
| [User Guide](docs/USER_GUIDE.md) | End user documentation |
| [Production Guide](docs/PRODUCTION.md) | Production deployment guide |
| [Installation Guide](docs/INSTALLATION.md) | Technical installation guide |
| [API Documentation](http://localhost:3000/api/docs) | Swagger API docs |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Angular 19, Playwright |
| Backend | NestJS 10, Prisma ORM |
| Database | PostgreSQL (SQLite for dev) |
| Auth | JWT, RBAC |
| Real-time | Socket.io WebSocket |
| Testing | Playwright E2E, Jest |
| Logging | Winston |

## Project Structure

```
service-workflow/
├── backend/                 # NestJS API
│   ├── prisma/             # Database schema
│   └── src/
│       ├── auth/           # Authentication (JWT)
│       ├── forms/          # Forms module
│       ├── workflows/      # Workflows module
│       ├── approvals/      # Approval module
│       ├── delegations/    # Delegation module
│       ├── escalations/    # Escalation module
│       ├── analytics/      # Analytics module
│       ├── notifications/  # Notifications (Email + WebSocket)
│       ├── form-templates/ # Form templates
│       ├── admin/          # Admin settings (LDAP, SMTP)
│       ├── rbac/           # Role-based access control
│       └── common/         # Shared utilities, filters, logging
├── frontend/               # Angular SPA
│   └── src/app/
│       └── features/      # Feature components
├── tests/e2e/              # Playwright E2E tests
├── docs/                   # Documentation
└── docker-compose.yml       # Docker deployment
```

## Test Users

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | password123 |
| Manager | manager@example.com | password123 |
| Employee | employee@example.com | password123 |

## Development

```bash
# Backend
cd backend
npm install --legacy-peer-deps
npx prisma migrate dev
npm run start:dev

# Frontend
npm install --legacy-peer-deps
npm start
```

## Testing

```bash
# E2E Tests
npx playwright test

# Backend Integration Tests
cd backend
npx jest --config jest-integration.config.js

# Generate Test Report
npx playwright show-report
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/auth/profile` - Get profile

### Forms
- `GET/POST /api/forms` - List/Create forms
- `GET/PUT/DELETE /api/forms/:id` - CRUD operations
- `GET /api/forms/:id/versions` - Version history
- `POST /api/forms/:id/versions/:version/restore` - Restore version

### Workflows
- `GET/POST /api/workflows` - List/Create workflows
- `GET/PUT/DELETE /api/workflows/:id` - CRUD operations
- `POST /api/workflows/:id/execute` - Execute workflow
- `GET /api/workflows/:id/instances` - List instances

### Approvals
- `GET /api/approvals/pending` - My pending approvals
- `POST /api/approvals/:id/approve` - Approve
- `POST /api/approvals/:id/reject` - Reject
- `POST /api/approvals/:id/delegate` - Delegate

### Delegations
- `GET/POST /api/delegations` - List/Create delegations
- `DELETE /api/delegations/:id` - Delete delegation
- `GET /api/delegations/delegated-to-me` - Received delegations

### Analytics
- `GET /api/analytics/overview` - Dashboard stats
- `GET /api/analytics/stats` - Detailed stats
- `GET /api/analytics/trends` - Trends data

### Admin
- `GET/PUT /api/admin/settings` - System settings
- `POST /api/admin/ldap/sync` - LDAP sync
- `GET/POST /api/admin/users` - User management

### Form Templates
- `GET /api/form-templates` - List templates
- `GET /api/form-templates/category/:cat` - By category
- `POST /api/form-templates/:id/clone` - Clone template

## WebSocket Events

Connect to: `/notifications`

### Events
- `notification:new` - New notification
- `workflow:status` - Workflow status update
- `approval:completed` - Approval completed

## Production Build

```bash
# Build Docker images
docker-compose -f docker-compose.prod.yml build

# Run production
docker-compose -f docker-compose.prod.yml up -d
```

## License

MIT
