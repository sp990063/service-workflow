# OWASP Top 1 - Broken Access Control Vulnerability Report

**Auditor:** Claude Code Security Audit
**Date:** 2026-04-12
**Status:** Vulnerabilities Found - Fixes Needed

---

## Executive Summary

This codebase contains **10 distinct Broken Access Control vulnerabilities** violating OWASP Top 1 (2021). The most severe issues allow privilege escalation, IDOR attacks, and unauthorized workflow manipulation. All vulnerabilities require authentication but fail to properly authorize access to resources based on the authenticated user.

---

## Vulnerabilities

### 1. CRITICAL - IDOR: Pending Approvals Disclosure

**File:** `backend/src/approvals/approvals.controller.ts`
**Lines:** 10-16

```typescript
@Get('pending')
async getPending(@Query('userId') userId: string) {
  if (userId) {
    return this.approvalsService.getPendingApprovals(userId);
  }
  return this.approvalsService.getAllPendingApprovals();
}
```

**Problem:** Any authenticated user can query pending approvals for any user by passing `userId` query parameter. No server-side validation that the requesting user matches the queried user.

**Attack Vector:** `GET /approvals/pending?userId=victim-user-id`

**Fix Required:**
- Remove `userId` parameter from query
- Use `@CurrentUser('id') userId: string` from JWT token
- Always return only the current user's pending approvals

---

### 2. CRITICAL - Privilege Escalation: Create Approval as Other User

**File:** `backend/src/approvals/approvals.controller.ts`
**Lines:** 23-26

```typescript
@Post()
async create(@Body() body: { instanceId: string; nodeId: string; userId: string }) {
  return this.approvalsService.createApprovalRequest(body.instanceId, body.nodeId, body.userId);
}
```

**Problem:** `userId` comes from request body. An attacker can create approval requests on behalf of any user.

**Attack Vector:** `POST /approvals` with `{"instanceId": "...", "nodeId": "...", "userId": "victim-user-id"}`

**Fix Required:**
- Remove `userId` from request body
- Use `@CurrentUser('id')` from JWT token
- Only the authenticated user should be the approver

---

### 3. CRITICAL - Broken Access Control: Approve/Reject Any Request

**File:** `backend/src/approvals/approvals.controller.ts`
**Lines:** 28-36

```typescript
@Put(':id/approve')
async approve(@Param('id') id: string, @Body() body: { comment?: string }) {
  return this.approvalsService.approve(id, body.comment);
}

@Put(':id/reject')
async reject(@Param('id') id: string, @Body() body: { comment?: string }) {
  return this.approvalsService.reject(id, body.comment);
}
```

**Problem:** No verification that the authenticated user is the designated approver for this approval request. Any user can approve/reject any approval.

**Fix Required:**
- Add `@CurrentUser('id')` to get current user
- Verify current user is the designated approver before allowing approve/reject
- Check delegation rules (if delegation is implemented)
- Return 403 Forbidden if user is not authorized

---

### 4. CRITICAL - Broken Access Control: Workflow Instance State Manipulation

**File:** `backend/src/workflows/workflows.controller.ts`
**Lines:** 132-145

```typescript
@Post(':id/advance')
async advanceInstance(@Param('id') id: string, @Body() body: { nextNodeId: string; addToHistory: any[] }) {
  return this.workflowsService.advanceInstance(id, body.nextNodeId, body.addToHistory);
}

@Post(':id/complete')
async completeInstance(@Param('id') id: string) {
  return this.workflowsService.completeInstance(id);
}

@Post(':id/reject')
async rejectInstance(@Param('id') id: string) {
  return this.workflowsService.rejectInstance(id);
}
```

**Problem:** No authorization check on these state transition endpoints. Any authenticated user can advance, complete, or reject any workflow instance.

**Fix Required:**
- Add `@CurrentUser('id')` and `@CurrentUser('role')`
- Verify user is a participant/approver in this workflow instance
- Or check workflow-level permissions
- Apply same pattern as other protected endpoints (see `WorkflowInstancesController` lines 103-112)

---

### 5. HIGH - IDOR: Parallel Approval Impersonation

**File:** `backend/src/workflows/workflows.controller.ts`
**Lines:** 161-183

```typescript
@Post(':id/parallel-init')
async initParallelApproval(
  @Param('id') id: string,
  @Body() body: { nodeId: string; requiredApprovers: string[] },
) {
  return this.workflowsService.initParallelApproval(id, body.nodeId, body.requiredApprovers);
}

@Post(':id/parallel-approve')
async approveParallel(
  @Param('id') id: string,
  @Body() body: { nodeId: string; approverId: string },
) {
  return this.workflowsService.approveParallel(id, body.nodeId, body.approverId);
}

@Post(':id/parallel-reject')
async rejectParallel(
  @Param('id') id: string,
  @Body() body: { nodeId: string; approverId: string },
) {
  return this.workflowsService.rejectParallel(id, body.nodeId, body.approverId);
}
```

**Problem:** `approverId` in body allows users to approve/reject as any user. No verification that current user is the actual approver.

**Fix Required:**
- Remove `approverId` from request body
- Use `@CurrentUser('id')` from JWT token as the approver
- Verify current user is in the `requiredApprovers` list before allowing action

---

### 6. HIGH - Bug in Access Control Logic: Submission ID vs User ID

**File:** `backend/src/forms/forms.controller.ts`
**Lines:** 135-144

```typescript
@Get(':id')
async getSubmission(@Param('id') id: string, @CurrentUser('role') role: string) {
  const submission = await this.formsService.getSubmission(id);
  if (!submission) return null;

  if (role === Role.USER && submission.userId !== id) {  // BUG HERE
    throw new Error('Access denied');
  }
  return submission;
}
```

**Problem:** Line 140 compares `submission.userId !== id` where `id` is the **submission ID** from URL params, NOT the `userId`. This comparison is always true for different IDs, effectively **bypassing access control for all USER role accounts**.

**Attack:** A USER role can access ANY form submission because `submission.userId !== submission.id` is always true.

**Fix Required:**
- Change line 140 to: `if (role === Role.USER && submission.userId !== userId)`
- Add `@CurrentUser('id') userId: string` parameter

---

### 7. HIGH - Missing Authentication: Form Templates

**File:** `backend/src/form-templates/form-templates.controller.ts`
**Lines:** 9-26

```typescript
@Controller('form-templates')
export class FormTemplatesController {  // NO @UseGuards at class level!
  @Get()
  findAll() { ... }

  @Get('category/:category')
  findByCategory(@Param('category') category: string) { ... }

  @Get(':id')
  findById(@Param('id') id: string) { ... }
```

**Problem:** No `@UseGuards(JwtAuthGuard)` on the class or GET endpoints. Template data is accessible **without any authentication**.

**Attack:** `GET /form-templates` or `GET /form-templates/:id` without any Authorization header

**Fix Required:**
- Add `@UseGuards(JwtAuthGuard)` at class level, OR
- Add `@UseGuards(JwtAuthGuard)` to each public endpoint

---

### 8. MEDIUM - IDOR: User Statistics Exposure

**File:** `backend/src/analytics/analytics.controller.ts`
**Lines:** 52-55

```typescript
@Get('users/:id')
getUserStats(@Param('id') id: string) {
  return this.analyticsService.getUserStats(id);
}
```

**Problem:** Any authenticated user can view statistics for any other user by changing the `id` parameter.

**Attack:** `GET /analytics/users/any-user-id`

**Fix Required:**
- Add `@CurrentUser('id')` and `@CurrentUser('role')`
- Non-admin users should only access their own stats
- Admins can access any stats

---

### 9. MEDIUM - Broken Access Control: Comments Thread Access

**File:** `backend/src/comments/comments.controller.ts`
**Lines:** 11-14

```typescript
@Get()
async getThread(@Param('instanceId') instanceId: string) {
  return this.commentsService.getThread(instanceId);
}
```

**Problem:** No authorization check to verify user has access to the workflow instance. Any authenticated user can view comments on any workflow instance.

**Attack:** `GET /instances/any-instance-id/thread`

**Fix Required:**
- Verify the user is a participant in the workflow instance
- Or check ownership of the workflow
- Follow pattern from `WorkflowInstancesController` lines 103-112

---

### 10. LOW - Weak Fallback in OwnershipGuard

**File:** `backend/src/common/guards/ownership.guard.ts`
**Lines:** 32-34

```typescript
if (!user || !resourceId) {
  return true; // Let other guards handle missing data
}
```

**Problem:** Returns `true` when `user` or `resourceId` is missing. This could allow access when authentication/authorization data is absent.

**Fix Required:**
- Return `false` instead of `true` when data is missing
- Missing `resourceId` should not grant access
- Missing `user` should be handled by JwtAuthGuard, not this guard

---

## Fix Priority

| Priority | Vulnerabilities |
|----------|-----------------|
| **CRITICAL** | #1, #2, #3, #4 |
| **HIGH** | #5, #6, #7 |
| **MEDIUM** | #8, #9 |
| **LOW** | #10 |

---

## Security Pattern Reference

The codebase already has correct patterns that should be applied consistently. Use these as reference:

**Correct pattern for ownership checks (from `workflows.controller.ts` lines 102-112):**
```typescript
@Get(':id')
async getInstance(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: string) {
  const instance = await this.workflowsService.getInstance(id);
  if (!instance) return null;

  // Check ownership via workflow
  const workflow = await this.workflowsService.findById(instance.workflowId);
  if (role === Role.USER && workflow?.userId !== userId) {
    throw new Error('Access denied');
  }
  return instance;
}
```

---

## Next Session Actions

1. Apply fixes in priority order (CRITICAL first)
2. For each fix:
   - Read the affected file
   - Apply the fix as described above
   - Verify the fix doesn't break existing functionality
3. Add unit tests to verify access control behavior
4. Run existing test suite to ensure no regressions
