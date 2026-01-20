# Test Impact Report Template

This document tracks test-related decisions and changes throughout the workflow. It is created by the Requirements Agent and updated by each subsequent stage.

## Usage

1. **Requirements Agent**: Creates this file, runs existing tests, identifies impact
2. **Architecture Agent**: Adds test architecture decisions, detailed test plan
3. **Implementation Agent**: Updates with actual test changes, tracks deviations
4. **QA Agent**: Verifies predictions, documents final state

## Template

```md
---
id: {WORK_ITEM_ID}
title: "{Title}"
created_by: requirements-agent
created_at: {ISO timestamp}
last_updated_by: {agent}
last_updated_at: {ISO timestamp}
---

# Test Impact Report: {Title}

## 1. Existing Test Baseline (Requirements Stage)

### Test Suite Summary
| Suite | Total Tests | Passing | Failing | Skipped |
|-------|-------------|---------|---------|---------|
| Unit | X | X | X | X |
| Integration | X | X | X | X |
| E2E | X | X | X | X |

### Baseline Test Run
```bash
# Command used
npm run test

# Summary
{paste summary output}
```

### Related Test Files Discovered
| Test File | Type | Tests | Relevance | Predicted Impact |
|-----------|------|-------|-----------|------------------|
| {path} | Unit | {count} | High/Med/Low | Modify/Delete/Keep |

### Tests Predicted to Break/Change
| Test | File | Reason | Action Needed |
|------|------|--------|---------------|
| {test name} | {path} | {why it will break} | Modify/Delete/Update |

### New Test Coverage Needed
| Area | Type | Priority | Reason |
|------|------|----------|--------|
| {feature area} | Unit/E2E | High/Med/Low | {why needed} |

---

## 2. Test Architecture Decisions (Architecture Stage)

### Test Tooling
| Need | Tool | Status | Notes |
|------|------|--------|-------|
| {testing need} | {tool} | Existing/New | {notes} |

### New Test Infrastructure
- [ ] {new fixture/helper/config needed}

### Test File Plan
| Test File | Type | New/Modify | Test Cases Planned |
|-----------|------|------------|-------------------|
| {path} | Unit | New | {case 1}, {case 2} |
| {path} | E2E | Modify | {case 1} |

### Test Data Strategy
{How test data will be managed - factories, fixtures, mocks}

---

## 3. Test Implementation Tracking (Implementation Stage)

### Pre-Implementation Test Run
```bash
# Verify baseline before changes
{test output summary}
```

### Tests Written (TDD - RED phase)
| Test File | Test Case | Status | Notes |
|-----------|-----------|--------|-------|
| {path} | {test name} | RED/GREEN | {notes} |

### Tests Modified
| Test File | Original | Change | Reason |
|-----------|----------|--------|--------|
| {path} | {original test} | {what changed} | {why} |

### Tests Deleted
| Test File | Test | Reason |
|-----------|------|--------|
| {path} | {test name} | {why deleted} |

### Deviations from Test Plan
| Planned | Actual | Reason |
|---------|--------|--------|
| {what was planned} | {what happened} | {why deviated} |

---

## 4. Test Verification (QA Stage)

### Final Test Run
```bash
# Full test suite
{test output summary}
```

### Test Impact Accuracy
| Prediction | Actual | Accurate? |
|------------|--------|-----------|
| {predicted change} | {what happened} | Yes/No |

### Test Coverage Assessment
| Area | Planned Coverage | Actual Coverage | Gap? |
|------|-----------------|-----------------|------|
| {area} | {planned} | {actual} | Yes/No |

### Tests Added by QA
| Test File | Test Case | Type | Reason |
|-----------|-----------|------|--------|
| {path} | {test} | Unit/E2E | {gap filled} |

### Final Test Summary
| Suite | Before | After | Delta |
|-------|--------|-------|-------|
| Unit | X | Y | +/- Z |
| Integration | X | Y | +/- Z |
| E2E | X | Y | +/- Z |

---

## Sign-off

- [ ] Requirements: Test impact analysis complete
- [ ] Architecture: Test plan complete
- [ ] Implementation: All planned tests written
- [ ] QA: Test coverage verified

---
*Test Impact Report for {WORK_ITEM_ID}*
```
