# SPEC: Error Handling Enhancement

## 目標

加強 Error Handling：
- 自定義 Exception Filters
- 統一錯誤 Response 格式
- 更好的 Validation 錯誤訊息
- 記錄錯誤到 logging system

---

## 實現方案

### 錯誤 Response 格式

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    { "field": "email", "message": "Invalid email format" }
  ],
  "timestamp": "2026-04-06T02:30:00.000Z",
  "path": "/api/users"
}
```

### 自定義 Exceptions

- `ValidationException` - 帶 field-level 詳細資訊
- `ResourceNotFoundException` - 資源不存在
- `BusinessException` - 業務邏輯錯誤

---

## 驗收標準

1. ✅ 所有 error responses 格式一致
2. ✅ Validation errors 包含 field 詳細資訊
3. ✅ 錯誤被記錄到 logging system
4. ✅ 敏感資訊不被暴露
