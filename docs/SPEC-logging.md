# SPEC: Centralized Logging

## 目標

添加 centralized logging system：
- 統一日志格式
- 結構化日誌輸出 (JSON)
- 記錄級別控制
- Request/Response logging

---

## 實現方案

### Winston Logger

使用 Winston 作為 logging library，配合 NestJS Logger。

### 日誌格式

```json
{
  "timestamp": "2026-04-06T02:24:00.000Z",
  "level": "info",
  "context": "WorkflowsService",
  "message": "Workflow executed",
  "data": {
    "workflowId": "123",
    "instanceId": "456",
    "duration": 1500
  },
  "requestId": "uuid"
}
```

### Logging Service

```typescript
@Injectable()
export class LoggingService {
  constructor(private logger: Logger) {}
  
  log(context: string, message: string, data?: any) { ... }
  error(context: string, message: string, trace?: string) { ... }
  warn(context: string, message: string) { ... }
  debug(context: string, message: string) { ... }
}
```

---

## 驗收標準

1. ✅ 統一格式輸出
2. ✅ 可設定日誌級別
3. ✅ HTTP requests logging middleware
4. ✅ 所有 services 使用 LoggingService
