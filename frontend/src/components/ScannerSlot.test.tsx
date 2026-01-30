import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScannerSlot } from './ScannerSlot';
import * as scannerApi from '../api/scanner';
import { useInventoryStore } from '../stores/inventoryStore';
import { useAgentStore } from '../stores/agentStore';

// i18next 모킹
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'scanner.detected_objects') return `${params?.count} objects detected`;
      if (key === 'scanner.item_candidates') return `${params?.count} item candidates`;
      if (key === 'scanner.add_to_inventory') return `Add ${params?.count} items to inventory`;
      return key;
    },
  }),
}));

// URL.createObjectURL 모킹
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('ScannerSlot Component', () => {
  const mockLanguage = 'ko-KR';

  const mockScanResponse: scannerApi.ScannerResponse = {
    success: true,
    status: 'completed',
    caption: 'A mysterious artifact found in the desert.',
    objects: [
      {
        label: 'Artifact',
        box_2d: { ymin: 100, xmin: 100, ymax: 200, xmax: 200 },
        confidence: 0.9,
      },
    ],
    item_candidates: [
      {
        id: 'item-1',
        label: 'Glowing Stone',
        description: 'A stone that glows in the dark',
        item_type: 'artifact',
      },
      {
        id: 'item-2',
        label: 'Ancient Script',
        description: 'Unreadable text on a fragment',
        item_type: 'document',
      },
    ],
    analysis_time_ms: 1200,
    language: 'ko-KR',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useInventoryStore.setState({ items: [] });
    useAgentStore.setState({ isStreaming: false });
  });

  it('renders dropzone in idle state', () => {
    render(<ScannerSlot language={mockLanguage} />);
    expect(screen.getByText('scanner.dropzone_text')).toBeInTheDocument();
    expect(screen.getByText('scanner.dropzone_hint')).toBeInTheDocument();
  });

  it('handles file drop and triggers scanImage', async () => {
    const scanImageSpy = vi.spyOn(scannerApi, 'scanImage').mockResolvedValue({
      success: true,
      data: mockScanResponse,
    });

    render(<ScannerSlot language={mockLanguage} />);

    const dropzone = screen.getByRole('button', { name: /scanner.dropzone_label/i });
    const file = new File(['mock content'], 'test.png', { type: 'image/png' });

    // 드롭 이벤트 시뮬레이션
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
      },
    });

    // 업로드/분석 상태 확인
    expect(screen.getByText(/scanner.(uploading|analyzing)/i)).toBeInTheDocument();

    // 결과 렌더링 대기
    await waitFor(() => {
      expect(screen.getByText('A mysterious artifact found in the desert.')).toBeInTheDocument();
    });

    expect(scanImageSpy).toHaveBeenCalledWith(file, mockLanguage);
    expect(screen.getByText('Glowing Stone')).toBeInTheDocument();
    expect(screen.getByText('Ancient Script')).toBeInTheDocument();
  });

  it('allows toggling candidate selection', async () => {
    vi.spyOn(scannerApi, 'scanImage').mockResolvedValue({
      success: true,
      data: mockScanResponse,
    });

    render(<ScannerSlot language={mockLanguage} />);

    const dropzone = screen.getByRole('button', { name: /scanner.dropzone_label/i });
    const file = new File(['mock content'], 'test.png', { type: 'image/png' });
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Glowing Stone')).toBeInTheDocument();
    });

    // 기본적으로 모두 선택됨 (Option B: UX는 1단계 추가를 위해 기본 선택)
    const addButton = screen.getByText('Add 2 items to inventory');
    expect(addButton).not.toBeDisabled();

    // 하나 해제
    fireEvent.click(screen.getByText('Glowing Stone'));
    expect(screen.getByText('Add 1 items to inventory')).toBeInTheDocument();

    // 모두 해제
    fireEvent.click(screen.getByText('Ancient Script'));
    expect(screen.getByText('Add 0 items to inventory')).toBeInTheDocument();
    expect(screen.getByText('Add 0 items to inventory')).toBeDisabled();
  });

  it('adds selected items to inventoryStore and resets state', async () => {
    vi.spyOn(scannerApi, 'scanImage').mockResolvedValue({
      success: true,
      data: mockScanResponse,
    });
    const addItemsSpy = vi.spyOn(useInventoryStore.getState(), 'addItems');

    render(<ScannerSlot language={mockLanguage} />);

    const dropzone = screen.getByRole('button', { name: /scanner.dropzone_label/i });
    const file = new File(['mock content'], 'test.png', { type: 'image/png' });
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Add 2 items to inventory')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add 2 items to inventory'));

    expect(addItemsSpy).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'item-1', name: 'Glowing Stone' }),
      expect.objectContaining({ id: 'item-2', name: 'Ancient Script' }),
    ]);

    // 상태 리셋 확인 (idle 상태로 복귀)
    expect(screen.getByText('scanner.dropzone_text')).toBeInTheDocument();
  });

  it('displays error message on scan failure', async () => {
    vi.spyOn(scannerApi, 'scanImage').mockResolvedValue({
      success: false,
      error: 'Analysis failed due to noise',
      status: 'failed',
    });

    render(<ScannerSlot language={mockLanguage} />);

    const dropzone = screen.getByRole('button', { name: /scanner.dropzone_label/i });
    const file = new File(['mock content'], 'test.png', { type: 'image/png' });
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Analysis failed due to noise')).toBeInTheDocument();
    });

    expect(screen.getByText('scanner.retry')).toBeInTheDocument();
  });

  it('resets state when cancel is clicked', async () => {
    vi.spyOn(scannerApi, 'scanImage').mockResolvedValue({
      success: true,
      data: mockScanResponse,
    });

    render(<ScannerSlot language={mockLanguage} />);

    const dropzone = screen.getByRole('button', { name: /scanner.dropzone_label/i });
    const file = new File(['mock content'], 'test.png', { type: 'image/png' });
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('scanner.cancel')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('scanner.cancel'));

    // 상태 리셋 확인
    expect(screen.getByText('scanner.dropzone_text')).toBeInTheDocument();
  });

  it('is disabled when isStreaming is true', () => {
    useAgentStore.setState({ isStreaming: true });
    render(<ScannerSlot language={mockLanguage} />);

    const dropzone = screen.getByRole('button', { name: /scanner.dropzone_label/i });
    expect(dropzone).toHaveClass('disabled');
  });
});
