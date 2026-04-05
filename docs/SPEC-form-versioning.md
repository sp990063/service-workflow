# SPEC: Form Versioning

## 目標

實現表單版本控制系統，讓用戶可以：
- 追蹤表單的歷史版本
- 查看每個版本的變更
- 還原到舊版本

---

## 現有架構

### Prisma Schema (現有)
```prisma
model Form {
  id          String   @id @default(uuid())
  name        String
  description String?
  elements    String   // JSON string
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  isActive    Boolean  @default(true)
}
```

---

## 實現方案

### 方案：簡單版本追蹤

不做真正的版本分支，而是：
1. 在 `FormVersion` model 中保存歷史快照
2. 每次編輯創建新版本
3. 支持查看歷史和還原

### Prisma Schema 更新

```prisma
model Form {
  id           String        @id @default(uuid())
  name         String
  description  String?
  elements     String       // JSON string
  userId       String
  user         User         @relation(fields: [userId], references: [id])
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  isActive     Boolean      @default(true)
  currentVersion Int         @default(1)  // NEW
  versions     FormVersion[] // NEW
}

model FormVersion {           // NEW
  id         String   @id @default(uuid())
  formId     String
  form       Form     @relation(fields: [formId], references: [id])
  version    Int
  elements   String   // JSON snapshot
  name       String
  createdAt  DateTime @default(now())
  createdBy  String
}
```

---

## API Endpoints

```
GET    /api/forms/:id/versions      - 列出所有版本
GET    /api/forms/:id/versions/:v   - 獲取特定版本
POST   /api/forms/:id/rollback/:v   - 還原到特定版本
```

---

## 實現要求

### FormsService 更新

```typescript
// 新方法
async createVersion(formId: string, userId: string): Promise<FormVersion>

async getVersions(formId: string): Promise<FormVersion[]>

async getVersion(formId: string, version: number): Promise<FormVersion>

async rollback(formId: string, version: number, userId: string): Promise<Form>

async updateWithVersion(id: string, data: UpdateFormDto, userId: string): Promise<Form>
// 自動創建新版本
```

### Update Flow

```
1. User edits form
2. Backend creates new FormVersion (snapshot of current)
3. Backend updates Form with new elements
4. Increment Form.currentVersion
```

### Rollback Flow

```
1. User selects version to rollback
2. Backend finds that version
3. Backend creates NEW version (current state snapshot)
4. Backend copies old version's elements to Form
5. Increment Form.currentVersion
```

---

## 驗收標準

1. ✅ 每次編輯表單自動創建版本快照
2. ✅ 可以列出表單的所有歷史版本
3. ✅ 可以查看特定版本的內容
4. ✅ 可以還原到舊版本
5. ✅ 還原操作創建新版本（原狀態有記錄）

---

## 預期輸出

1. `backend/prisma/schema.prisma` - 添加 FormVersion model
2. `backend/src/forms/forms.service.ts` - 添加版本方法
3. `backend/src/forms/forms.controller.ts` - 添加版本 endpoints
4. 數據庫遷移
