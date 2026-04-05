# SPEC: Escalation Rules (升級規則)

## 目標

實現審批超時自動升級功能：
- 設置審批時限
- 超時後自動通知上一級
- 可配置的升級級別

---

## Prisma Schema

```prisma
model EscalationRule {
  id           String   @id @default(uuid())
  workflowId   String?  // Optional: null means global rule
  workflow    Workflow? @relation(fields: [workflowId], references: [id])
  
  nodeType    String   // approval, form, task
  timeoutMinutes Int   // Minutes before escalation
  
  // Escalation levels
  level1ApproverId String? // First escalation
  level2ApproverId String? // Second escalation
  level3ApproverId String? // Final escalation
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model EscalationLog {
  id              String   @id @default(uuid())
  instanceId      String
  approvalRequestId String
  level           Int      // 0 = original, 1 = first escalation, etc.
  escalatedAt     DateTime @default(now())
  reason          String   // e.g., "Timeout after 24 hours"
}
```

---

## API Endpoints

```
GET    /api/escalation-rules           - List escalation rules
POST   /api/escalation-rules           - Create rule
PUT    /api/escalation-rules/:id       - Update rule
DELETE /api/escalation-rules/:id       - Delete rule
GET    /api/escalation-rules/workflow/:workflowId - Rules for specific workflow
```

---

## 實現要求

### EscalationService

```typescript
@Injectable()
export class EscalationService {
  
  // Create escalation rule
  async createRule(data: CreateEscalationRuleDto): Promise<EscalationRule>
  
  // Check if approval should be escalated
  async checkAndEscalate(approvalRequestId: string): Promise<EscalationResult>
  
  // Get escalation history
  async getEscalationHistory(instanceId: string): Promise<EscalationLog[]>
  
  // Get current escalation level
  async getCurrentLevel(approvalRequestId: string): Promise<number>
}
```

### Cron Job

需要定時 job 檢查超時：
```
Every 5 minutes:
1. Find pending approval requests older than timeout
2. Escalate to next level
3. Notify new approver
4. Log escalation
```

---

## 驗收標準

1. ✅ Admin can set escalation rules per workflow
2. ✅ Approval timeout triggers escalation
3. ✅ Notify next-level approver
4. ✅ Escalation history logged
5. ✅ Multiple escalation levels supported

---

## 預期輸出

1. `backend/prisma/schema.prisma` - Add EscalationRule, EscalationLog
2. `backend/src/escalations/escalations.service.ts`
3. `backend/src/escalations/escalations.controller.ts`
4. `backend/src/escalations/__tests__/escalations.spec.ts`
