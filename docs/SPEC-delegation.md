# SPEC: Delegation (代理審批)

## 目標

實現代理審批功能：
- 用戶可以設置代理人
- 代理人可以代為審批
- 審計追蹤記錄代理操作

---

## Prisma Schema

```prisma
model Delegation {
  id           String   @id @default(uuid())
  delegatorId  String   // Original approver
  delegateId   String   // Person who can approve on behalf
  reason       String?  // e.g., "Vacation", "Out of office"
  startDate    DateTime
  endDate      DateTime
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  
  delegator    User     @relation(fields: [delegatorId], references: [id])
  delegate    User     @relation(fields: [delegateId], references: [id])
  
  @@index([delegatorId])
  @@index([delegateId])
}
```

---

## API Endpoints

```
GET    /api/delegations              - List my delegations
POST   /api/delegations              - Create delegation
PUT    /api/delegations/:id          - Update delegation
DELETE /api/delegations/:id          - Delete delegation
GET    /api/delegations/my-delegate - Check if someone delegated to me
```

---

## 实现要求

### DelegationService

```typescript
@Injectable()
export class DelegationService {
  
  // Create delegation
  async create(data: CreateDelegationDto): Promise<Delegation>
  
  // List delegations where user is delegator
  async getMyDelegations(userId: string): Promise<Delegation[]>
  
  // List delegations where user is delegate (people who delegated to me)
  async getDelegationsToMe(userId: string): Promise<Delegation[]>
  
  // Check if user can approve on behalf of another
  async canApproveOnBehalf(approverId: string, originalApproverId: string): Promise<boolean>
  
  // Update delegation
  async update(id: string, data: UpdateDelegationDto): Promise<Delegation>
  
  // Delete delegation
  async delete(id: string): Promise<void>
}
```

### ApprovalRequest Update

When creating or processing an approval request:
1. Check if original approver has active delegation
2. If yes, notify delegate they can approve
3. On approval, record who actually approved

---

## 驗收標準

1. ✅ User can create delegation (set someone as delegate)
2. ✅ Delegate sees pending approvals from delegator
3. ✅ Delegate can approve on behalf of delegator
4. ✅ Audit trail records both original approver and actual approver
5. ✅ Delegation has time period (start/end date)

---

## 預期輸出

1. `backend/prisma/schema.prisma` - Add Delegation model
2. `backend/src/delegations/delegations.service.ts` - Service
3. `backend/src/delegations/delegations.controller.ts` - API endpoints
4. `backend/src/delegations/__tests__/delegations.spec.ts` - Unit tests
