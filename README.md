# ServiceFlow

A workflow automation platform with drag-and-drop form builder, visual workflow designer, and role-based access control.

## Features

- **Form Builder** - Drag-and-drop form creation with 12+ element types
- **Workflow Designer** - Visual workflow automation with 10+ node types
- **RBAC** - OpenProject-style role-based access control
- **Approval Workflows** - Multi-step approval with parallel branches
- **Real-time Progress** - Track workflow execution step by step

## Quick Start

### Docker (Recommended)

```bash
git clone https://github.com/sp990063/service-workflow.git
cd service-workflow
cp .env.example .env
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

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Angular 18, Playwright |
| Backend | NestJS, Prisma ORM |
| Database | PostgreSQL (SQLite for dev) |
| Auth | JWT, RBAC |
| Testing | Playwright E2E |

## Project Structure

```
service-workflow/
├── backend/                 # NestJS API
│   ├── prisma/             # Database schema
│   └── src/
│       ├── auth/           # Authentication
│       ├── forms/          # Forms module
│       ├── workflows/      # Workflows module
│       ├── rbac/           # Role-based access
│       └── approvals/       # Approval module
├── frontend/               # Angular SPA
│   └── src/app/
│       └── features/       # Feature modules
├── tests/e2e/              # Playwright tests
└── docs/                   # Documentation
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
npm install
npx prisma migrate dev
npm run start:dev

# Frontend
cd frontend
npm install
npm start
```

## Production Build

```bash
# Build Docker images
docker-compose -f docker-compose.yml build

# Run production
docker-compose -f docker-compose.yml up -d
```

## License

MIT
