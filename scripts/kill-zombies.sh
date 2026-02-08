#!/usr/bin/env bash
# ============================================================================
# kill-zombies.sh — 좀비 포트/프로세스 정리 (Windows + Unix 호환)
#
# 문제 배경:
#   Windows에서 uvicorn --reload 사용 시 reloader(부모)→worker(자식) 구조인데,
#   kill-port가 부모만 죽이면 자식이 좀비로 남아 포트를 계속 점유한다.
#   또한, 프로세스를 죽여도 Windows 커널이 TCP 소켓 엔트리를 즉시 정리하지 않아
#   "유령 소켓(ghost socket)"이 남아 새 서버의 바인딩을 방해한다.
#
# 해결:
#   1) PowerShell Stop-Process로 실제 살아있는 프로세스를 트리 킬
#   2) 유령 소켓(프로세스 없는 소켓) 감지 및 포트 해제 대기
#   3) 최대 10초 대기 후에도 해제 안 되면 경고 출력
#
# 수정 이력:
#   2026-02-08  유령 소켓 대응 + PowerShell 기반 킬 (U-127 디버깅 중 발견)
#
# 사용:  bash scripts/kill-zombies.sh
# ============================================================================

set -euo pipefail

PORTS=(8001 8002 8003 8004 8005 8006 8007 8008 8009 8010
       8011 8012 8013 8014 8015 8016 8017 8018 8019 8020)

killed=0

# ---------- OS 감지 ----------
is_windows() {
  [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]] || \
  [[ -n "${OS:-}" && "$OS" == "Windows_NT" ]]
}

# ---------- Windows: PowerShell 기반 프로세스 정리 ----------
kill_zombies_windows() {
  echo "[kill-zombies] Windows: 포트 점유 프로세스 탐색 (PowerShell)..."

  # PowerShell 스크립트를 임시 파일로 작성 (인코딩 문제 회피)
  local ps_script
  ps_script=$(mktemp --suffix=.ps1 2>/dev/null || echo "/tmp/_kz_$$.ps1")

  cat > "$ps_script" << 'PSEOF'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ports = @(8001,8002,8003,8004,8005,8006,8007,8008,8009,8010,
           8011,8012,8013,8014,8015,8016,8017,8018,8019,8020)
$killed = 0
$ghosts = 0

# 포트별 소유 PID 수집
$pids = @()
foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($c in $conns) {
            $pids += $c.OwningProcess
        }
    }
}
$uniquePids = $pids | Sort-Object -Unique

if ($uniquePids.Count -eq 0) {
    Write-Host "[kill-zombies] 좀비 프로세스 없음"
    exit 0
}

Write-Host "[kill-zombies] $($uniquePids.Count)개 PID 발견"

foreach ($procId in $uniquePids) {
    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if (-not $proc) {
        # 유령 소켓: 프로세스가 없지만 소켓이 남음
        $ghosts++
        continue
    }

    $name = $proc.ProcessName
    Write-Host "[kill-zombies]   killing PID ${procId} ($name)..."

    # 자식 프로세스 먼저 종료 (uvicorn worker 등)
    $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$procId" -ErrorAction SilentlyContinue
    if ($children) {
        foreach ($child in $children) {
            try {
                Stop-Process -Id $child.ProcessId -Force -ErrorAction Stop
                Write-Host "[kill-zombies]     child PID $($child.ProcessId) ($($child.Name)) killed"
                $killed++
            } catch {
                # 무시 (이미 죽었을 수 있음)
            }
        }
    }

    # 부모 프로세스 종료
    try {
        Stop-Process -Id $procId -Force -ErrorAction Stop
        Write-Host "[kill-zombies]     PID ${procId} killed"
        $killed++
    } catch {
        Write-Host "[kill-zombies]     PID ${procId} skip (already dead)"
    }
}

if ($ghosts -gt 0) {
    Write-Host "[kill-zombies] $ghosts개 유령 소켓 감지 (프로세스 없는 커널 소켓 잔존)"
}

# 포트 해제 대기 (유령 소켓이 정리될 때까지)
$maxWait = 10
for ($i = 1; $i -le $maxWait; $i++) {
    Start-Sleep -Seconds 1
    $remaining = @()
    foreach ($port in $ports) {
        $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($conns) { $remaining += $port }
    }
    $remaining = $remaining | Sort-Object -Unique
    if ($remaining.Count -eq 0) {
        Write-Host "[kill-zombies] 포트 해제 확인 완료 (${i}초)"
        Write-Host "[kill-zombies] done: ${killed}개 프로세스 종료"
        exit 0
    }
    if ($i -eq 1 -or $i -eq 5 -or $i -eq $maxWait) {
        Write-Host "[kill-zombies] 대기 ${i}/${maxWait}초... 잔존 포트: $($remaining -join ', ')"
    }
}

# 마지막 확인
$stillBusy = @()
foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conns) { $stillBusy += $port }
}
$stillBusy = $stillBusy | Sort-Object -Unique
if ($stillBusy.Count -gt 0) {
    Write-Host "[kill-zombies] WARNING: $($stillBusy.Count)개 포트 아직 점유: $($stillBusy -join ', ')"
    Write-Host "[kill-zombies]   유령 소켓은 Windows 커널이 자동 정리할 때까지 30-120초 소요"
    Write-Host "[kill-zombies]   긴급 시 다른 포트 사용: uvicorn ... --port 8099"
}

Write-Host "[kill-zombies] done: ${killed}개 프로세스 종료, $ghosts개 유령 소켓"
PSEOF

  # PowerShell 실행
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$ps_script" 2>&1
  local exit_code=$?

  # 임시 파일 정리
  rm -f "$ps_script" 2>/dev/null || true

  return $exit_code
}

# ---------- Unix (macOS/Linux): lsof + kill ----------
kill_zombies_unix() {
  echo "[kill-zombies] Unix: 포트 점유 좀비 프로세스 탐색..."

  local pids=()

  for port in "${PORTS[@]}"; do
    while IFS= read -r pid; do
      [[ -n "$pid" ]] && pids+=("$pid")
    done < <(lsof -ti ":${port}" 2>/dev/null || true)
  done

  if [[ ${#pids[@]} -eq 0 ]]; then
    echo "[kill-zombies] 좀비 프로세스 없음"
    return
  fi

  local unique_pids
  unique_pids=($(printf '%s\n' "${pids[@]}" | sort -un))

  echo "[kill-zombies] ${#unique_pids[@]}개 좀비 PID 발견: ${unique_pids[*]}"

  for pid in "${unique_pids[@]}"; do
    if kill -9 "$pid" 2>/dev/null; then
      echo "[kill-zombies]   killed PID $pid"
      ((killed++))
    else
      echo "[kill-zombies]   skip  PID $pid (already dead or protected)"
    fi
  done
}

# ---------- 실행 ----------
if is_windows; then
  kill_zombies_windows
else
  kill_zombies_unix
fi
