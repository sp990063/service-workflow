# Service Workflow Backend - Unit Test Plan

## Overview

建立完整的 backend 單元測試，確保代碼質量和防止 regression。

---

## 1. 測試框架選擇

| 框架 | 用途 |
|------|------|
| **Jest** | 主要測試框架（快、Mock 能力強） |
| **supertest** | HTTP API 測試 |
| **Faker** | 生成測試數據 |

---

## 2. 測試目標架構

```
backend/
├── src/
│   ├── workflows/
│   │   ├── workflows.service.ts       ✅ 需要測試
│   │   ├── workflows.controller.ts    ✅ 需要測試
│   │   └── workflows.service.spec.ts
│   ├── forms/
│   │   ├── forms.service.ts          ✅ 需要測試
│   │   ├── forms.controller.ts        ✅ 需要測試
│   │   └── forms.service.spec.ts
│   ├── users/
│   │   └── users.service.ts
│   └── auth/
│       └── auth.service.ts
└── prisma/
    └── prisma.service.ts             ✅ Mock
```

---

## 3. 測試優先級

### P0 - 核心 Service（必須有測試）

| Service | 測試覆蓋目標 |
|---------|--------------|
| `WorkflowsService` | CRUD、instance 管理、advance/complete/reject |
| `FormsService` | CRUD、submit、versioning |
| `AuthService` | Login、logout、JWT validation |

### P1 - 主要功能

| 功能 | 測試內容 |
|------|----------|
| Workflow Instance | 建立、推進、完成、拒絕 |
| Form Submission | 提交、驗證、歷史 |
| Parallel Approval | 多審批者、Join 邏輯 |
| Condition Node | 條件判斷、分支邏輯 |

### P2 - 邊緣情況

- 錯誤處理
- 權限驗證
- 並發問題

---

## 4. 測試用例設計

### 4.1 WorkflowsService

```typescript
describe('WorkflowsService', () => {
  describe('create()', () => {
    it('should create a new workflow with nodes and connections')
    it('should generate UUID for workflow id')
    it('should set createdAt and updatedAt timestamps')
    it('should throw if name is empty')
  })

  describe('getById()', () => {
    it('should return workflow with given id')
    it('should return null for non-existent workflow')
  })

  describe('update()', () => {
    it('should update workflow name')
    it('should update nodes and connections')
    it('should update updatedAt timestamp')
  })

  describe('delete()', () => {
    it('should delete workflow and return success')
    it('should throw if workflow not found')
  })

  describe('startInstance()', () => {
    it('should create workflow instance with PENDING status')
    it('should set currentNodeId to first node')
    it('should associate formData with instance')
  })

  describe('advanceInstance()', () => {
    it('should move to next node')
    it('should add current node to history')
    it('should update formData')
    it('should throw if instance not found')
  })

  describe('completeInstance()', () => {
    it('should set status to COMPLETED')
    it('should set completedAt timestamp')
  })

  describe('rejectInstance()', () => {
    it('should set status to REJECTED')
    it('should set rejectedAt timestamp')
  })
})
```

### 4.2 FormsService

```typescript
describe('FormsService', () => {
  describe('create()', () => {
    it('should create form with elements array')
    it('should set version to 1')
    it('should generate UUID for form id')
  })

  describe('update()', () => {
    it('should update form name')
    it('should update elements array')
    it('should increment version number')
    it('should create version history entry')
  })

  describe('submit()', () => {
    it('should create form submission with PENDING status')
    it('should store formData correctly')
    it('should associate userId')
  })

  describe('getVersions()', () => {
    it('should return all versions for a form')
    it('should be sorted by version number descending')
  })
})
```

### 4.3 Parallel Approval Logic

```typescript
describe('Parallel Approval', () => {
  describe('join node behavior', () => {
    it('should wait for all parallel approvals before proceeding (join=ALL)')
    it('should proceed when any approval is complete (join=ANY)')
    it('should track individual approver statuses')
  })

  describe('parallel node behavior', () => {
    it('should create multiple pending approvals')
    it('should notify all approvers simultaneously')
    it('should collect all approvals before joining')
  })
})
```

### 4.4 Condition Node

```typescript
describe('Condition Node', () => {
  describe('evaluateCondition()', () => {
    it('should evaluate "equals" condition correctly')
    it('should evaluate "greater than" condition correctly')
    it('should evaluate "less than" condition correctly')
    it('should evaluate "contains" condition correctly')
    it('should handle missing form fields gracefully')
  })

  describe('routeDecision()', () => {
    it('should route to "yes" branch when condition is true')
    it('should route to "no" branch when condition is false')
  })
})
```

---

## 5. Mock 策略

### Prisma Service Mock

```typescript
// __mocks__/@prisma/client.ts
export const PrismaClient = jest.fn().mockImplementation(() => ({
  workflow: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  workflowInstance: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  form: { ... },
  formSubmission: { ... },
  user: { ... },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
}));
```

### Auth Service Mock

```typescript
const mockAuthService = {
  validateToken: jest.fn().mockReturnValue({ userId: 'user-1', role: 'admin' }),
  hashPassword: jest.fn().mockImplementation((pwd) => Promise.resolve(`hashed_${pwd}`)),
  comparePassword: jest.fn().mockImplementation((pwd, hash) => Promise.resolve(hash === `hashed_${pwd}`)),
};
```

---

## 6. 測試數據工廠

```typescript
// tests/factories/workflow.factory.ts
export const createMockWorkflow = (overrides = {}) => ({
  id: 'wf-123',
  name: 'Test Workflow',
  description: 'A test workflow',
  nodes: [
    { id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: {} },
    { id: 'task-1', type: 'task', position: { x: 100, y: 0 }, data: { formId: 'form-1' } },
    { id: 'end-1', type: 'end', position: { x: 200, y: 0 }, data: {} },
  ],
  connections: [
    { id: 'conn-1', source: 'start-1', target: 'task-1' },
    { id: 'conn-2', source: 'task-1', target: 'end-1' },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockForm = (overrides = {}) => ({
  id: 'form-123',
  name: 'Test Form',
  elements: [
    { id: 'el-1', type: 'text', label: 'Name', required: true },
    { id: 'el-2', type: 'dropdown', label: 'Priority', options: ['Low', 'High'], required: false },
  ],
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
```

---

## 7. 執行計劃

### Phase 1: 測試基礎架構（1 day）
- [ ] 安裝 Jest、supertest、Faker
- [ ] 配置 Jest（transform, coverage, globals）
- [ ] 建立測試目錄結構
- [ ] 建立 Mock 工廠

### Phase 2: WorkflowsService 測試（2 days）
- [ ] CRUD operations
- [ ] Instance lifecycle
- [ ] Advance/complete/reject logic

### Phase 3: FormsService 測試（1 day）
- [ ] CRUD operations
- [ ] Form submission
- [ ] Version history

### Phase 4: Integration Tests（2 days）
- [ ] API endpoint tests with supertest
- [ ] Authentication middleware tests
- [ ] Permission/authorization tests

### Phase 5: Coverage & CI（1 day）
- [ ] 設定 coverage threshold（目標 80%）
- [ ] 接入 GitHub Actions
- [ ] 撰寫測試文檔

---

## 8. 測試覆蓋率目標

| 類型 | 目標覆蓋率 |
|------|-----------|
| **Statements** | 80% |
| **Branches** | 75% |
| **Functions** | 80% |
| **Lines** | 80% |

---

## 9. 測試命名規範

```
[UnitOfWork]_[Scenario]_[ExpectedResult]

Examples:
- WorkflowService_create_withValidData_createsWorkflow
- WorkflowService_create_withEmptyName_throwsValidationError
- InstanceService_advance_withParallelNodes_waitsForAllApprovals
```

---

## 10. 關鍵測試案例

### 必須覆蓋的場景

1. ✅ Workflow 建立、讀取、更新、刪除
2. ✅ Workflow Instance 生命周期（開始 → 進行中 → 完成/拒絕）
3. ✅ Form 建立、提交、版本控制
4. ✅ Parallel Approval（多人同時審批）
5. ✅ Join Node（等待所有審批完成）
6. ✅ Condition Node（條件分支）
7. ✅ 錯誤處理（找不到資源、無權限、數據驗證失敗）
8. ✅ JWT Authentication middleware

### 不需要測試的（由 Integration/E2E 覆蓋）

- 數據庫連接（由 Prisma Mock）
- 外部 API 調用（由 Mock 處理）
- 前端交互

---

## 11. 工具推薦

| 工具 | 用途 |
|------|------|
| **Jest** | 測試執行、Mock、Coverage |
| **supertest** | HTTP API 測試 |
| **Faker** | 測試數據生成 |
| **jest-mock-extended** | 增強型 Mock |
| **testdouble** | 替換不方便 Mock 的模塊 |

---

## 12. 開始步驟

```bash
# 1. 安裝依賴
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest faker @types/faker jest-mock-extended

# 2. 建立 jest.config.js
npx jest --init

# 3. 配置 ts-jest
# 編輯 jest.config.js 設置 preset: 'ts-jest'

# 4. 創建測試目錄
mkdir -p src/**/*.spec.ts tests/factories tests/mocks

# 5. 運行測試
npm test

# 6. 生成 coverage 報告
npm test -- --coverage
```

---

## 總結

| Phase | 時間 | 目標 |
|-------|------|------|
| Phase 1 | 1 day | 測試基礎架構 |
| Phase 2 | 2 days | WorkflowsService 測試 |
| Phase 3 | 1 day | FormsService 測試 |
| Phase 4 | 2 days | Integration Tests |
| Phase 5 | 1 day | CI + Coverage |

**總計：7 days** 完成 backend 單元測試
