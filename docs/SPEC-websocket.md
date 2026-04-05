# SPEC: WebSocket Real-time Updates

## 目標

實現 WebSocket 即時通知功能：
- 審批結果即時通知
- Workflow status 即時更新
- Notification 實時推送

---

## 實現方案

### 使用 Socket.io

Socket.io 係 NestJS 原生支持，易於集成。

### Gateway

```typescript
@WebSocketGateway()
export class NotificationsGateway {
  
  // 連接時認證用戶
  @SubscribeMessage('authenticate')
  handleAuth(client: Socket, token: string) { ... }
  
  // 用戶可以加入自己的 room
  @SubscribeMessage('join')
  handleJoin(client: Socket, userId: string) { ... }
  
  // 發送通知給指定用戶
  sendToUser(userId: string, event: string, data: any) { ... }
}
```

### 觸發時機

1. **審批完成** → 通知申請人
2. **Delegation 創建** → 通知被代理人
3. **Escalation** → 通知新審批人
4. **Workflow 完成** → 通知申請人

---

## API Endpoints

WebSocket events:
- `notification:new` - 新通知
- `workflow:status` - Workflow 狀態更新
- `approval:completed` - 審批完成

---

## 驗收標準

1. ✅ 用戶連接時自動認證
2. ✅ 新通知時 client 實時收到
3. ✅ Workflow 狀態變化時 client 收到更新
4. ✅ 斷線重連正常運作

---

## 預期輸出

1. `backend/src/notifications/notifications.gateway.ts`
2. `backend/src/notifications/notifications.module.ts`
3. Frontend Socket.io 集成
