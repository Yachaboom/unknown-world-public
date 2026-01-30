/**
 * Unknown World - Scanner 슬롯 컴포넌트 (U-022[Mvp]).
 *
 * 이미지 드랍/업로드 → 백엔드 분석 → 아이템 후보 표시 → 인벤토리 추가.
 *
 * 설계 원칙:
 *   - RULE-002: 채팅 UI 금지, 게임 UI로 표시
 *   - RULE-004: 실패 시 안전한 폴백 (에러 표시)
 *   - PRD 6.7: Scanner 슬롯 멀티모달 데모 핵심
 *
 * 페어링 질문 결정:
 *   - Q1: Option B - 사용자 확인 후 인벤토리 추가 (의도 통제)
 *
 * @module components/ScannerSlot
 */

import { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  scanImage,
  isSupportedImageFile,
  candidateToInventoryItem,
  type ScannerResponse,
  type ItemCandidate,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from '../api/scanner';
import { useInventoryStore } from '../stores/inventoryStore';
import { useAgentStore } from '../stores/agentStore';
import type { Language } from '../schemas/turn';

// =============================================================================
// 타입 정의
// =============================================================================

/** Scanner 슬롯 상태 */
type ScannerState = 'idle' | 'uploading' | 'analyzing' | 'result' | 'error';

/** 컴포넌트 Props */
interface ScannerSlotProps {
  /** 세션 언어 (SSOT) */
  language: Language;
  /** 비활성화 여부 (스트리밍 중 등) */
  disabled?: boolean;
}

// =============================================================================
// 컴포넌트
// =============================================================================

/**
 * Scanner 슬롯 컴포넌트.
 *
 * 이미지를 드래그/업로드하면 백엔드 Scanner API를 호출하여
 * 아이템 후보를 추출하고, 사용자가 선택하여 인벤토리에 추가합니다.
 */
export function ScannerSlot({ language, disabled = false }: ScannerSlotProps) {
  const { t } = useTranslation();
  const { addItems } = useInventoryStore();
  const { isStreaming } = useAgentStore();

  // 상태
  const [state, setState] = useState<ScannerState>('idle');
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScannerResponse | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 파일 입력 ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 실제 비활성화 상태
  const isDisabled = disabled || isStreaming;

  // =========================================================================
  // 핸들러
  // =========================================================================

  /**
   * 파일 처리 (업로드 및 분석).
   */
  const handleFile = useCallback(
    async (file: File) => {
      if (isDisabled) return;

      // 파일 형식 검증
      if (!isSupportedImageFile(file)) {
        setErrorMessage(t('scanner.error.unsupported_format'));
        setState('error');
        return;
      }

      // 파일 크기 검증
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setErrorMessage(t('scanner.error.file_too_large'));
        setState('error');
        return;
      }

      // 프리뷰 생성
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);

      // 상태 초기화
      setErrorMessage(null);
      setScanResult(null);
      setSelectedCandidates(new Set());
      setState('uploading');

      try {
        setState('analyzing');
        const result = await scanImage(file, language);

        if (result.success) {
          setScanResult(result.data);
          // 기본적으로 모든 후보를 선택
          const allIds = new Set(result.data.item_candidates.map((c) => c.id));
          setSelectedCandidates(allIds);
          setState('result');
        } else {
          setErrorMessage(result.error);
          setState('error');
        }
      } catch {
        setErrorMessage(t('scanner.error.unknown'));
        setState('error');
      }
    },
    [isDisabled, language, t],
  );

  /**
   * 드래그 오버 핸들러.
   */
  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDisabled) {
        setIsDragOver(true);
      }
    },
    [isDisabled],
  );

  /**
   * 드래그 종료 핸들러.
   */
  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  /**
   * 드롭 핸들러.
   */
  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (isDisabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        void handleFile(files[0]);
      }
    },
    [isDisabled, handleFile],
  );

  /**
   * 파일 선택 핸들러.
   */
  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        void handleFile(files[0]);
      }
      // 입력 초기화 (같은 파일 재선택 허용)
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFile],
  );

  /**
   * 파일 선택 버튼 클릭.
   */
  const handleBrowseClick = useCallback(() => {
    if (!isDisabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [isDisabled]);

  /**
   * 후보 선택 토글.
   */
  const handleCandidateToggle = useCallback((candidateId: string) => {
    setSelectedCandidates((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  }, []);

  /**
   * 선택한 아이템을 인벤토리에 추가.
   * Q1 Option B: 사용자 확인 후 추가.
   */
  const handleAddToInventory = useCallback(() => {
    if (!scanResult || selectedCandidates.size === 0) return;

    const selectedItems = scanResult.item_candidates
      .filter((c) => selectedCandidates.has(c.id))
      .map(candidateToInventoryItem);

    addItems(selectedItems);

    // 상태 초기화
    setState('idle');
    setScanResult(null);
    setSelectedCandidates(new Set());
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [scanResult, selectedCandidates, addItems, previewUrl]);

  /**
   * 취소/리셋.
   */
  const handleReset = useCallback(() => {
    setState('idle');
    setScanResult(null);
    setSelectedCandidates(new Set());
    setErrorMessage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  // =========================================================================
  // 렌더링
  // =========================================================================

  return (
    <div className="scanner-slot-container">
      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_MIME_TYPES.join(',')}
        onChange={handleFileChange}
        className="visually-hidden"
        aria-label={t('scanner.upload_label')}
      />

      {/* 상태별 렌더링 */}
      {state === 'idle' && (
        <div
          className={`scanner-dropzone ${isDragOver ? 'drag-over' : ''} ${isDisabled ? 'disabled' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
          role="button"
          tabIndex={isDisabled ? -1 : 0}
          aria-label={t('scanner.dropzone_label')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleBrowseClick();
            }
          }}
        >
          <div className="scanner-dropzone-icon">📷</div>
          <div className="scanner-dropzone-text">{t('scanner.dropzone_text')}</div>
          <div className="scanner-dropzone-hint">{t('scanner.dropzone_hint')}</div>
        </div>
      )}

      {(state === 'uploading' || state === 'analyzing') && (
        <div className="scanner-loading">
          {previewUrl && (
            <div className="scanner-preview">
              <img
                src={previewUrl}
                alt={t('scanner.preview_alt')}
                className="scanner-preview-img"
              />
            </div>
          )}
          <div className="scanner-loading-content">
            <div className="scanner-loading-spinner" />
            <div className="scanner-loading-text">
              {state === 'uploading' ? t('scanner.uploading') : t('scanner.analyzing')}
            </div>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="scanner-error">
          {previewUrl && (
            <div className="scanner-preview">
              <img
                src={previewUrl}
                alt={t('scanner.preview_alt')}
                className="scanner-preview-img"
              />
            </div>
          )}
          <div className="scanner-error-content">
            <div className="scanner-error-icon">⚠️</div>
            <div className="scanner-error-message">{errorMessage}</div>
            <button type="button" className="scanner-btn scanner-btn-retry" onClick={handleReset}>
              {t('scanner.retry')}
            </button>
          </div>
        </div>
      )}

      {state === 'result' && scanResult && (
        <div className="scanner-result">
          {/* 프리뷰 + 캡션 */}
          <div className="scanner-result-header">
            {previewUrl && (
              <div className="scanner-preview-small">
                <img
                  src={previewUrl}
                  alt={t('scanner.preview_alt')}
                  className="scanner-preview-img-small"
                />
              </div>
            )}
            <div className="scanner-result-info">
              <div className="scanner-caption">{scanResult.caption}</div>
              <div className="scanner-stats">
                {t('scanner.detected_objects', { count: scanResult.objects.length })} •{' '}
                {t('scanner.item_candidates', { count: scanResult.item_candidates.length })}
              </div>
            </div>
          </div>

          {/* 아이템 후보 목록 */}
          {scanResult.item_candidates.length > 0 ? (
            <div className="scanner-candidates">
              <div className="scanner-candidates-title">{t('scanner.select_items')}</div>
              <div className="scanner-candidates-list">
                {scanResult.item_candidates.map((candidate) => (
                  <CandidateItem
                    key={candidate.id}
                    candidate={candidate}
                    selected={selectedCandidates.has(candidate.id)}
                    onToggle={() => handleCandidateToggle(candidate.id)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="scanner-no-candidates">{t('scanner.no_candidates')}</div>
          )}

          {/* 액션 버튼 */}
          <div className="scanner-actions">
            <button type="button" className="scanner-btn scanner-btn-cancel" onClick={handleReset}>
              {t('scanner.cancel')}
            </button>
            <button
              type="button"
              className="scanner-btn scanner-btn-add"
              onClick={handleAddToInventory}
              disabled={selectedCandidates.size === 0}
            >
              {t('scanner.add_to_inventory', { count: selectedCandidates.size })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// 서브 컴포넌트
// =============================================================================

interface CandidateItemProps {
  candidate: ItemCandidate;
  selected: boolean;
  onToggle: () => void;
}

/**
 * 아이템 후보 컴포넌트.
 */
function CandidateItem({ candidate, selected, onToggle }: CandidateItemProps) {
  const { t } = useTranslation();

  // 아이템 타입에 따른 이모지
  const emoji = getItemTypeEmoji(candidate.item_type);

  return (
    <button
      type="button"
      className={`scanner-candidate ${selected ? 'selected' : ''}`}
      onClick={onToggle}
      aria-pressed={selected}
    >
      <span className="scanner-candidate-checkbox">{selected ? '☑' : '☐'}</span>
      <span className="scanner-candidate-icon">{emoji}</span>
      <span className="scanner-candidate-info">
        <span className="scanner-candidate-name">{candidate.label}</span>
        {candidate.description && (
          <span className="scanner-candidate-desc">{candidate.description}</span>
        )}
        <span className="scanner-candidate-type">
          {t(`scanner.item_type.${candidate.item_type}`, { defaultValue: candidate.item_type })}
        </span>
      </span>
    </button>
  );
}

// =============================================================================
// 유틸리티
// =============================================================================

function getItemTypeEmoji(itemType: string): string {
  const emojiMap: Record<string, string> = {
    key: '🔑',
    weapon: '⚔️',
    tool: '🔧',
    clue: '🔍',
    material: '📦',
    consumable: '💊',
    document: '📄',
    artifact: '💎',
  };
  return emojiMap[itemType] ?? '📦';
}
