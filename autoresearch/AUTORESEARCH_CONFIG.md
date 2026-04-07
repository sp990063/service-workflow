# Autoresearch Config - Service Workflow E2E Tests
# Branch: autoresearch-trial

## GOAL
Improve E2E test pass rate and eliminate flakiness in SCN-* scenario tests.

## METRIC
```
npx playwright test --reporter=line 2>&1 | grep -E "^\[|^$" | tail -5
```
Success = all tests pass (0 failures)
Failure = any test fails

## SCOPE (Read-Write)
- `tests/e2e/scenarios.spec.ts` - SCN-* scenario tests
- `tests/e2e/workflow-instance-detail.spec.ts` - instance detail tests
- `backend/src/workflows/` - workflow controller and service logic
- `frontend/src/app/features/workflow-instance-detail/` - Angular component logic

## SCOPE (Read-Only)
- `backend/src/` - all other backend code
- `frontend/src/` - all other frontend code
- `tests/e2e/*.spec.ts` - other E2E tests
- Infrastructure code (Docker, database, etc.)

## BASELINE (Iteration #0)
```
cd /home/cwlai/.openclaw/workspace/service-workflow
npx playwright test --grep "SCN-IT|SCN-REVIEW" 2>&1 | tail -20
```

## VERIFY COMMAND
```bash
cd /home/cwlai/.openclaw/workspace/service-workflow
npx playwright test --grep "SCN-IT|SCN-REVIEW" 2>&1
# Exit code 0 = success, non-zero = failure
```

## PROBLEM CONTEXT
From recent commits:
- SCN-IT-001-P: Employee submits form with budget=5000, manager approves via dashboard, expects `.parallel-section` visible
- SCN-IT-002-P: Progresses through sequential + parallel approval
- SCN-IT-002-N: Rejected at manager blocks IT/Finance
- SCN-REVIEW: Workflow created (ID: 21ff3363-fa83-43bb-b652-710c77149aca)

Root cause from investigation:
- Condition evaluation happens async with 300ms setTimeout
- Backend may not persist state before next call
- Status stays IN_PROGRESS until workflow completes - need to check currentNodeId

## ITERATION LOG
Results are logged to: `../autoresearch-results.tsv`
