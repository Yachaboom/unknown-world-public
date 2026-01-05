# U-027 pnpm kill 포트 제한(8001~8020) 실행 가이드

## 1. 개요

`pnpm kill` 스크립트가 **node.exe 전체를 종료**하던 동작을 제거하고, **RULE-011 포트 정책(8001~8020)에 맞춰 해당 포트만 정리**하도록 변경했습니다.

이제 `pnpm kill`은 다른 프로젝트의 Node 프로세스에 영향을 주지 않으며, Unknown World 프로젝트의 개발 서버 포트만 안전하게 정리합니다.

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: RU-001[Mvp] (포트 정책 RULE-011 정합화)
- 선행 완료 필요: 없음 (기존 `kill:port` 스크립트가 이미 존재)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 프로젝트 루트에서 의존성 확인 (필요 시)
pnpm install
```

### 2.2 즉시 실행

```bash
# 8001~8020 포트 범위의 모든 프로세스 종료
pnpm kill
```

### 2.3 결과 확인

```bash
# 정리된 포트 확인
netstat -ano | grep -E "800[1-9]|801[0-9]|8020"
# 결과가 비어있으면 성공
```

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 다른 프로젝트 프로세스 영향 없음 확인

**목적**: `pnpm kill`이 8001~8020 포트 대역 외의 Node 프로세스에 영향을 주지 않는지 검증

**전제 조건**:
- 8001~8020 대역 외의 포트에서 Node 프로세스가 실행 중이어야 함

**실행**:

1. **포트 대역 외에 테스트 서버 실행**:
```bash
node -e "require('http').createServer((req,res)=>{res.end('test')}).listen(9000, ()=>console.log('Test server on 9000'))"
```

2. **포트 9000 리스닝 확인**:
```bash
netstat -ano | grep 9000
# 예상: TCP 0.0.0.0:9000 LISTENING ...
```

3. **pnpm kill 실행**:
```bash
pnpm kill
```

4. **포트 9000 프로세스 생존 확인**:
```bash
netstat -ano | grep 9000
# 예상: 여전히 LISTENING 상태 (PID 동일)
```

**확인 포인트**:
- ✅ `pnpm kill` 실행 후에도 포트 9000의 프로세스가 살아있음
- ✅ 8001~8020 포트만 "Process on port XXXX killed" 메시지가 출력됨
- ✅ 다른 프로젝트의 Node 프로세스에 영향 없음

**정리**:
```bash
# 테스트 후 9000 포트 프로세스 수동 종료
npx --yes kill-port 9000
```

---

### 시나리오 B: 개발 서버 정리 확인

**목적**: 프론트엔드/백엔드 개발 서버가 `pnpm kill`로 정상 정리되는지 검증

**전제 조건**:
- 포트 8001~8020이 시스템 예약 포트가 아니어야 함 (Windows에서 Hyper-V 등으로 예약될 수 있음)

**실행 순서**:

1. **개발 서버 실행**:
```bash
# 터미널 1: 프론트엔드
pnpm dev:front

# 터미널 2: 백엔드
pnpm dev:back
```

2. **포트 리스닝 확인**:
```bash
netstat -ano | grep -E "8001|8011"
# 예상: 8001 (프론트), 8011 (백엔드) LISTENING
```

3. **pnpm kill 실행**:
```bash
pnpm kill
```

4. **포트 정리 확인**:
```bash
netstat -ano | grep -E "8001|8011"
# 예상: 결과 없음 (모두 종료됨)
```

**확인 포인트**:
- ✅ 프론트엔드 (8001) 프로세스 종료됨
- ✅ 백엔드 (8011) 프로세스 종료됨
- ✅ 개발 서버 재시작 가능

---

### 시나리오 C: 서브 스크립트 개별 테스트

**목적**: `kill:front`, `kill:back` 스크립트가 각각 의도한 포트 범위만 정리하는지 확인

**실행**:

```bash
# 프론트엔드 포트만 정리 (8001~8010)
pnpm kill:front

# 백엔드 포트만 정리 (8011~8020)
pnpm kill:back
```

**확인 포인트**:
- ✅ `kill:front`는 8001~8010 범위만 정리
- ✅ `kill:back`은 8011~8020 범위만 정리

---

## 4. 실행 결과 확인

### 4.1 콘솔 출력 예시

```
> unknown-world@0.1.0 kill D:\Dev\unknown-world
> npx --yes kill-port 8001 8002 ... 8020

Process on port 8001 killed
Process on port 8011 killed
...
```

### 4.2 성공/실패 판단 기준

**성공**:
- ✅ 8001~8020 포트의 프로세스만 종료됨
- ✅ 다른 포트(예: 3000, 5173, 9000)의 프로세스는 영향 없음
- ✅ `--yes` 옵션으로 npx 설치 확인 프롬프트 없이 실행됨

**실패 시 확인**:
- ❌ "Process on port XXXX killed" 메시지가 없음 → 해당 포트에 프로세스가 없었음 (정상)
- ❌ npx 프롬프트로 멈춤 → `--yes` 옵션이 누락되었는지 확인
- ❌ 권한 에러(EACCES) → Windows에서 포트 예약 상태 확인 필요

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `npm warn Unknown env config ...`
- **원인**: npm 환경 설정 경고 (무시해도 무방)
- **해결**: 기능에 영향 없음, 무시

**오류**: `Error: listen EACCES: permission denied ::1:8001`
- **원인**: Windows에서 8001 포트가 시스템 예약됨 (Hyper-V 등)
- **해결**:
  1. 관리자 권한 PowerShell에서 예약 포트 확인:
     ```powershell
     netsh int ipv4 show excludedportrange protocol=tcp
     ```
  2. 예약 범위에 8001~8020이 포함되면:
     ```powershell
     # Hyper-V 비활성화 후 재부팅
     dism.exe /Online /Disable-Feature:Microsoft-Hyper-V
     # 또는 포트 대역 변경 검토
     ```

### 5.2 환경별 주의사항

- **Windows**: Hyper-V, WSL2 등이 동적 포트 범위를 예약할 수 있음. 위 EACCES 해결 참조.
- **macOS/Linux**: 일반적으로 8001~8020 포트 사용에 제약 없음

---

## 6. 스크립트 요약

| 스크립트 | 포트 범위 | 설명 |
|---------|----------|------|
| `pnpm kill` | 8001~8020 | 전체 개발 서버 포트 정리 (안전) |
| `pnpm kill:port` | 8001~8020 | `kill`과 동일 (별칭) |
| `pnpm kill:front` | 8001~8010 | 프론트엔드 포트만 정리 |
| `pnpm kill:back` | 8011~8020 | 백엔드 포트만 정리 |

**변경 사항** (U-027):
- 기존: `taskkill /IM node.exe` + `taskkill /IM uvicorn.exe` (광역 종료)
- 변경: `npx --yes kill-port 8001~8020` (포트 기반 정리)

