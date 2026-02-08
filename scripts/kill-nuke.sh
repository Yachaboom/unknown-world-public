#!/usr/bin/env bash
# ============================================================================
# kill-nuke.sh — 유령 소켓까지 완전 정리 (Windows 전용, Unix에서는 kill과 동일)
#
# Windows에서 프로세스를 죽여도 커널 TCP 소켓이 30~120초간 LISTENING으로 남는
# "유령 소켓(ghost socket)" 문제가 있다. 이 스크립트는:
#   1) 모든 Python/Node 관련 프로세스를 강제 종료
#   2) 포트가 해제될 때까지 최대 30초 대기
#   3) 해제 확인 후 종료
#
# 사용: pnpm kill:nuke   (pnpm kill 실행 후에도 포트 점유 시)
# ============================================================================

set -euo pipefail

PORTS=(8001 8002 8003 8004 8005 8006 8007 8008 8009 8010
       8011 8012 8013 8014 8015 8016 8017 8018 8019 8020)

is_windows() {
  [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]] || \
  [[ -n "${OS:-}" && "$OS" == "Windows_NT" ]]
}

nuke_windows() {
  echo "[kill-nuke] Windows: 강제 정리 시작..."

  # 1) uvicorn/python 관련 프로세스 일괄 종료
  echo "[kill-nuke] Step 1: Python/uvicorn 프로세스 트리 킬..."
  taskkill //IM python.exe //T //F 2>/dev/null && echo "[kill-nuke]   python.exe killed" || true
  taskkill //IM python3.exe //T //F 2>/dev/null && echo "[kill-nuke]   python3.exe killed" || true
  taskkill //IM uvicorn.exe //T //F 2>/dev/null && echo "[kill-nuke]   uvicorn.exe killed" || true

  # 2) 포트 해제 대기 (최대 30초)
  echo "[kill-nuke] Step 2: 포트 해제 대기 (최대 30초)..."
  local max_wait=30
  for ((i=1; i<=max_wait; i++)); do
    sleep 1
    local busy=0
    for port in "${PORTS[@]}"; do
      if netstat -ano 2>/dev/null | grep -q ":${port} .*LISTEN"; then
        busy=1
        break
      fi
    done
    if [[ $busy -eq 0 ]]; then
      echo "[kill-nuke] 포트 해제 확인 완료! (${i}초)"
      return 0
    fi
    if (( i % 5 == 0 )); then
      echo "[kill-nuke]   ${i}/${max_wait}초 대기 중..."
    fi
  done

  # 3) 최종 확인
  local still_busy=()
  for port in "${PORTS[@]}"; do
    if netstat -ano 2>/dev/null | grep -q ":${port} .*LISTEN"; then
      still_busy+=("$port")
    fi
  done

  if [[ ${#still_busy[@]} -gt 0 ]]; then
    echo "[kill-nuke] WARNING: 포트 아직 점유 중: ${still_busy[*]}"
    echo "[kill-nuke]   유령 소켓이 Windows 커널에 남아있습니다."
    echo "[kill-nuke]   해결 방법:"
    echo "[kill-nuke]     1) 30초 더 기다린 후 pnpm dev:back"
    echo "[kill-nuke]     2) (즉시 필요 시) 작업 관리자에서 전체 터미널 세션 종료 후 재시작"
    return 1
  fi

  echo "[kill-nuke] 완전 정리 완료!"
}

nuke_unix() {
  echo "[kill-nuke] Unix: 표준 정리 실행..."
  # Unix에서는 kill -9로 충분
  for port in "${PORTS[@]}"; do
    local pid
    pid=$(lsof -ti ":${port}" 2>/dev/null || true)
    if [[ -n "$pid" ]]; then
      kill -9 "$pid" 2>/dev/null && echo "[kill-nuke]   port $port: killed PID $pid" || true
    fi
  done
  echo "[kill-nuke] done"
}

if is_windows; then
  nuke_windows
else
  nuke_unix
fi
