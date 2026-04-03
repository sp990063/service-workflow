# ServiceFlow - IT Service Request Management System
## Detailed Specification Document

**Version:** 1.0  
**Last Updated:** 2026-04-03  
**Author:** ServiceFlow Development Team

---

## Table of Contents
1. [Concept & Vision](#1-concept--vision)
2. [Design Language](#2-design-language)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Core Data Models](#4-core-data-models)
5. [Detailed User Flows](#5-detailed-user-flows)
6. [UI Wireframes & Mockups](#6-ui-wireframes--mockups)
7. [Form Builder Design](#7-form-builder-design)
8. [Workflow Designer Design](#8-workflow-designer-design)
9. [Dashboard Views](#9-dashboard-views)
10. [API Design](#10-api-design)
11. [Database Schema](#11-database-schema)
12. [Component Inventory](#12-component-inventory)
13. [Error Handling & Edge Cases](#13-error-handling--edge-cases)
14. [Performance Requirements](#14-performance-requirements)
15. [Security Considerations](#15-security-considerations)

---

## 1. Concept & Vision

### 1.1 Product Overview

**Name:** ServiceFlow  
**Tagline:** "Streamline Your Service Requests"

**Core Value Proposition:** A no-code workflow automation platform that empowers organizations to digitize and automate any approval-based process. Users design forms with drag-and-drop simplicity, define multi-step approval workflows visually, and track every request from submission to completion.

### 1.2 User Personas

#### Persona A: Sarah (End User)
- **Age:** 32
- **Role:** Marketing Manager
- **Goals:** Submit requests quickly, track status, get notified when resolved
- **Pain Points:** Complex IT systems, unclear approval status, slow response times
- **Tech Savviness:** Medium - comfortable with web apps, mobile-first

#### Persona B: Michael (IT Manager)
- **Age:** 45
- **Role:** IT Department Manager
- **Goals:** Ensure team productivity, meet SLA, manage workload distribution
- **Pain Points:** Manual assignment, difficulty tracking overdue cases, lack of visibility
- **Tech Savviness:** High - experienced with enterprise software

#### Persona C: Jessica (System Administrator)
- **Age:** 28
- **Role:** ServiceNow Administrator / BPM Lead
- **Goals:** Design forms/workflows without coding, maintain system hygiene
- **Pain Points:** Stakeholder requests for changes, testing new workflows
- **Tech Savviness:** Very High - power user, some coding knowledge

#### Persona D: David (IT Support Technician)
- **Age:** 26
- **Role:** Tier 1 IT Support
- **Goals:** Work through queue efficiently, document solutions, get quick info from users
- **Pain Points:** Incomplete request info, escalations, repetitive tasks
- **Tech Savviness:** Medium - knows the basics, learns quickly

---

## 2. Design Language

### 2.1 Color System

```css
:root {
  /* Primary Colors */
  --color-primary-50:  #EEF2FF;   /* Lightest - backgrounds */
  --color-primary-100: #E0E7FF;  /* Light - hover states */
  --color-primary-200: #C7D2FE;  /* Borders */
  --color-primary-500: #4F46E5;  /* Main - buttons, links */
  --color-primary-600: #4338CA;  /* Hover - darker */
  --color-primary-700: #3730A3;  /* Active - darkest */

  /* Secondary Colors */
  --color-secondary-50:  #ECFDF5;
  --color-secondary-100: #D1FAE5;
  --color-secondary-500: #10B981;
  --color-secondary-600: #059669;

  /* Accent (Warning/Pending) */
  --color-accent-50:  #FFFBEB;
  --color-accent-100: #FEF3C7;
  --color-accent-500: #F59E0B;
  --color-accent-600: #D97706;

  /* Danger */
  --color-danger-50:  #FEF2F2;
  --color-danger-100: #FEE2E2;
  --color-danger-500: #EF4444;
  --color-danger-600: #DC2626;

  /* Neutral */
  --color-gray-50:  #F9FAFB;
  --color-gray-100: #F3F4F6;
  --color-gray-200: #E5E7EB;
  --color-gray-300: #D1D5DB;
  --color-gray-400: #9CA3AF;
  --color-gray-500: #6B7280;
  --color-gray-600: #4B5563;
  --color-gray-700: #374151;
  --color-gray-800: #1F2937;
  --color-gray-900: #111827;

  /* Status Colors */
  --color-draft:        #6B7280;  /* Gray */
  --color-pending:      #F59E0B;  /* Amber */
  --color-approved:     #10B981;  /* Green */
  --color-rejected:     #EF4444;  /* Red */
  --color-in-progress: #3B82F6;  /* Blue */
  --color-completed:    #10B981;  /* Green */
  --color-closed:       #6B7280;  /* Gray */
}
```

### 2.2 Typography Scale

```css
:root {
  /* Font Families */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;

  /* Font Sizes */
  --text-xs:   0.75rem;   /* 12px - labels, badges */
  --text-sm:   0.875rem;  /* 14px - secondary text */
  --text-base: 1rem;      /* 16px - body text */
  --text-lg:   1.125rem;  /* 18px - subheadings */
  --text-xl:   1.25rem;   /* 20px - card titles */
  --text-2xl:  1.5rem;    /* 24px - page headings */
  --text-3xl:  1.875rem;  /* 30px - main headings */
  --text-4xl:  2.25rem;   /* 36px - hero text */

  /* Font Weights */
  --font-normal:   400;
  --font-medium:   500;
  --font-semibold: 600;
  --font-bold:     700;

  /* Line Heights */
  --leading-tight:  1.25;  /* Headings */
  --leading-normal: 1.5;   /* Body */
  --leading-relaxed: 1.75; /* Long text */
}
```

### 2.3 Spacing System

```css
:root {
  /* Base unit: 4px */
  --space-0:  0;
  --space-1:  0.25rem;   /* 4px */
  --space-2:  0.5rem;    /* 8px */
  --space-3:  0.75rem;   /* 12px */
  --space-4:  1rem;      /* 16px */
  --space-5:  1.25rem;   /* 20px */
  --space-6:  1.5rem;    /* 24px */
  --space-8:  2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */
  --space-20: 5rem;      /* 80px */
  --space-24: 6rem;      /* 96px */
}
```

### 2.4 Border & Shadow System

```css
:root {
  /* Border Radius */
  --radius-none: 0;
  --radius-sm:   0.125rem;  /* 2px */
  --radius-md:   0.25rem;   /* 4px */
  --radius-lg:   0.5rem;    /* 8px */
  --radius-xl:   0.75rem;   /* 12px */
  --radius-2xl:  1rem;      /* 16px */
  --radius-full: 9999px;    /* Pill shape */

  /* Shadows */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
```

### 2.5 Motion & Animation

```css
:root {
  /* Durations */
  --duration-fast:   150ms;  /* Micro-interactions */
  --duration-normal: 250ms;  /* Standard transitions */
  --duration-slow:   350ms;  /* Modals, drawers */
  --duration-slower: 500ms;  /* Page transitions */

  /* Easing */
  --ease-in:      cubic-bezier(0.4, 0, 1, 1);
  --ease-out:     cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out:  cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce:  cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* Animation Keyframes */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes slideInUp {
  from { 
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
```

### 2.6 Icon Library

**Icon Set:** Lucide Icons (MIT License)
- Consistent 24x24 grid
- 2px stroke weight
- Rounded line caps

**Common Icons Used:**
```
📋 Dashboard     →  layout-dashboard
📝 Forms         →  file-text
🔄 Workflows     →  git-branch
👥 Users         →  users
⚙️ Settings      →  settings
🔔 Notifications →  bell
🔍 Search       →  search
➕ Add          →  plus
✏️ Edit         →  pencil
🗑️ Delete       →  trash-2
✅ Approve      →  check-circle
❌ Reject       →  x-circle
⏰ Pending      →  clock
🚀 In Progress  →  loader
✓ Complete      →  check-circle-2
🔗 Assign       →  user-plus
💬 Comment      →  message-circle
📎 Attach       →  paperclip
🏷️ Tag          →  tag
📊 Stats        →  bar-chart
📁 Category     →  folder
🔎 Detail       →  eye
↩️ Undo         →  corner-up-left
🔄 Refresh      →  refresh-cw
```
---

## 3. User Roles & Permissions

### 3.1 Role Matrix

| Feature | End User | IT Staff | Manager | Admin |
|---------|:--------:|:--------:|:-------:|:-----:|
| Submit Request | ✅ | ✅ | ✅ | ✅ |
| View Own Requests | ✅ | ✅ | ✅ | ✅ |
| View Team Requests | ❌ | ✅* | ✅ | ✅ |
| View All Requests | ❌ | ❌ | ❌ | ✅ |
| Approve/Reject | ❌ | ❌ | ✅ | ✅ |
| Assign Cases | ❌ | ❌ | ✅ | ✅ |
| Update Case Status | ❌ | ✅ | ✅ | ✅ |
| Add Comments | ✅ | ✅ | ✅ | ✅ |
| Create Forms | ❌ | ❌ | ❌ | ✅ |
| Edit Forms | ❌ | ❌ | ❌ | ✅ |
| Create Workflows | ❌ | ❌ | ❌ | ✅ |
| Edit Workflows | ❌ | ❌ | ❌ | ✅ |
| Manage Users | ❌ | ❌ | ❌ | ✅ |
| View Reports | ❌ | ❌ | ✅ | ✅ |
| System Settings | ❌ | ❌ | ❌ | ✅ |

*IT Staff can view requests assigned to them or their team

### 3.2 Role Definitions

```typescript
enum UserRole {
  END_USER   = 'end_user',
  IT_STAFF   = 'it_staff', 
  MANAGER    = 'manager',
  ADMIN      = 'admin'
}

interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department?: string;
  managerId?: string;      // For org hierarchy
  teamId?: string;          // For IT team grouping
  avatar?: string;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.3 Default Users (Seed Data)

| Email | Password | Role | Department |
|-------|----------|------|------------|
| admin@company.com | Admin123! | Admin | IT |
| manager@company.com | Manager123! | Manager | Marketing |
| it_lead@company.com | ITLead123! | Manager | IT |
| alex@company.com | Alex123! | IT Staff | IT |
| sarah@company.com | Sarah123! | IT Staff | IT |
| john@company.com | John123! | End User | Marketing |
| mary@company.com | Mary123! | End User | HR |

---

## 4. Core Data Models

### 4.1 Entity Relationship Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    USER      │     │ FORM_DEFINITION│   │WORKFLOW_DEFN │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id           │     │ id           │     │ id           │
│ email        │     │ name          │     │ name         │
│ firstName    │     │ description   │     │ steps[]      │
│ lastName     │     │ elements[]    │     └──────────────┘
│ role         │     │ workflowId    │            │
│ department   │     │ createdBy     │            │
│ managerId    │     │ isActive      │            │
│ teamId       │     │ createdAt     │            │
└──────┬───────┘     └───────────────┘            │
       │                    │                      │
       │                    │                      │
       ▼                    ▼                      ▼
┌──────────────────────────────────────────────────────┐
│                  SERVICE_REQUEST                      │
├──────────────────────────────────────────────────────┤
│ id               │ Request ID (SR-2024-00001)        │
│ formId           │ Reference to form                 │
│ requesterId      │ User who submitted                │
│ assigneeId       │ IT staff handling                 │
│ status           │ Current status                     │
│ priority         │ low/medium/high/urgent             │
│ currentStep      │ Workflow step number               │
│ formData         │ Dynamic form field values         │
│ history[]        │ Audit trail                        │
│ comments[]       │ Discussion thread                  │
│ createdAt        │ Submission time                    │
│ updatedAt        │ Last modification                  │
│ completedAt      │ Resolution time                     │
└──────────────────────────────────────────────────────┘
```

### 4.2 TypeScript Interfaces

```typescript
// ==================== USER ====================
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department?: string;
  managerId?: string;
  teamId?: string;
  avatar?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

enum UserRole {
  END_USER = 'end_user',
  IT_STAFF = 'it_staff',
  MANAGER = 'manager',
  ADMIN = 'admin'
}

// ==================== FORM BUILDER ====================
interface FormDefinition {
  id: string;
  name: string;
  description: string;
  icon?: string;
  elements: FormElement[];
  workflowId: string;
  createdBy: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface FormElement {
  id: string;
  type: FormElementType;
  fieldName: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
  options?: SelectOption[];        // For select, multiselect
  validation?: ValidationRule;
  required: boolean;
  showInList: boolean;              // Show in request list view
  searchable: boolean;             // Include in global search
  width: 'full' | 'half' | 'third'; // Layout width
  conditionalLogic?: ConditionalRule[];
  metadata?: Record<string, any>;
}

type FormElementType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'date'
  | 'datetime'
  | 'file'
  | 'user'
  | 'department'
  | 'priority'
  | 'category'
  | 'heading'
  | 'divider'
  | 'paragraph';

interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

interface ValidationRule {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  customValidation?: string; // Custom JS validation function
}

interface ConditionalRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
  action: 'show' | 'hide' | 'require' | 'disable';
}

// ==================== WORKFLOW ====================
interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowStep {
  id: string;
  order: number;
  name: string;
  type: WorkflowStepType;
  description?: string;
  
  // Assignment
  assigneeType: AssigneeType;
  assigneeId?: string;            // Specific user
  assigneeRole?: UserRole;        // Role-based assignment
  assigneeField?: string;         // Dynamic from form field
  assigneeTeam?: string;          // Team-based assignment
  
  // Approval Settings
  requiredApprovals: number;      // 1 = single, 2+ = unanimous
  canReject: boolean;
  rejectionBehavior: RejectionBehavior;
  rejectionTargetStep?: number;   // Which step to return to
  
  // Notifications
  notifyOnAssign: boolean;
  notifyOnComplete: boolean;
  notifyOnOverdue: boolean;
  emailTemplate?: string;
  
  // SLA
  dueInDays?: number;
  dueInHours?: number;
  reminderDays?: number;
  
  // Metadata
  icon?: string;
  color?: string;
}

type WorkflowStepType = 
  | 'start'
  | 'approval'
  | 'assignment'
  | 'action'
  | 'notification'
  | 'condition'
  | 'end';

type AssigneeType = 
  | 'specific_user'
  | 'form_field'
  | 'role'
  | 'team'
  | 'requester_manager'
  | 'previous_approver';

type RejectionBehavior = 
  | 'return_to_requester'
  | 'return_to_step'
  | 'cancel_request'
  | 'reassign';

// ==================== SERVICE REQUEST ====================
interface ServiceRequest {
  id: string;
  requestNumber: string;         // Human readable: SR-2024-00001
  formId: string;
  formData: Record<string, any>;
  
  // People
  requesterId: string;
  assigneeId?: string;
  teamId?: string;
  
  // Status
  status: RequestStatus;
  previousStatus?: RequestStatus;
  priority: Priority;
  currentStep: number;
  
  // Workflow
  workflowHistory: WorkflowHistoryEntry[];
  currentStepStartedAt: string;
  
  // Communication
  comments: Comment[];
  
  // Tracking
  dueAt?: string;
  completedAt?: string;
  firstResponseAt?: string;
  resolutionDays?: number;
  
  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  
  // Metadata
  tags?: string[];
  source?: 'web' | 'email' | 'mobile' | 'api';
  ipAddress?: string;
}

type RequestStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'in_progress'
  | 'pending_review'
  | 'completed'
  | 'closed'
  | 'cancelled';

type Priority = 'low' | 'medium' | 'high' | 'urgent';

interface WorkflowHistoryEntry {
  stepId: string;
  stepName: string;
  action: 'enter' | 'approve' | 'reject' | 'complete' | 'cancel';
  performedBy: string;
  performedAt: string;
  comment?: string;
  previousAssignee?: string;
  newAssignee?: string;
}

interface Comment {
  id: string;
  authorId: string;
  content: string;
  isInternal: boolean;          // Internal notes not visible to requester
  createdAt: string;
  updatedAt?: string;
  mentions?: string[];           // User IDs mentioned
}

// ==================== NOTIFICATIONS ====================
interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  requestId?: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

type NotificationType =
  | 'request_submitted'
  | 'request_approved'
  | 'request_rejected'
  | 'assigned_to_you'
  | 'case_updated'
  | 'case_completed'
  | 'case_closed'
  | 'comment_added'
  | 'overdue_reminder'
  | 'status_change';
```

---

## 5. Detailed User Flows

### 5.1 End User Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        END USER COMPLETE FLOW                            │
└─────────────────────────────────────────────────────────────────────────┘

[1. HOME - My Dashboard]
        │
        ├── "New Request" Button ─────────────────┐
        │                                           │
        ▼                                           │
[2. SELECT FORM TYPE]                              │
        │                                           │
        │  ┌─────────────────────────────────┐     │
        │  │ 📋 IT Service Request          │     │
        │  │    Hardware, Software, Access   │     │
        │  ├─────────────────────────────────┤     │
        │  │ 📋 HR Leave Request             │     │
        │  │    Annual, Sick, Personal       │     │
        │  ├─────────────────────────────────┤     │
        │  │ 📋 Facilities Request           │     │
        │  │    Maintenance, Room Booking    │     │
        │  ├─────────────────────────────────┤     │
        │  │ 📋 + Create Custom Request      │     │
        │  └─────────────────────────────────┘     │
        │                                           │
        ▼                                           │
[3. FILL FORM]                                      │
        │                                           │
        │  Step 1 of 2: Request Details             │
        │  ────────────────────────────             │
        │  Request Title *                          │
        │  [________________________]               │
        │                                           │
        │  Category *                               │
        │  [________________________▼]              │
        │                                           │
        │  Priority                                 │
        │  ○ Low  ● Medium  ○ High  ○ Urgent       │
        │                                           │
        │  Description *                            │
        │  [_________________________________]       │
        │  [_________________________________]       │
        │                                           │
        │  [Back]              [Next →]              │
        │                                           │
        ▼                                           │
[4. REVIEW & SUBMIT]                                │
        │                                           │
        │  Step 2 of 2: Review                      │
        │  ────────────────────────────             │
        │                                           │
        │  ┌─────────────────────────────────┐     │
        │  │ Request Title                   │     │
        │  │ VPN Access for New Employee    │     │
        │  ├─────────────────────────────────┤     │
        │  │ Category                       │     │
        │  │ Network/VPN Access             │     │
        │  ├─────────────────────────────────┤     │
        │  │ Priority                       │     │
        │  │ High                           │     │
        │  ├─────────────────────────────────┤     │
        │  │ Description                    │     │
        │  │ Please setup VPN access for... │     │
        │  └─────────────────────────────────┘     │
        │                                           │
        │  ⏰ Estimated completion: 2-3 days       │
        │                                           │
        │  [← Edit]          [Submit Request]      │
        │                                           │
        ▼                                           │
[5. CONFIRMATION]                                   │
        │                                           │
        │  ✓ Request Submitted Successfully!        │
        │                                           │
        │  Your request number is:                 │
        │  ┌─────────────────────────────────┐     │
        │  │    SR-2024-00042               │     │
        │  └─────────────────────────────────┘     │
        │                                           │
        │  📧 Notification sent to:                │
        │     • You (confirmation)                  │
        │     • Your manager (for approval)         │
        │                                           │
        │  [View My Requests]  [Submit Another]     │
        │                                           │
        ▼                                           │
[6. TRACK STATUS]                                   │
        │                                           │
        │  ┌─────────────────────────────────┐     │
        │  │ SR-2024-00042           HIGH   │     │
        │  │ VPN Access for New Employee   │     │
        │  │                                │     │
        │  │ ● Submitted     [✓]            │     │
        │  │ ○ Manager Appr  [ ]            │     │
        │  │ ○ IT Processing[ ]            │     │
        │  │ ○ Completed     [ ]            │     │
        │  │                                │     │
        │  │ Last update: 2 hours ago       │     │
        │  │ Assigned to: Alex (IT)         │     │
        │  │                                │     │
        │  │ [💬 Add Comment] [📋 View Details]│   │
        │  └─────────────────────────────────┘     │
        │                                           │
        ▼                                           │
[7. CONFIRM COMPLETION (When Pending)]              │
        │                                           │
        │  ┌─────────────────────────────────┐     │
        │  │ 🎉 Case SR-2024-00042           │     │
        │  │ "VPN Access Setup" has been    │     │
        │  │ marked as complete by IT.      │     │
        │  │                                │     │
        │  │ Please verify the work is      │     │
        │  │ satisfactory.                  │     │
        │  │                                │     │
        │  │ IT Notes:                       │     │
        │  │ VPN credentials sent to your   │     │
        │  │ company email.                 │     │
        │  │                                │     │
        │  │ Is this request complete?      │     │
        │  │                                │     │
        │  │ [❌ Not Satisfied]  [✅ Yes, Complete]│ │
        │  └─────────────────────────────────┘     │
        │                                           │
        ▼                                           │
[8. RATE & CLOSE]                                   │
        │                                           │
        │  How was your experience?                │
        │  ⭐⭐⭐⭐⭐                                    │
        │                                           │
        │  Optional feedback:                      │
        │  [_________________________________]      │
        │                                           │
        │  [Submit Feedback & Close]                │
        │                                           │
        ▼                                           │
      [END]
```

### 5.2 Manager Approval Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        MANAGER APPROVAL FLOW                             │
└─────────────────────────────────────────────────────────────────────────┘

[1. DASHBOARD - Pending Approvals Badge: 3]
        │
        ├── Click "Pending Approvals" ─────────────┐
        │                                           │
        ▼                                           │
[2. APPROVALS LIST]                                 │
        │                                           │
        │  Pending Your Approval (3)               │
        │  ────────────────────────────────         │
        │                                           │
        │  ┌─────────────────────────────────┐     │
        │  │ SR-2024-00042         ⭐ HIGH  │     │
        │  │ John D. - VPN Access           │     │
        │  │ Submitted: 2 hours ago         │     │
        │  │ [👁 Preview] [✓ Approve] [✗ Reject]│ │
        │  └─────────────────────────────────┘     │
        │                                           │
        │  ┌─────────────────────────────────┐     │
        │  │ SR-2024-00043         ● MED   │     │
        │  │ Mary S. - New Laptop           │     │
        │  │ Submitted: 5 hours ago         │     │
        │  │ [👁 Preview] [✓ Approve] [✗ Reject]│ │
        │  └─────────────────────────────────┘     │
        │                                           │
        ▼                                           │
[3. REVIEW REQUEST DETAIL]                         │
        │                                           │
        │  Request: SR-2024-00042                  │
        │  ──────────────────────────────────────── │
        │                                           │
        │  Submitted by: John Davis (Marketing)    │
        │  On: Jan 15, 2024 at 10:30 AM            │
        │                                           │
        │  ──────────────────────────────────────── │
        │                                           │
        │  REQUEST DETAILS                         │
        │  ──────────────────────────────────────── │
        │                                           │
        │  Title: VPN Access for New Employee       │
        │  Category: Network/VPN Access             │
        │  Priority: High                          │
        │                                           │
        │  Description:                            │
        │  We hired a new marketing manager who     │
        │  needs VPN access to work from home.      │
        │  Please setup credentials ASAP.           │
        │                                           │
        │  Justification:                           │
        │  New hire starts Monday, needs access     │
        │  to all marketing shared drives and        │
        │  campaign tools.                          │
        │                                           │
        │  ──────────────────────────────────────── │
        │                                           │
        │  💬 Comments (2)                          │
        │  ──────────────────────────────────────── │
        │  [Show Comments ▼]                        │
        │                                           │
        │  ──────────────────────────────────────── │
        │                                           │
        │  📋 Activity History                      │
        │  ──────────────────────────────────────── │
        │  • Jan 15, 10:30 AM - John submitted      │
        │  • Jan 15, 10:31 AM - Notification sent   │
        │                                           │
        │  [← Back to List]                         │
        │                                           │
        │  ┌───────────────┐ ┌───────────────────┐ │
        │  │  ✗ REJECT     │ │   ✓ APPROVE       │ │
        │  └───────────────┘ └───────────────────┘ │
        │                                           │
        ▼                                           │
[4. APPROVE - Confirmation]                         │
        │                                           │
        │  ✓ Request Approved!                      │
        │                                           │
        │  The request has been forwarded to:       │
        │  IT Department                            │
        │                                           │
        │  They have been notified to assign a       │
        │  technician and begin work.                │
        │                                           │
        │  [View Request]  [View All Approvals]     │
        │                                           │
        ▼                                           │
      [END]
```

### 5.3 IT Staff Case Handling Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        IT STAFF CASE FLOW                                │
└─────────────────────────────────────────────────────────────────────────┘

[1. DASHBOARD - My Queue: 5 cases]
        │
        ├── "My Cases" Section ─────────────────────┐
        │                                           │
        ▼                                           │
[2. CASE QUEUE]                                     │
        │                                           │
        │  My Queue                        [Filter▼]│
        │  ──────────────────────────────────────── │
        │                                           │
        │  ┌─────────────────────────────────┐     │
        │  │ ⭐ SR-2024-00042      VPN Access │     │
        │  │ 👤 John D.  │ ⭐ HIGH │ ⏱️ 2h    │     │
        │  │ Assigned: 1 hour ago            │     │
        │  │ [→ Work on Case]                 │     │
        │  └─────────────────────────────────┘     │
        │                                           │
        │  ┌─────────────────────────────────┐     │
        │  │ SR-2024-00041       Email Issue │     │
        │  │ 👤 Sarah M. │ ● MED │ ⏱️ 30m   │     │
        │  │ Assigned: 3 hours ago           │     │
        │  │ [→ Work on Case]                 │     │
        │  └─────────────────────────────────┘     │
        │                                           │
        ▼                                           │
[3. CASE DETAIL - Work in Progress]                 │
        │                                           │
        │  Case: SR-2024-00042                      │
        │  Status: 🔵 In Progress                   │
        │  ──────────────────────────────────────── │
        │                                           │
        │  Customer Info                            │
        │  ──────────────────────────────────────── │
        │  Name: John Davis                         │
        │  Email: john.davis@company.com           │
        │  Department: Marketing                   │
        │  Phone: +1 555-0123                       │
        │                                           │
        │  Request Details                          │
        │  ──────────────────────────────────────── │
        │  Title: VPN Access for New Employee       │
        │  Category: Network/VPN Access             │
        │  Priority: High                          │
        │  Received: Jan 15, 10:30 AM              │
        │  Due: Jan 17, 10:30 AM (SLA: 2 days)    │
        │                                           │
        │  Description:                             │
        │  "We hired a new marketing manager who    │
        │   needs VPN access to work from home."    │
        │                                           │
        │  ──────────────────────────────────────── │
        │                                           │
        │  📝 Internal Notes (Not visible to user) │
        │  ──────────────────────────────────────── │
        │  [Add internal note...]                  │
        │                                           │
        │  Jan 15, 11:00 AM - Alex: "Started..."   │
        │                                           │
        │  ──────────────────────────────────────── │
        │                                           │
        │  💬 Comments                              │
        │  ──────────────────────────────────────── │
        │  Jan 15, 10:35 AM - IT Lead: "Assigned   │
        │  to Alex for handling"                    │
        │                                           │
        │  [Add comment to customer...]             │
        │                                           │
        │  ──────────────────────────────────────── │
        │                                           │
        │  Update Status:                          │
        │  ┌─────────────────────────────────┐     │
        │  │ [Needs More Info ▼]              │     │
