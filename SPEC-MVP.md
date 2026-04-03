# SPEC-MVP: Service Workflow Platform

**Version:** 1.0  
**Date:** April 2026  
**Status:** Draft for Review

---

# Executive Summary

## Overview

This document defines the MVP specification for a Service Workflow Platform - an enterprise-grade workflow automation system that enables organizations to design custom forms, build visual workflows, and configure parallel approval chains without requiring custom development.

## Target Users

- **System Administrators**: Configure forms, workflows, and approval chains
- **Business Users**: Submit requests and participate in approval processes
- **IT Operations**: Manage integrations and system configuration

## Problem Statement

Organizations need to digitize manual approval processes but lack flexibility in existing tools. Current solutions either:
- Require expensive custom development
- Offer rigid templates that don't match business processes
- Lack parallel approval capabilities
- Provide inadequate form building capabilities

## Solution

A configurable workflow platform providing:
- **Drag-drop form builder** with 20+ element types and conditional logic
- **Visual workflow designer** for process automation
- **Parallel approval chains** supporting complex organizational structures
- **AD/LDAP integration** for enterprise user management
- **Hybrid notifications** via in-app and email

## MVP Scope

| Feature | MVP Scope |
|---------|-----------|
| Form Builder | Full drag-drop with 20+ elements + conditional logic |
| Workflow Designer | Visual canvas with branching and parallel paths |
| Approval Chains | Parallel approvals supported |
| Notifications | In-app + Email (SMTP) |
| Integrations | AD/LDAP user sync only |
| Admin | Full admin with role-based access |

---

# MVP Core Features

## Priority 1 - Must Have

### F1: Form Builder System
- Drag-drop interface for form creation
- 20+ element types (see complete list below)
- Conditional logic (show/hide fields based on answers)
- Field validation (required, patterns, ranges)
- Form versioning and templates

### F2: Workflow Designer
- Visual canvas for workflow creation
- Node types: Start, End, Task, Condition, Approval, Parallel Split, Join
- Drag-drop node placement
- Connection drawing between nodes
- Workflow validation and testing

### F3: Approval Chain Engine
- Sequential approval steps
- Parallel approval steps (multiple approvers simultaneously)
- Approval delegation
- Escalation rules (time-based)
- Approval history and audit trail

### F4: User Management
- AD/LDAP user synchronization
- Role-based access control (Admin, Manager, User)
- User profile management
- Department/team organization

### F5: Notification System
- In-app notifications
- Email notifications via SMTP
- Notification templates
- Delivery preferences

---

# Form Builder Elements

## Complete Element List (20+ Types)

### Basic Elements
1. **Single Line Text** - Short text input, max 255 chars
2. **Multi Line Text** - Long text/textarea, unlimited length
3. **Number** - Integer or decimal with min/max validation
4. **Email** - Email format validation
5. **Phone** - Phone number with format options
6. **Date** - Single date picker
7. **Date Range** - Start and end date selection
8. **Time** - Time picker (12/24 hour format)

### Selection Elements
9. **Dropdown** - Single selection from options
10. **Radio Buttons** - Single selection, visual choices
11. **Checkboxes** - Multiple selection
12. **Multi-Select** - Multiple items from list
13. **Yes/No** - Boolean toggle

### Advanced Elements
14. **File Upload** - Single/multiple file attachments
15. **Image Upload** - Image files with preview
16. **Signature** - Digital signature pad
17. **User Picker** - Select user from directory
18. **Department Picker** - Select department
19. **Rich Text Editor** - HTML formatted text
20. **Table/Grid** - Tabular data entry

### Special Elements
21. **Calculated Field** - Auto-computed from other fields
22. **Address** - Structured address input
23. **URL** - Website link with validation

---

# Workflow Designer Features

## Canvas Features
- **Infinite Canvas** - Pan and zoom capability
- **Grid Snapping** - Align nodes to grid
- **Auto-layout** - Automatic node positioning
- **Mini-map** - Overview navigation
- **Undo/Redo** - Action history

## Node Types

### Control Nodes
| Node | Description |
|------|-------------|
| Start | Workflow initiation point (one per workflow) |
| End | Workflow termination point (multiple allowed) |
| Condition | Branch based on field values |
| Parallel Split | Create parallel execution paths |
| Join | Synchronize parallel paths |

### Action Nodes
| Node | Description |
|------|-------------|
| Task | Execute an action (notification, update, etc.) |
| Approval | Request approval from user/group |
| Sub-workflow | Call another workflow |
| Script | Execute custom script |

### Data Nodes
| Node | Description |
|------|-------------|
| Set Value | Assign value to field |
| Transform | Transform data between steps |

## Workflow Properties
- Name and description
- Version control
- Active/draft status
- Category/tags
- Access permissions

---

# Approval Chain Patterns

## Pattern 1: Sequential Approval

```
[Start] → [Approval: Manager] → [Approval: Director] → [End]
```

**Use Case:** Standard hierarchical approval

**Behavior:**
1. Request sent to Manager
2. Manager approves/rejects
3. If approved, escalates to Director
4. Process continues until final approval or rejection

---

## Pattern 2: Parallel Approval

```
        ┌─ [Approval: Manager 1] ─┐
[Start] →                          → [Join] → [End]
        └─ [Approval: Manager 2] ─┘
```

**Use Case:** Multiple approvers must approve simultaneously

**Behavior:**
1. Request sent to all parallel approvers simultaneously
2. Each approver reviews independently
3. All must approve for workflow to continue
4. If any rejects, workflow terminates

---

## Pattern 3: Mixed Sequential + Parallel

```
[Start] → [Approval: Manager] → ┌─ [Approval: VP 1] ─┐
                                │                    → [End]
                                └─ [Approval: VP 2] ─┘
```

**Use Case:** Manager approval, then multiple VP sign-off

**Behavior:**
1. Manager approves first
2. After manager, parallel approval from VPs
3. All VPs must approve for completion

---

## Pattern 4: Conditional Approval Path

```
[Start] → [Condition: Amount?] ──→ [Approval: Manager]
             │
             └─>$10K→ [Approval: Director] ──→ [End]
```

**Use Case:** Different approval paths based on request value

**Behavior:**
1. Amount < $10K: Manager approval only
2. Amount >= $10K: Manager + Director approval

---

# Technical Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Presentation Layer                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │   Admin UI  │  │  User Portal│  │  Workflow Designer │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │  REST API   │  │ GraphQL API │  │   WebSocket API    │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │Form Service │  │Workflow Svc │  │  Approval Engine   │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │ User Service│  │ Notify Svc  │  │  Integration Svc   │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                       Data Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │ PostgreSQL  │  │   Redis     │  │    MinIO/S3        │   │
│  │  (Primary)  │  │  (Cache)    │  │   (File Storage)   │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Integration Layer                          │
│  ┌─────────────┐                                           │
│  │ AD/LDAP     │                                           │
│  │ (Sync Only) │                                           │
│  └─────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18, TypeScript, React Flow (workflow designer) |
| Backend | Node.js, NestJS |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| File Storage | MinIO (S3-compatible) |
| Auth | JWT + Session |
| LDAP | ldapjs |
| Email | Nodemailer (SMTP) |

## Database Schema (Core Tables)

### Forms
- `forms` - Form definitions
- `form_elements` - Form field definitions
- `form_versions` - Form version history
- `form_submissions` - User submissions

### Workflows
- `workflows` - Workflow definitions
- `workflow_nodes` - Node configurations
- `workflow_connections` - Node connections
- `workflow_instances` - Active/running workflows
- `workflow_history` - Execution history

### Approvals
- `approval_chains` - Approval chain configs
- `approval_requests` - Pending approvals
- `approval_actions` - Approval decisions

### Users
- `users` - User accounts
- `departments` - Organization units
- `roles` - Role definitions

---

# Implementation Phases

## Phase 1: Foundation (Weeks 1-4)

**Goal:** Core infrastructure and user management

### Tasks
1. [ ] Project setup (frontend + backend scaffold)
2. [ ] Database schema design and migration
3. [ ] Authentication system (JWT)
4. [ ] AD/LDAP integration for user sync
5. [ ] Basic user management UI
6. [ ] Role-based access control

**Deliverables:**
- Working auth system
- LDAP sync functionality
- Admin user management

## Phase 2: Form Builder (Weeks 5-8)

**Goal:** Complete form builder with all element types

### Tasks
1. [ ] Drag-drop form builder UI
2. [ ] All 20+ element components
3. [ ] Element property panel
4. [ ] Conditional logic engine
5. [ ] Form validation system
6. [ ] Form templates

**Deliverables:**
- Fully functional form builder
- All element types working
- Conditional logic functional

## Phase 3: Workflow Designer (Weeks 9-12)

**Goal:** Visual workflow designer with all node types

### Tasks
1. [ ] React Flow canvas integration
2. [ ] All node type components
3. [ ] Node property editor
4. [ ] Workflow validation
5. [ ] Workflow execution engine
6. [ ] Workflow testing mode

**Deliverables:**
- Visual workflow designer
- All node types available
- Workflow can execute

## Phase 4: Approval System (Weeks 13-16)

**Goal:** Complete approval chain with parallel support

### Tasks
1. [ ] Approval request creation
2. [ ] Sequential approval flow
3. [ ] Parallel approval flow
4. [ ] Approval delegation
5. [ ] Escalation rules
6. [ ] Approval history/audit

**Deliverables:**
- Sequential + parallel approvals
- Delegation functionality
- Complete audit trail

## Phase 5: Notifications (Weeks 17-18)

**Goal:** In-app and email notifications

### Tasks
1. [ ] In-app notification system
2. [ ] Email notification service
3. [ ] Notification templates
4. [ ] Notification preferences
5. [ ] Notification history

**Deliverables:**
- In-app notifications working
- Email notifications working

## Phase 6: Integration & Polish (Weeks 19-20)

**Goal:** Final integration and refinements

### Tasks
1. [ ] End-to-end testing
2. [ ] Performance optimization
3. [ ] UI/UX polish
4. [ ] Documentation
5. [ ] Bug fixes
6. [ ] Deployment setup

**Deliverables:**
- Production-ready MVP
- Complete documentation

---

# Success Criteria

| Metric | Target |
|--------|--------|
| Form Builder Elements | 20+ element types |
| Parallel Approvals | Support simultaneous approvers |
| Conditional Logic | Full show/hide based on field values |
| LDAP Sync | Bi-directional sync with AD |
| Notification Channels | In-app + Email |
| Admin Capabilities | Full form/workflow/approval configuration |

---

# Appendix: Data Flow Examples

## Form Submission Flow

```
User → Form UI → API → Form Service → Validate → Save to DB
                                              ↓
                                    Trigger Workflow Instance
                                              ↓
                                    Create Approval Requests
                                              ↓
                                    Send Notifications
```

## Approval Flow

```
Approval Request → Check Chain Type
                        │
        ┌───────────────┴───────────────┐
        ↓                               ↓
   Sequential                    Parallel
        ↓                               ↓
   Approver 1                   Approver 1,2,3
        ↓                               ↓
   (wait for action)          (wait for ALL)
        ↓                               ↓
   Next or End                 Join → End
```

---

*End of SPEC-MVP.md*