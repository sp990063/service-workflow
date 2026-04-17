# ServiceFlow — Overview

ServiceFlow is an enterprise-grade workflow automation platform for IT service request management. It enables organizations to design, deploy, and manage custom approval workflows with a visual drag-and-drop interface.

## Purpose

ServiceFlow bridges the gap between complex organizational approval processes and digital automation. Instead of relying on paper trails, email chains, or disconnected systems, organizations can:

- **Design custom forms** with drag-and-drop for any service request type
- **Build visual workflows** with branching logic, parallel approvals, and conditional paths
- **Configure multi-step approval chains** with escalation and delegation
- **Manage user permissions** via role-based access control (RBAC)
- **Track workflow instances** from submission to completion with full audit history

## Key Capabilities

### Form Builder
- 22 element types including text, numbers, dates, dropdowns, checkboxes, file uploads, signatures, user/department pickers, and calculated fields
- Version control with rollback capability
- JSON-based form definitions stored in the database

### Visual Workflow Designer
- Drag-and-drop canvas for workflow creation
- 11 node types: Start, End, Task, Form, Approval, Condition, Parallel, Join, Sub-workflow, Script, Set Value, Transform
- Support for sequential flows, parallel branches (AND/OR join logic), and conditional branching

### Workflow Engine
- Persistent workflow instances with execution history
- Sub-workflow invocation for reusable workflow patterns
- Real-time execution state tracking

### Approval System
- Multi-step approval chains
- Delegation (proxy approvers) with time-bound rules
- Automatic escalation on timeout with configurable rules
- Email and WebSocket notifications

### RBAC Security
- Three roles: ADMIN, MANAGER, USER
- OpenProject-style Role/Permission/Member model
- Global, project, and entity-scoped permissions
- JWT-based authentication with LDAP integration for enterprise

## User Personas

| Role | Capabilities |
|------|--------------|
| **Admin** | Full system access, LDAP sync, user management, settings |
| **Manager** | Approve/reject requests, manage team delegations, view analytics |
| **User** | Submit forms, track own submissions, manage own delegations |

## Technology Summary

- **Frontend:** Angular 18 with TypeScript, RxJS, Angular CDK
- **Backend:** NestJS 10 with Prisma ORM
- **Database:** SQLite (dev) / PostgreSQL (prod)
- **Auth:** JWT + Passport + LDAP integration
- **Real-time:** Socket.io for live notifications
- **Documentation:** Swagger/OpenAPI

## Related Pages

- [[Technical Architecture]] — Full technology stack and system design
- [[Workflow Engine]] — How workflows execute
- [[Form Builder]] — Form creation and element types
- [[Approval System]] — Approvals, delegation, and escalation
- [[RBAC System]] — Permission model
