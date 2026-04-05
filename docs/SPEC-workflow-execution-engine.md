# SPEC: Workflow Execution Engine

## 目標

實現 ServiceFlow 的 Workflow Execution Engine，負責執行已保存的 Workflow 定義，包括：
- Sequential node execution（順序執行）
- Parallel node execution（並行執行，AND/OR logic）
- Condition evaluation（條件分支）
- Sub-workflow invocation（子流程調用）
- Instance state management（執行狀態管理）

---

## 現有架構參考

### Backend Structure
```
backend/src/
├── workflows/
│   ├── workflows.controller.ts   (HTTP endpoints)
│   ├── workflows.service.ts      (CRUD operations)
│   └── workflow-engine.service.ts (NEW - execution logic)
├── workflow-instances/
│   ├── workflow-instances.controller.ts
│   └── workflow-instances.service.ts
└── prisma/schema.prisma
```

### Workflow Node Types (現有)
1. **start** - 流程開始
2. **end** - 流程結束
3. **task** - 任務節點
4. **form** - 表單節點
5. **approval** - 審批節點
6. **condition** - 條件分支節點
7. **parallel** - 並行執行節點
8. **sub-workflow** - 子流程節點
9. **join** - 合併節點
10. **end** - 結束節點

### Prisma Schema (現有)
```prisma
model Workflow {
  id          String   @id @default(uuid())
  name        String
  description String?
  nodes       String   // JSON string
  connections String   // JSON string
  isActive    Boolean  @default(true)
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  instances   WorkflowInstance[]
}

model WorkflowInstance {
  id           String   @id @default(uuid())
  workflowId   String
  workflow     Workflow @relation(fields: [workflowId], references: [id])
  userId       String
  currentNodeId String
  status       String   // PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  formData     String   // JSON string
  history      String   // JSON string
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

---

## 實現要求

### 1. WorkflowEngineService

建立 `backend/src/workflows/workflow-engine.service.ts`:

```typescript
@Injectable()
export class WorkflowEngineService {
  
  // 啟動 workflow instance
  async startInstance(workflowId: string, userId: string, initialData?: Record<string, any>): Promise<WorkflowInstance>
  
  // 執行當前節點並推進到下一個
  async executeCurrentNode(instanceId: string): Promise<ExecutionResult>
  
  // 評估條件並返回分支
  evaluateCondition(node: WorkflowNode, formData: Record<string, any>): boolean
  
  // 處理並行節點
  async executeParallelNode(instance: WorkflowInstance, node: WorkflowNode): Promise<ExecutionResult>
  
  // 處理子流程
  async executeSubWorkflow(instance: WorkflowInstance, node: WorkflowNode): Promise<ExecutionResult>
  
  // 獲取可用的下一步操作
  getAvailableActions(instanceId: string): AvailableAction[]
  
  // 提交審批
  async submitApproval(instanceId: string, approverId: string, decision: 'approve' | 'reject', comment?: string): Promise<ExecutionResult>
}
```

### 2. 節點執行邏輯

#### 2.1 Start Node
- 標記流程開始
- 推進到下一個節點

#### 2.2 End Node
- 標記流程完成 (status = COMPLETED)
- 記錄最終歷史

#### 2.3 Task Node
- 創建任務記錄
- 推進到下一個節點

#### 2.4 Form Node
- 等待用戶填寫表單
- 表單數據存入 `formData`
- 推進到下一個節點

#### 2.5 Approval Node
- 等待審批人決策 (approve/reject)
- 如果是 parallel，追踪所有分支
- **等待所有 parallel branches 完成後才推進**

#### 2.6 Condition Node
```typescript
// Condition node data format
interface ConditionNodeData {
  label: string;
  conditions: Condition[];
  operator: 'AND' | 'OR';  // 如何組合多個條件
}

interface Condition {
  field: string;      // 表單欄位名
  operator: string;   // equals, not_equals, contains, greater_than, less_than
  value: any;         // 比較值
}

// Example:
// { field: "amount", operator: "greater_than", value: 10000 }
// 如果 amount > 10000，走 A 分支；否則走 B 分支
```

#### 2.7 Parallel Node
```typescript
// Parallel node data format
interface ParallelNodeData {
  label: string;
  joinType: 'AND' | 'OR';  // AND: all must complete, OR: any one completes
  branches: string[];       // 分支 IDs
}

// Execution:
// 1. Fork into multiple parallel branches
// 2. Each branch executes independently
// 3. Join node waits for all (AND) or any (OR) branches
// 4. Update instance status
```

#### 2.8 Sub-workflow Node
```typescript
// Sub-workflow node data format
interface SubWorkflowNodeData {
  label: string;
  subWorkflowId: string;   // 子流程 ID
  inputMapping: Record<string, string>;  // 輸入映射
  outputMapping: Record<string, string>; // 輸出映射
}

// Execution:
// 1. Create new instance of sub-workflow
// 2. Pass input data
// 3. Wait for sub-workflow to complete
// 4. Map output to parent workflow data
```

#### 2.9 Join Node
```typescript
// Join node data format
interface JoinNodeData {
  label: string;
  joinType: 'AND' | 'OR';  // 等候策略
}

// Execution:
// 1. Track which parallel branches have completed
// 2. For AND: wait for all
// 3. For OR: wait for first one, cancel others
// 4. Continue when join condition met
```

### 3. ExecutionResult 格式

```typescript
interface ExecutionResult {
  success: boolean;
  nextNodeId: string | null;  // null if workflow completed
  actionRequired?: {
    type: 'approval' | 'form_fill' | 'subworkflow';
    nodeId: string;
    message: string;
  };
  parallelBranches?: string[];  // For parallel nodes
  error?: string;
}
```

### 4. Instance History 格式

```typescript
interface HistoryEntry {
  nodeId: string;
  nodeType: string;
  action: 'started' | 'completed' | 'approved' | 'rejected' | 'skipped';
  timestamp: string;  // ISO date
  userId?: string;
  comment?: string;
  data?: Record<string, any>;  // Any data collected at this step
}

// Example history:
[
  { "nodeId": "start-1", "nodeType": "start", "action": "started", "timestamp": "2026-04-06T00:00:00Z" },
  { "nodeId": "approval-1", "nodeType": "approval", "action": "approved", "timestamp": "2026-04-06T00:05:00Z", "userId": "manager-1", "comment": "Approved" },
  { "nodeId": "end-1", "nodeType": "end", "action": "completed", "timestamp": "2026-04-06T00:06:00Z" }
]
```

---

## API Endpoints

### 新增 Endpoints

```
POST   /api/workflows/:id/instances        - 啟動 workflow instance
GET    /api/workflow-instances/:id         - 獲取 instance 狀態
POST   /api/workflow-instances/:id/execute - 執行當前節點
POST   /api/workflow-instances/:id/submit  - 提交審批/表單
GET    /api/workflow-instances/:id/history - 獲取執行歷史
POST   /api/workflow-instances/:id/cancel   - 取消 workflow
```

### Request/Response Examples

#### Start Instance
```http
POST /api/workflows/123/instances
Authorization: Bearer <token>
Content-Type: application/json

{
  "initialData": {
    "employeeName": "John",
    "leaveType": "annual"
  }
}

Response 201:
{
  "id": "instance-456",
  "workflowId": "123",
  "currentNodeId": "start-1",
  "status": "IN_PROGRESS",
  "createdAt": "2026-04-06T00:00:00Z"
}
```

#### Submit Approval
```http
POST /api/workflow-instances/456/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "approve",  // or "reject"
  "comment": "Approved. Please proceed."
}

Response 200:
{
  "success": true,
  "nextNodeId": "end-1",
  "actionRequired": null
}
```

---

## 測試要求

### Unit Tests
```typescript
describe('WorkflowEngineService', () => {
  describe('evaluateCondition', () => {
    it('should evaluate equals correctly', () => { ... });
    it('should evaluate AND conditions', () => { ... });
    it('should evaluate OR conditions', () => { ... });
  });
  
  describe('executeParallelNode', () => {
    it('should track all branches for AND join', () => { ... });
    it('should complete when any branch done for OR join', () => { ... });
  });
});
```

### Integration Tests
```typescript
describe('Parallel Approval Workflow', () => {
  it('should wait for all approvals before completing', async () => { ... });
});

describe('Condition Branching', () => {
  it('should route to correct branch based on form data', async () => { ... });
});
```

---

## 驗收標準

1. ✅ Parallel approval workflow 可以同時發給多個審批人
2. ✅ 所有 parallel branches 完成後才推進到下一個節點
3. ✅ Condition node 可以根據表單數據分支
4. ✅ Instance history 完整記錄每個步驟
5. ✅ Sub-workflow 可以被調用並返回結果
6. ✅ Join node 正確等待所有/任意分支完成
7. ✅ Unit tests 覆蓋核心邏輯
8. ✅ Integration tests 驗證完整流程

---

## 預期輸出

1. `backend/src/workflows/workflow-engine.service.ts` - 主要執行引擎
2. `backend/src/workflows/workflow-engine.controller.ts` - HTTP endpoints
3. `backend/src/workflows/workflow-engine.module.ts` - Module 定義
4. `backend/src/workflows/__tests__/workflow-engine.spec.ts` - Unit tests
5. `backend/src/workflows/__tests__/workflow-engine.integration.spec.ts` - Integration tests
6. 更新 `prisma/schema.prisma` 如需要新欄位

---

## 限制

- 使用現有的 Prisma schema，如需改動請在 comment 中說明
- 不修改現有的 workflows.service.ts 和 workflow-instances.service.ts
- 新代碼放在 `workflow-engine.service.ts` 中
- 遵循現有的 coding style 和 naming conventions
