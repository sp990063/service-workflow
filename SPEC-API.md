---

## 10. API Design

### 10.1 RESTful Endpoints

```
Base URL: /api/v1

==========================================
AUTHENTICATION
==========================================
POST   /auth/login              # Login with email/password
POST   /auth/logout             # Logout current user
GET    /auth/me                 # Get current user profile
POST   /auth/refresh             # Refresh JWT token
POST   /auth/forgot-password     # Request password reset
POST   /auth/reset-password      # Reset password with token

==========================================
USERS (Admin only for write operations)
==========================================
GET    /users                   # List all users (paginated)
GET    /users/:id               # Get user details
POST   /users                   # Create new user
PUT    /users/:id               # Update user
DELETE /users/:id               # Deactivate user
GET    /users/:id/requests      # Get user's requests
GET    /users/:id/cases         # Get assigned cases (for IT staff)

==========================================
FORMS (Admin only)
==========================================
GET    /forms                   # List all form definitions
GET    /forms/:id               # Get form with elements
POST   /forms                   # Create new form
PUT    /forms/:id               # Update form
DELETE /forms/:id               # Soft delete form
POST   /forms/:id/duplicate     # Duplicate form
GET    /forms/:id/submissions   # List submissions for form
GET    /forms/:id/analytics     # Get form analytics

==========================================
WORKFLOWS (Admin only)
==========================================
GET    /workflows               # List all workflows
GET    /workflows/:id           # Get workflow with steps
POST   /workflows               # Create new workflow
PUT    /workflows/:id           # Update workflow
DELETE /workflows/:id           # Soft delete workflow
POST   /workflows/:id/validate  # Validate workflow logic

==========================================
SERVICE REQUESTS
==========================================
GET    /requests                # List requests (filtered by role)
GET    /requests/:id           # Get request details
POST   /requests                # Create/submit new request
PUT    /requests/:id            # Update request (status changes)
DELETE /requests/:id            # Cancel request (if allowed)

GET    /requests/:id/comments   # Get comments thread
POST   /requests/:id/comments   # Add comment
PUT    /requests/:id/comments/:commentId  # Update comment
DELETE /requests/:id/comments/:commentId  # Delete comment

POST   /requests/:id/approve     # Approve request
POST   /requests/:id/reject      # Reject request
POST   /requests/:id/assign      # Assign to staff/team
POST   /requests/:id/complete    # Mark as complete
POST   /requests/:id/confirm     # User confirms completion
POST   /requests/:id/rate        # Rate and close

GET    /requests/:id/history     # Get workflow history
GET    /requests/:id/audit       # Get audit log

==========================================
DASHBOARD & REPORTS
==========================================
GET    /dashboard/user          # End user dashboard data
GET    /dashboard/manager       # Manager dashboard data
GET    /dashboard/it            # IT staff dashboard data
GET    /dashboard/admin         # Admin dashboard data

GET    /reports/volume          # Request volume over time
GET    /reports/resolution      # Resolution time metrics
GET    /reports/sla             # SLA compliance report
GET    /reports/workload        # Team workload distribution
GET    /reports/satisfaction    # User satisfaction scores

==========================================
NOTIFICATIONS
==========================================
GET    /notifications           # Get user's notifications
PUT    /notifications/:id/read  # Mark as read
PUT    /notifications/read-all # Mark all as read
DELETE /notifications/:id      # Delete notification

==========================================
SYSTEM (Admin only)
==========================================
GET    /settings                # Get system settings
PUT    /settings                # Update settings
GET    /departments             # List departments
POST   /departments             # Create department
GET    /teams                   # List IT teams
POST   /teams                   # Create team
GET    /categories              # List request categories
POST   /categories              # Create category
```

### 10.2 Request/Response Examples

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@company.com",
  "password": "password123"
}
```

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g...",
    "user": {
      "id": "usr_abc123",
      "email": "john@company.com",
      "firstName": "John",
      "lastName": "Davis",
      "role": "end_user",
      "department": "Marketing",
      "avatar": null
    },
    "expiresIn": 86400
  }
}
```

#### Create Service Request
```http
POST /api/v1/requests
Content-Type: application/json
Authorization: Bearer <token>

{
  "formId": "frm_it_service",
  "priority": "high",
  "formData": {
    "title": "VPN Access for New Employee",
    "category": "vpn_access",
    "description": "Please setup VPN access for new hire starting Monday..."
  }
}
```

```json
{
  "success": true,
  "data": {
    "id": "req_xyz789",
    "requestNumber": "SR-2024-00042",
    "formId": "frm_it_service",
    "status": "pending_approval",
    "priority": "high",
    "requesterId": "usr_abc123",
    "currentStep": 1,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid",
    "details": [
      { "field": "title", "message": "Title is required", "code": "REQUIRED" }
    ]
  }
}
```

### 10.3 WebSocket Events (Real-time)

```typescript
interface WebSocketEvent {
  type: 'notification' | 'request_update' | 'comment_added' | 'status_change';
  payload: any;
  timestamp: string;
}

const WS_EVENTS = {
  NOTIFICATION_NEW: 'notification:new',
  REQUEST_UPDATED: 'request:updated',
  COMMENT_ADDED: 'request:comment_added',
  STATUS_CHANGED: 'request:status_changed',
  ASSIGNMENT_NEW: 'request:assigned',
  SUBSCRIBE_REQUEST: 'request:subscribe',
  UNSUBSCRIBE_REQUEST: 'request:unsubscribe',
};
```

---

## 11. Database Schema

### 11.1 localStorage Structure

```typescript
const STORAGE_KEYS = {
  AUTH_TOKEN: 'sf_auth_token',
  REFRESH_TOKEN: 'sf_refresh_token',
  CURRENT_USER: 'sf_current_user',
  USERS: 'sf_users',
  FORMS: 'sf_forms',
  WORKFLOWS: 'sf_workflows',
  REQUESTS: 'sf_requests',
  NOTIFICATIONS: 'sf_notifications',
  UI_PREFERENCES: 'sf_ui_prefs',
  AUDIT_LOG: 'sf_audit_log',
};
```

### 11.2 Indexes

```typescript
const INDEXES = {
  requests: {
    'status_created': (req) => `${req.status}_${req.createdAt}`,
    'requester_created': (req) => `${req.requesterId}_${req.createdAt}`,
    'assignee_status': (req) => `${req.assigneeId}_${req.status}`,
    'priority_due': (req) => `${req.priority}_${req.dueAt}`,
  },
  users: {
    'role': (user) => user.role,
    'department': (user) => user.department || '',
  },
};
```

---

## 12. Component Inventory

### 12.1 Atomic Components

| Component | States | Props |
|-----------|--------|-------|
| **Button** | default, hover, active, disabled, loading | variant, size, icon?, fullWidth? |
| **Input** | default, focus, error, disabled, readonly | type, label, placeholder, error |
| **Select** | default, open, focus, error, disabled | options, searchable?, multiSelect? |
| **Checkbox** | unchecked, checked, indeterminate, disabled | label, checked |
| **Radio** | unselected, selected, disabled | options, name |
| **Badge** | with color variants | variant, size, dot? |
| **Avatar** | with-image, initials, placeholder | src?, name, size |
| **Icon** | static | name, size, color |
| **Spinner** | spinning | size, color |
| **Progress** | determinate, indeterminate | value, max |

### 12.2 Molecular Components

| Component | Description |
|-----------|-------------|
| **FormField** | Label + Input + Error wrapper |
| **StatusBadge** | Colored badge for request status |
| **PriorityBadge** | Priority level indicator |
| **UserAvatar** | Avatar with tooltip |
| **TimeAgo** | Relative time display |
| **EmptyState** | Icon + message + action |
| **Toast** | Notification popup |
| **ConfirmDialog** | Modal for destructive actions |

### 12.3 Organism Components

| Component | Description |
|-----------|-------------|
| **Navbar** | Top navigation |
| **Sidebar** | Left navigation |
| **DataTable** | Sortable, filterable table |
| **RequestCard** | Request summary card |
| **WorkflowTimeline** | Progress timeline |
| **FormRenderer** | Dynamic form from definition |

---

## 13. Error Handling

### 13.1 Error Categories

| Category | HTTP | User Message |
|----------|------|--------------|
| VALIDATION_ERROR | 400 | "Please check your input" |
| UNAUTHORIZED | 401 | "Please log in again" |
| FORBIDDEN | 403 | "You don't have permission" |
| NOT_FOUND | 404 | "Item not found" |
| SERVER_ERROR | 500 | "Something went wrong" |

### 13.2 Edge Cases

```typescript
const EDGE_CASES = {
  emptyRequestList: { title: 'No requests yet', action: 'Create Request' },
  sessionExpired: { title: 'Session Expired', action: 'Log In' },
  approachingDeadline: { warning: 'SLA deadline soon' },
  overdueRequest: { warning: 'Request is overdue' },
  unsavedChanges: { title: 'Unsaved Changes' },
  circularWorkflow: { error: 'Circular reference detected' },
};
```

---

## 14. Performance Requirements

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Time to Interactive | < 3.0s |
| Initial Bundle Size | < 250KB |
| API Response (list) | < 200ms |
| API Response (detail) | < 100ms |

---

## 15. Security

### 15.1 Permissions

```typescript
const PERMISSIONS = {
  canSubmitRequest: (user) => true,
  canViewTeamRequests: (user) => ['it_staff', 'manager'].includes(user.role),
  canApprove: (user) => ['manager', 'admin'].includes(user.role),
  canCreateForm: (user) => user.role === 'admin',
};
```

### 15.2 Rate Limits

```typescript
const RATE_LIMITS = {
  login: { max: 5, window: '15m' },
  submitRequest: { max: 10, window: '1h' },
  apiGeneral: { max: 100, window: '1m' },
};
```

---

*End of Specification*
