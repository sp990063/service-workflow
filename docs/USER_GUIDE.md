# ServiceFlow - User Guide

## 📖 Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [Form Builder](#form-builder)
4. [Workflow Designer](#workflow-designer)
5. [Forms & Workflows List](#forms--workflows-list)
6. [Workflow Player](#workflow-player)
7. [Admin Panel](#admin-panel)
8. [Roles & Permissions](#roles--permissions)

---

## Getting Started

### Login

1. Open the application URL
2. Enter your email and password
3. Click **Login**

### Default Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | password123 |
| Manager | manager@example.com | password123 |
| Employee | employee@example.com | password123 |

> ⚠️ **Important**: Change your password after first login!

---

## Dashboard

The dashboard shows:
- **Total Forms** - Number of forms you have access to
- **Total Workflows** - Number of workflows
- **Pending Approvals** - Approvals waiting for your action
- **Completed** - Successfully completed submissions

### Quick Actions

From the dashboard, you can quickly:
- **+ New Form** - Create a new form
- **⚡ New Workflow** - Create a new workflow
- **👤 Manage Users** (Admin only) - Manage user accounts

---

## Form Builder

### Creating a Form

1. Click **+ New Form** or go to **Form Builder**
2. Enter a **Form Name** (e.g., "Leave Request")
3. Drag elements from the left palette to the canvas

### Available Form Elements

| Element | Use For |
|---------|---------|
| **Single Line Text** | Names, short answers |
| **Multi Line Text** | Long text, descriptions |
| **Email** | Email addresses (validated) |
| **Number** | Numeric values |
| **Date** | Single date selection |
| **Date Range** | Start and end dates |
| **Time** | Time selection |
| **Select/Dropdown** | Choose from options |
| **Checkbox** | Yes/No questions |
| **Radio** | Single choice from options |
| **File Upload** | Attach files |

### Editing Element Properties

1. **Click** on an element on the canvas
2. The **Properties Panel** opens on the right
3. Configure:
   - **Label** - Display text
   - **Placeholder** - Hint text
   - **Required** - Make field mandatory
   - **Validation** - Set min/max values

### Saving a Form

1. Click **Save** button
2. The form will appear in your **Forms List**

---

## Workflow Designer

### Creating a Workflow

1. Click **⚡ New Workflow** or go to **Workflow Designer**
2. Enter a **Workflow Name** (e.g., "Leave Approval")
3. Add nodes from the palette

### Workflow Nodes

| Node | Description |
|------|-------------|
| **Start** | Entry point (required) |
| **End** | Exit point (required) |
| **Task** | Assignable work item |
| **Form** | Collect form data |
| **Approval** | Require approval decision |
| **Condition** | Branch based on rules |
| **Parallel** | Split into multiple paths |
| **Join** | Wait for parallel branches |
| **Sub-Workflow** | Call another workflow |
| **Script** | Custom JavaScript logic |
| **Set Value** | Set variable value |
| **Transform** | Transform data format |

### Connecting Nodes

1. **Click** on a node's output connector (right side)
2. **Drag** to another node's input connector (left side)
3. Release to create connection

### Configuring Nodes

**Task Node:**
- Label: Display name
- Assignee Role: Who handles this (e.g., MANAGER)

**Form Node:**
- Select form from dropdown
- Links to a pre-created form

**Approval Node:**
- Label: Display name
- Assignee Role: Who approves

**Condition Node:**
- Field: What to check
- Operator: equals, greater than, less than
- Value: Comparison value

### Saving Workflow

1. Click **Save Workflow** button
2. The workflow will appear in your **Workflows List**

---

## Forms & Workflows List

### Viewing Forms

1. Click **Forms** in the navigation
2. See all forms you have access to
3. Each form shows:
   - Name
   - Number of elements
   - Last updated date
   - Actions: Fill Form, Edit, Delete

### Viewing Workflows

1. Click **Workflows** in the navigation
2. See all workflows
3. Each workflow shows:
   - Name
   - Number of nodes
   - Status (Active/Inactive)
   - Actions: Start, Edit, Delete

### Filling a Form

1. Go to **Forms List**
2. Click **Fill Form** on the desired form
3. Complete all required fields
4. Click **Submit**

---

## Workflow Player

### Starting a Workflow

1. Go to **Workflows List**
2. Click **Start** on the desired workflow
3. The workflow player opens

### Workflow Player Interface

The player shows:
- **Current Step** - What step you're on
- **Progress** - Steps completed
- **Form** - Data entry if form step
- **Buttons** - Next, Approve, Reject, etc.

### Completing Steps

**Manual Step:**
1. View the task details
2. Click **Complete** or **Next Step**

**Form Step:**
1. Fill in the form
2. Click **Submit & Continue**

**Approval Step:**
1. Review the request
2. Click **Approve** or **Reject**
3. Add optional comment

### Parallel Approval

When a workflow has parallel branches:
- Multiple approvers can work simultaneously
- All must complete before proceeding
- Progress shows both branches

---

## Admin Panel

### Accessing Admin Panel

Only users with **Admin** role can access:
1. Click **👤 Manage Users** on dashboard
2. Or navigate to `/admin/users`

### User Management

**View Users:**
- See all users in the system
- View their role and status

**Change User Role:**
1. Find the user row
2. Click the **Role** dropdown
3. Select new role:
   - **USER** - Regular employee
   - **MANAGER** - Can approve and manage workflows
   - **ADMIN** - Full system access

**Role Change Effects:**
- Role changes take effect immediately
- User may need to logout/login for full effect

---

## Roles & Permissions

### Role Capabilities

| Capability | Admin | Manager | User |
|------------|-------|---------|------|
| View Dashboard | ✅ | ✅ | ✅ |
| Create Forms | ✅ | ✅ | ✅ |
| Edit Own Forms | ✅ | ✅ | ✅ |
| Delete Own Forms | ✅ | ✅ | ✅ |
| Create Workflows | ✅ | ✅ | ✅ |
| Edit Own Workflows | ✅ | ✅ | ✅ |
| Delete Own Workflows | ✅ | ✅ | ✅ |
| Execute Workflows | ✅ | ✅ | ✅ |
| Approve/Reject | ✅ | ✅ | ✅ |
| Manage Users | ✅ | ❌ | ❌ |
| Manage Roles | ✅ | ❌ | ❌ |

### Scopes

- **Global**: System-wide permissions (Admin)
- **Project**: Per-resource permissions (Most users)
- **Entity**: Single item permissions (Specific cases)

---

## Tips & Best Practices

### Forms

1. **Use clear labels** - What should the user enter?
2. **Mark required fields** - Only mark truly required fields
3. **Add placeholder text** - Guide users on expected format
4. **Use validation** - Set min/max for numbers, patterns for text

### Workflows

1. **Always start with Start node**
2. **Always end with End node**
3. **Test before deploying** - Use the player to test
4. **Clear approval instructions** - Help approvers decide
5. **Use conditions wisely** - Keep rules simple

### Security

1. **Don't share accounts** - Each user should have their own
2. **Use strong passwords** - Minimum 8 characters
3. **Approve only legitimate requests** - Verify before approving
4. **Report suspicious activity** - To your administrator

---

## Common Tasks

### Request Leave

1. Go to **Workflows**
2. Start **Leave Request** workflow
3. Fill the form (dates, reason)
4. Submit
5. Wait for manager approval
6. Receive notification of approval/rejection

### Create Approval Process

1. Go to **Workflow Designer**
2. Create new workflow
3. Add: Start → Form (Request) → Approval (Manager) → End
4. Connect nodes
5. Save workflow
6. Start testing!

---

## Need Help?

- **Contact your administrator** for access issues
- **Check workflow status** in Workflows List
- **Contact IT Support** for technical problems

---

**Version**: 1.0.0  
**Last Updated**: April 2026
