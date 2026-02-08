#!/usr/bin/env bash
# ============================================================================
# kill-zombies.sh — 좀비 포트/프로세스 정리 (Windows + Unix 호환)
#
# 문제 배경:
#   Windows에서 uvicorn --reload 사용 시 reloader(부모)→worker(자식) 구조인데,
#   kill-port가 부모만 죽이면 자식이 좀비로 남아 포트를 계속 점유한다.
#   이 스크립트는 kill-port 이후 남은 좀비까지 확실히 제거한다.
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

# ---------- Windows: netstat + taskkill ----------
kill_zombies_windows() {
  echo "[kill-zombies] Windows: 포트 점유 좀비 프로세스 탐색..."

  local pids=()

  for port in "${PORTS[@]}"; do
    # netstat에서 LISTENING 상태의 PID 추출
    while IFS= read -r pid; do
      [[ -n "$pid" && "$pid" != "0" ]] && pids+=("$pid")
    done < <(netstat -ano 2>/dev/null | grep ":${port} " | grep "LISTEN" | awk '{print $NF}' | sort -u)
  done

  # 중복 PID 제거
  if [[ ${#pids[@]} -eq 0 ]]; then
    echo "[kill-zombies] 좀비 프로세스 없음"
    return
  fi

  local unique_pids
  unique_pids=($(printf '%s\n' "${pids[@]}" | sort -un))

  echo "[kill-zombies] ${#unique_pids[@]}개 좀비 PID 발견: ${unique_pids[*]}"

  for pid in "${unique_pids[@]}"; do
    # taskkill로 직접 종료 시도 — 시스템 프로세스는 ACCESS DENIED로 자동 보호됨
    if taskkill //PID "$pid" //F >/dev/null 2>&1; then
      echo "[kill-zombies]   killed PID $pid"
      ((killed++))
    else
      # taskkill 실패 = 이미 죽었거나 시스템 프로세스 → 무시
      echo "[kill-zombies]   skip  PID $pid (already dead or protected)"
    fi
  done
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

echo "[kill-zombies] done — ${killed}개 좀비 제거"
