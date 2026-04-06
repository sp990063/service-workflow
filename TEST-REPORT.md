# Test Report - Service Workflow

**Last Updated:** 2026-04-06 13:15 GMT+8
**Test Framework:** Playwright E2E + Jest Integration
**Base URL:** http://localhost:4200

---

## ✅ 今日維修記錄

| 問題 | 修復 | 狀態 |
|------|------|------|
| form-elements.spec.ts login 超時 | 改 `waitForURL` → `waitForSelector` nav | ✅ 已修 |
| form-validation-neg.spec.ts selector 錯誤 | `.node-item` → 正確 selector | ✅ 已修 |
| admin-settings.spec.ts settings page assertion | 修正 error state 判斷 | ✅ 已修 |
| workflow.spec.ts workflows list selector 錯誤 | `.node-item` → `.workflow-card` | ✅ 已修 |
| **Workflow save 500 error** | `nodes`/`connections` undefined 時 `JSON.stringify` 返回 `undefined` 而非字串 | ✅ 已修 |
| **Backend ConfigService DI error** | `NotificationsModule` 未 providers `ConfigService` | ✅ 已修 |

---

## 當前測試結果

| Suite | 結果 | 備註 |
|-------|------|------|
| analytics.spec.ts | ✅ 7/7 | |
| delegations.spec.ts | ✅ 7/7 | |
| prototype.spec.ts | ⚠️ ~18/19 | TC-FORM-006 仍失敗 |
| rbac.spec.ts | ✅ 26/26 | |
| core-features.spec.ts | ✅ 36/39 | 3 skipped |
| security.spec.ts | ✅ 13/13 | |
| accessibility.spec.ts | ✅ 4/7 | 3 skipped |
| form-elements.spec.ts | ✅ 15/15 | |
| form-validation-neg.spec.ts | ⚠️ 待確認 | 之前 timeout |
| admin-settings.spec.ts | ✅ 5/5 | |
| workflow.spec.ts | ⚠️ 待確認 | 剛修好 backend |
| subworkflow.spec.ts | ⚠️ ~3/4 | TC-SUB-005 仍失敗 |
| workflow-realistic.spec.ts | ❌ ~1/3 | stale data + selector 問題 |
| form-versioning.spec.ts | ❌ ~0/1 | Versions button 不出現 |
| complex-scenarios.spec.ts | ❌ timeout | 需要修復 login |
| missing-features.spec.ts | ✅ 18/44 | 預期失敗 |

**Backend Integration: ✅ 102/102 全部通過**

---

## 待修復問題

### P1 - 影響主要功能
1. **TC-WFDESIGN-003** - Workflow save（已修 backend，但需重新跑 E2E 確認）
2. **TC-WFPLAYER-001/002** - Workflow player 步進問題
3. **TC-SUB-005** - Sub-workflow child workflow ID undefined
4. **TC-FV-001** - Form versioning Versions button 不出現
5. **workflow-realistic.spec.ts** - Stale test data + `.approval-section` selector

### P2 - Test Code Bugs
6. **complex-scenarios.spec.ts** - 31 tests timeout（login 問題）
7. **scenarios.spec.ts** - 未測試

---

*Updated: 2026-04-06 13:15 GMT+8*
