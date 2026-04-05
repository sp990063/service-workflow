# SPEC: Workflow Analytics

## 目標

實現 Workflow Analytics 功能：
- 邊個 workflow 最多人用
- 平均審批時間
- 審批通過率
- Dashboard widgets

---

## API Endpoints

```
GET /api/analytics/overview          - 總覽統計
GET /api/analytics/workflows/:id      - 指定 workflow 統計
GET /api/analytics/users/:id         - 指定用戶統計
GET /api/analytics/approval-times    - 審批時間統計
```

---

## 實現要求

### AnalyticsService

```typescript
@Injectable()
export class AnalyticsService {
  
  // Overview statistics
  async getOverview(): Promise<{
    totalWorkflows: number;
    activeInstances: number;
    completedToday: number;
    averageApprovalTime: number;
  }>
  
  // Workflow-specific stats
  async getWorkflowStats(workflowId: string): Promise<{
    totalInstances: number;
    completed: number;
    rejected: number;
    averageDuration: number;
  }>
  
  // Most used workflows
  async getMostUsedWorkflows(limit: number): Promise<any[]>
  
  // Approval time trends
  async getApprovalTimeTrends(days: number): Promise<any[]>
}
```

---

## 驗收標準

1. ✅ Dashboard widget shows key metrics
2. ✅ Admin can view workflow analytics
3. ✅ Average approval time calculated
4. ✅ Completion rate tracked
