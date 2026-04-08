# User Workspace Design - Service Workflow

**Date:** 2026-04-09
**Status:** Approved

---

## Overview

Design a user-friendly "My Workspace" experience for regular users who can be:
- **Requesters** - Submit workflow requests
- **Approvers** - Approve/reject tasks assigned to them

---

## User Flow

1. **Login** → Lands on "My Workspace" dashboard
2. **My Workspace** shows:
   - Left sidebar navigation
   - "My Tasks To Approve" (pending approvals)
   - "My Applications" (submitted requests)
3. User can click into any instance to:
   - View details
   - Approve/reject (if approver)
   - See approval history
   - Participate in discussion threads

---

## Phase 1: My Workspace Basic Structure

### Layout
```
┌─────────────────────────────────────────────────────┐
│  ServiceFlow              [User Name] [Logout]     │
├──────────┬────────────────────────────────────────┤
│ 我的工作台 │                                        │
│ ─────────│   Welcome, [User Name]                  │
│ ☐ 我的待辦│                                        │
│ ☐ 我的申請│   [Stats: 3待審批 | 5審批中 | 2已完成]│
│          │                                        │
│ 其他功能  │   ─────────────────────────────         │
│ ─────────│   [Filter] [Sort ▼]                    │
│ 📋 Forms │   ┌────────────────────────────────┐   │
│ ⚙ WFs   │   │ WF-2024-001 | 請假申請          │   │
│ 📊 Stats │   │ 申請人: John | 狀態: 審批中     │   │
│          │   └────────────────────────────────┘   │
└──────────┴────────────────────────────────────────┘
```

### Features

1. **Left Sidebar Navigation**
   - 我的待辦 (My Tasks) - pending approvals
   - 我的申請 (My Applications) - submitted requests
   - Links to Forms, Workflows, Analytics

2. **Statistics Cards**
   - Count of pending approvals
   - Count of in-progress applications
   - Count of completed applications

3. **My Tasks To Approve**
   - List format
   - Columns: ID, Workflow Name, Applicant, Submitted Time, Status
   - Click to view details and approve/reject

4. **My Applications**
   - List format with sorting/filtering
   - Filter by: Status (All/Pending/In Progress/Completed/Rejected)
   - Sort by: Date (Newest/Oldest), Status
   - Columns: ID, Workflow Name, Submitted Time, Current Status

### Human-Readable Instance ID

Format: `WF-YYYY-NNN` (e.g., WF-2024-001)

- Display in UI for user reference
- System continues using UUID internally
- Backend: Add `displayId` field to workflow instances

---

## Phase 2: Discussion Thread + Detail View

### Instance Detail View

Access by clicking any instance (either from My Tasks or My Applications)

**Contents:**
1. **Header** - Instance ID, Workflow Name, Status badge
2. **Applicant Info** - Name, Email, Submission Date
3. **Form Data** - Read-only display of submitted form
4. **Approval History** - Timeline of all approvals
   - Who approved/rejected
   - When
   - Comments/notes
5. **Discussion Thread**
   - Thread-based comments
   - Reply to specific comments
   - @mention users to notify them
6. **Actions** (if approver)
   - Approve button
   - Reject button
   - Add comment option

### Multi-Approver Transparency

When multiple approvers are required:
- All approvers can see each other's status
- All approvers can see each other's decisions and comments (after they are submitted)
- Before an approver submits their decision, other approvers' pending decisions are hidden

---

## Technical Requirements

### Backend Changes

1. **Add displayId to WorkflowInstance**
   - Auto-generated: `WF-{year}-{sequentialNumber}`
   - Stored in database

2. **API Endpoints**
   - `GET /instances/my-pending` - Tasks assigned to current user to approve
   - `GET /instances/my-submitted` - Instances submitted by current user
   - `GET /instances/:id/thread` - Get discussion thread
   - `POST /instances/:id/thread` - Add comment
   - `POST /instances/:id/approve` - Approve
   - `POST /instances/:id/reject` - Reject

3. **Notification System**
   - When @mentioned, user receives notification
   - When status changes, requester is notified

### Frontend Changes

1. **My Workspace Component**
   - New page replacing dashboard for regular users
   - Admin keeps existing dashboard

2. **Instance Detail Component**
   - Read-only form display
   - Approval history timeline
   - Discussion thread UI
   - Approve/Reject buttons

3. **Discussion Component**
   - Thread display
   - Reply functionality
   - @mention autocomplete

---

## UX Principles

1. **Clear Status Indicators** - Color-coded badges
2. **Human-Readable IDs** - Easy to reference in communication
3. **Complete Information** - Users can make informed decisions
4. **Transparency** - Visibility into entire approval process
5. **Communication** - Built-in discussion for clarifications

---

## Implementation Order

1. Backend: Add displayId, new API endpoints
2. Frontend: My Workspace layout
3. Frontend: Instance detail view
4. Frontend: Discussion thread
5. Testing and polish
