# ServiceFlow Roadmap

*Last Updated: 2026-04-05*

---

## Phase 1: Core Engine (最高優先)

### 1.1 Workflow Execution Engine ⭐
**Status:** ✅ 已完成
**Commit:** `7841b0e7`
**檔案:** `backend/src/workflows/workflow-engine.service.ts`

**已完成：**
- [x] Parallel node execution (AND/OR logic)
- [x] Sequential node execution
- [x] Condition evaluation (if/else branches)
- [x] Sub-workflow invocation
- [x] State machine for workflow instance

**驗收標準：**
- [x] Parallel approval workflow 可以同時發給多個審批人
- [x] Condition node 可以根據表單數據分支
- [x] Instance history 記錄每個步驟

---

### 1.2 Conditional Logic Storage ⭐
**Status:** UI有,Backend冇
**檔案:** `backend/prisma/schema.prisma`

**需要做:**
- [ ] Prisma schema 加 `conditionalRules` JSON 欄位
- [ ] Workflow service 儲存/讀取 conditional rules
- [ ] Workflow designer 保存條件規則

**驗收標準:**
- [ ] Form builder 保存的條件可以Workflow執行時用到

---

### 1.3 Form Versioning 📋
**Status:** 未實現
**檔案:** `backend/src/forms/`

**需要做:**
- [ ] Prisma schema 加 `version` 欄位
- [ ] Create new version on edit
- [ ] List form versions
- [ ] Rollback to previous version

**驗收標準:**
- [ ] 可以睇到表單的歷史版本
- [ ] 可以還原到舊版本

---

## Phase 2: Enterprise Features

### 2.1 LDAP User Sync 🔄
**Status:** Service有,未連接
**檔案:** `backend/src/ldap/ldap.service.ts`

**需要做:**
- [ ] 自動sync用戶 from LDAP server
- [ ] 定时同步 job
- [ ] Manual sync button in Admin UI

**驗收標準:**
- [ ] LDAP server 的用戶自動出現喺系統

---

### 2.2 Delegation (代理審批) 👤
**Status:** 未實現
**檔案:** `backend/src/approvals/delegation.service.ts` (new)

**需要做:**
- [ ] 用戶可以設置代理
- [ ] 代理人可以代審批
- [ ] Audit trail 記錄代理操作

**驗收標準:**
- [ ] Admin 可以設置代理規則
- [ ] 代理人收到通知並可審批

---

### 2.3 Escalation Rules (升級規則) ⏰
**Status:** 未實現
**檔案:** `backend/src/workflows/escalation.service.ts` (new)

**需要做:**
- [ ] 設置審批時限
- [ ] Timeout 後自動通知上一級
- [ ] Configurable escalation levels

**驗收標準:**
- [ ] 審批超時後自動升級

---

## Phase 3: Analytics & Monitoring

### 3.1 Workflow Analytics 📊
**Status:** 未實現
**檔案:** `backend/src/analytics/` (new)

**需要做:**
- [ ] 邊個workflow最多人用
- [ ] 平均審批時間
- [ ] 審批通過率
- [ ] Dashboard widgets

**驗收標準:**
- [ ] Admin dashboard 有 analytics panel

---

### 3.2 Real-time Updates (WebSocket) ⚡
**Status:** 未實現
**檔案:** `backend/src/notifications/websocket.gateway.ts` (new)

**需要做:**
- [ ] WebSocket gateway
- [ ] 審批結果即時通知
- [ ] Workflow status 即時更新

**驗收標準:**
- [ ] 無需refresh page 都睇到最新狀態

---

## Phase 4: DX Improvements

### 4.1 Swagger API Documentation 📚
**Status:** 未實現
**檔案:** `backend/src/main.ts`

**需要做:**
- [ ] 安裝 @nestjs/swagger
- [ ] 標注所有 endpoints
- [ ] 生成 OpenAPI JSON

**驗收標準:**
- [ ] `/api/docs` 可以睇到 API 文檔

---

### 4.2 Docker Compose 完善 🐳
**Status:** 現有但未驗證
**檔案:** `docker-compose.yml`

**需要做:**
- [ ] 驗證所有services正常啟動
- [ ] 添加 health checks
- [ ] 添加 Portainer (optional)

**驗收標準:**
- [ ] `docker-compose up` 可以啟動完整環境

---

### 4.3 Form Templates Library 📝
**Status:** 未實現
**檔案:** `backend/src/forms/templates/` (new)

**需要做:**
- [ ] 預設範本 (Leave request, Expense, IT request)
- [ ] 用戶可以創建自己範本
- [ ] Import/export templates

**驗收標準:**
- [ ] 用戶可以由範本快速創建表單

---

## Technical Debt (技術債)

| 優先 | 項目 | 難度 |
|------|------|------|
| 中 | 添加 centralized logging | 中 |
| 中 | 加強 error handling | 中 |
| 低 | 清理無用 code | 低 |
| 低 | 更新依賴版本 | 低 |

---

## 建議執行順序

```
1. Workflow Execution Engine (最核心)
2. Conditional Logic Storage (Engine需要)
3. Form Versioning (簡單可快速做)
4. Swagger API Docs (對開孿友好)
5. LDAP User Sync (企業需要)
6. Delegation + Escalation
7. Analytics
8. WebSocket
9. Form Templates
```

---

*下次討論邊個項目?*
