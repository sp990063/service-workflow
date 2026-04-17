# API Endpoints Reference

## Base URL
```
http://localhost:3000/api
```

## Authentication

### POST /auth/login
Login with email/password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER"
  }
}
```

### POST /auth/register
Register a new user.

### GET /auth/profile
Get current user profile.

---

## Forms

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/forms` | List all forms |
| POST | `/forms` | Create a new form |
| GET | `/forms/:id` | Get form by ID |
| PUT | `/forms/:id` | Update form |
| DELETE | `/forms/:id` | Delete form |
| GET | `/forms/:id/versions` | Get version history |
| POST | `/forms/:id/rollback/:version` | Rollback to version |
| POST | `/forms/:id/submit` | Submit form data |

---

## Workflows

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/workflows` | List all workflows |
| POST | `/workflows` | Create a new workflow |
| GET | `/workflows/:id` | Get workflow by ID |
| PUT | `/workflows/:id` | Update workflow |
| DELETE | `/workflows/:id` | Delete workflow |
| POST | `/workflows/:id/start` | Start workflow instance |
| GET | `/workflows/:id/instances` | List workflow instances |

---

## Workflow Instances

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/workflow-instances` | List all instances |
| GET | `/workflow-instances/:id` | Get instance details |
| PUT | `/workflow-instances/:id` | Update instance |
| POST | `/workflow-instances/:id/advance` | Advance workflow |
| POST | `/workflow-instances/:id/complete` | Complete instance |
| POST | `/workflow-instances/:id/reject` | Reject instance |
| GET | `/workflow-instances/my-pending` | Current user's pending items |
| GET | `/workflow-instances/my-submitted` | Current user's submissions |
| POST | `/workflow-instances/:id/parallel-init` | Initialize parallel approval |
| POST | `/workflow-instances/:id/parallel-approve` | Approve in parallel |

---

## Approvals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/approvals/pending` | List pending approvals |
| POST | `/approvals/:id/approve` | Approve request |
| POST | `/approvals/:id/reject` | Reject request |

---

## Delegations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/delegations` | List all delegations |
| POST | `/delegations` | Create delegation |
| DELETE | `/delegations/:id` | Remove delegation |
| GET | `/delegations/my-delegate` | Check delegation status |

---

## Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | List notifications |
| PUT | `/notifications/:id/read` | Mark as read |
| PUT | `/notifications/read-all` | Mark all as read |

---

## Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/overview` | Dashboard statistics |

---

## Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/settings` | Get system settings |
| PUT | `/admin/settings` | Update system settings |
| POST | `/admin/ldap/sync` | Trigger LDAP sync |

---

## WebSocket Events

Connect via Socket.io to `http://localhost:3000`.

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `join` | `{ userId: string }` | Join user's notification room |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `notification` | `Notification` | New notification |
| `workflow-update` | `WorkflowInstance` | Instance status changed |

---

## Related Pages

- [[Overview]] — Project overview
- [[Technical Architecture]] — API module structure
