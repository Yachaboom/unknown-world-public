# U-135 Backend Log Englishification Runbook

## 1. Overview

Backend Python code had Korean log messages scattered across ~20 files in `logger.*()` and `print()` calls. All Korean log messages have been converted to English to ensure consistent, parseable, and internationally readable log output.

**Estimated time**: 5 minutes

**Dependencies**:
- None (independent task)

---

## 2. Quick Start

### 2.1 Environment Setup

```bash
cd backend
pip install -r requirements.txt
```

### 2.2 Immediate Run

```bash
cd backend/src
set UW_MODE=mock
python -m uvicorn unknown_world.main:app --host 127.0.0.1 --port 8011
```

### 2.3 First Output Check

- Verify startup logs appear in English:
  - `[Config] .env file loaded` or `[Config] .env file not found or failed to load (using defaults)`
  - `[Startup] Unknown World backend starting`
  - `[Seed] Frontend scene directory not found, skipping seed` (or `[Seed] Scene image seeding complete`)
  - `[Startup] Unknown World backend started`
- Success indicator: No Korean characters in any log output line

---

## 3. Core Scenarios

### Scenario A: Startup Log Verification

**Purpose**: Verify all startup-related logs are in English

**Run**:

```bash
cd backend/src
set UW_MODE=mock
python -m uvicorn unknown_world.main:app --host 127.0.0.1 --port 8011
```

**Expected output** (no Korean):

```
[Startup] .env path: ...
[Startup] Unknown World backend starting
[Seed] Frontend scene directory not found, skipping seed
[Startup] Unknown World backend started
INFO: Uvicorn running on http://127.0.0.1:8011
```

**Check points**:

- ✅ `[Config]` messages in English
- ✅ `[Startup]` messages in English
- ✅ `[Seed]` messages in English
- ✅ No Korean characters in any log line

---

### Scenario B: Grep Verification (Comprehensive)

**Purpose**: Confirm zero Korean in logger/print calls across the entire backend

**Run**:

```bash
cd backend
rg "logger\.\w+\([^)]*[\uAC00-\uD7AF]" src/ tests/
rg "print\(.*[\uAC00-\uD7AF]" src/ tests/
```

**Expected output**: No matches found for both commands.

**Check points**:

- ✅ Single-line logger calls: 0 Korean matches
- ✅ Print calls: 0 Korean matches

For multiline logger calls:

```bash
rg -U "logger\.\w+\(\s*\n\s*\"[^\"]*[\uAC00-\uD7AF]" src/
```

**Expected output**: No matches found.

- ✅ Multiline logger calls: 0 Korean matches

---

### Scenario C: i18n Messages Preserved

**Purpose**: Verify BUSINESS_RULE_MESSAGES Korean entries are untouched

**Run**:

```bash
rg "BUSINESS_RULE_MESSAGES" backend/src/unknown_world/validation/business_rules.py
```

**Expected**: The `Language.KO` dictionary should still contain Korean error messages (these are i18n resources, NOT log messages).

**Check points**:

- ✅ `BUSINESS_RULE_MESSAGES[Language.KO]` contains Korean strings (expected, i18n policy)
- ✅ `REPAIR_FEEDBACK_MESSAGES[Language.KO]` contains Korean strings (expected, i18n policy)

---

### Scenario D: Lint/Type Check

**Purpose**: Verify no lint or type errors were introduced

**Run**:

```bash
cd backend
ruff format --check .
ruff check .
pyright
```

**Expected**: All checks pass with 0 errors.

**Check points**:

- ✅ `ruff format`: No reformatting needed
- ✅ `ruff check`: All checks passed
- ✅ `pyright`: 0 errors, 0 warnings

---

## 4. Verification Summary

### 4.1 Success Criteria

**Success**:

- ✅ All `logger.*()` calls contain English-only messages
- ✅ All `print()` calls (including docstring examples) contain English-only messages
- ✅ `[ModuleName]` prefix pattern preserved in all log messages
- ✅ `BUSINESS_RULE_MESSAGES` Korean i18n entries preserved (out of scope)
- ✅ No emoji characters in log messages
- ✅ `ruff check` and `pyright` pass with 0 errors

**Failure indicators**:

- ❌ Korean characters found in `logger.*()` calls → Re-run grep and fix
- ❌ Lint/type errors → Run `ruff check --fix` and `pyright`

---

## 5. Troubleshooting

### 5.1 Common Issues

**Issue**: Server startup fails on port conflict

- **Cause**: Port 8011 already in use
- **Solution**: Use a different port (8012-8020): `--port 8012`

**Issue**: `rg` (ripgrep) Korean regex not matching

- **Cause**: Unicode regex support varies by platform
- **Solution**: Use `rg -e "[\uAC00-\uD7AF]"` or Python script: `python -c "import re; ..."`

### 5.2 Platform Notes

- **Windows**: Console encoding may garble Korean characters that remain in docstrings/comments; this is expected and out of scope
- **macOS/Linux**: No special considerations

---

## 6. Scope & Exclusions

The following Korean text is **intentionally preserved** (out of U-135 scope):

- **Docstrings/comments**: Deferred to MMP (Q1 Option B decision)
- **BUSINESS_RULE_MESSAGES**: i18n policy (RULE-006), Korean messages for Korean users
- **REPAIR_FEEDBACK_MESSAGES**: Same i18n policy
- **Pydantic Field descriptions**: API documentation metadata
- **Narrative text strings**: User-facing game content (i18n)
- **Prompt files (.md)**: Prompt i18n (ko/en separation)
