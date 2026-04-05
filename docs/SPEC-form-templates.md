# SPEC: Form Templates Library

## 目標

實現 Form Templates 功能：
- 預設範本 (Leave request, Expense, IT request)
- 用戶可以創建自己的範本
- Import/export templates

---

## Prisma Schema

```prisma
model FormTemplate {
  id          String   @id @default(uuid())
  name        String
  description String?
  elements    String   // JSON array of form elements
  category    String   // leave, expense, it, hr, general
  isBuiltIn  Boolean  @default(false)
  userId      String?  // null for built-in templates
  user       User?    @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## API Endpoints

```
GET    /api/form-templates           - List templates
GET    /api/form-templates/:id      - Get template
POST   /api/form-templates          - Create template
PUT    /api/form-templates/:id      - Update template
DELETE /api/form-templates/:id      - Delete template
POST   /api/form-templates/:id/clone - Clone template
GET    /api/form-templates/category/:cat - Get by category
```

---

## 實現要求

### FormTemplatesService

```typescript
@Injectable()
export class FormTemplatesService {
  
  // CRUD operations
  async findAll(): Promise<FormTemplate[]>
  async findById(id: string): Promise<FormTemplate>
  async create(data: CreateTemplateDto): Promise<FormTemplate>
  async update(id: string, data: UpdateTemplateDto): Promise<FormTemplate>
  async delete(id: string): Promise<void>
  
  // Template operations
  async clone(id: string, userId: string): Promise<FormTemplate>
  async findByCategory(category: string): Promise<FormTemplate[]>
  
  // Seed built-in templates
  async seedBuiltInTemplates(): Promise<void>
}
```

### Built-in Templates

1. **Leave Request** - 日期範圍、請假類型、原因
2. **Expense Report** - 金額、項目、收據上傳
3. **IT Equipment Request** - 設備類型、數量、使用日期

---

## 驗收標準

1. ✅ List all templates
2. ✅ Filter by category
3. ✅ Create user templates
4. ✅ Clone templates
5. ✅ Built-in templates seeded on startup

---

## 預期輸出

1. `backend/src/form-templates/` (service, controller, module)
2. Prisma schema update
3. Seed built-in templates
