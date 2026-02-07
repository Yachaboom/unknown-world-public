import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { SceneImage } from './SceneImage';

// react-i18next 모킹
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// 전역적으로 인스턴스를 추적하기 위한 배열
let imageInstances: Array<MockImage> = [];

// Image 객체 모킹
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  _src: string = '';

  constructor() {
    imageInstances.push(this);
  }

  addEventListener(event: string, cb: () => void) {
    if (event === 'load') this.onload = cb;
    if (event === 'error') this.onerror = cb;
  }

  removeEventListener() {}

  set src(val: string) {
    this._src = val;
  }

  get src() {
    return this._src;
  }
}

describe('SceneImage Component (U-020)', () => {
  const originalImage = global.Image;

  beforeEach(() => {
    imageInstances = [];
    global.Image = MockImage as unknown as typeof Image;
  });

  afterEach(() => {
    global.Image = originalImage;
  });

  it('이미지 URL이 없을 때 placeholder를 표시해야 함', () => {
    render(<SceneImage status="default" />);
    expect(screen.getByText('scene.status.default')).toBeInTheDocument();
  });

  it('새로운 이미지 URL이 오면 로딩 인디케이터를 표시하고 이전 이미지를 유지해야 함 (Option A)', async () => {
    const { rerender } = render(<SceneImage status="scene" imageUrl="url-1.png" />);

    // 로딩 중 확인
    expect(screen.getByText('scene.status.image_loading')).toBeInTheDocument();

    // 첫 번째 이미지 로드 완료 시뮬레이션
    await act(async () => {
      if (imageInstances[0]?.onload) imageInstances[0].onload();
    });

    const img = screen.getByAltText('scene.status.alt');
    expect(img).toHaveAttribute('src', 'url-1.png');

    // 두 번째 이미지 요청
    await act(async () => {
      rerender(<SceneImage status="scene" imageUrl="url-2.png" />);
    });

    // 로딩 중 표시 확인
    expect(screen.getByText('scene.status.image_loading')).toBeInTheDocument();
    // 이전 이미지(url-1)가 여전히 보여야 함
    expect(screen.getByAltText('scene.status.alt')).toHaveAttribute('src', 'url-1.png');
  });

  it('이미지 로딩이 완료되면 새로운 이미지로 교체되어야 함', async () => {
    const { rerender } = render(<SceneImage status="scene" imageUrl="url-1.png" />);

    await act(async () => {
      if (imageInstances[0]?.onload) imageInstances[0].onload();
    });

    await act(async () => {
      rerender(<SceneImage status="scene" imageUrl="url-2.png" />);
    });

    // 두 번째 이미지 로드 완료 시뮬레이션
    await act(async () => {
      // 새로운 Image 인스턴스가 생성되었을 것임
      const secondInstance = imageInstances.find((inst) => inst.src === 'url-2.png');
      if (secondInstance?.onload) secondInstance.onload();
    });

    const img = screen.getByAltText('scene.status.alt');
    expect(img).toHaveAttribute('src', 'url-2.png');
    expect(screen.queryByText('scene.status.image_loading')).not.toBeInTheDocument();
  });

  it('이미지 로딩 실패 시 에러 배지를 표시하고 이전 이미지를 유지해야 함 (RULE-004)', async () => {
    const { rerender } = render(<SceneImage status="scene" imageUrl="url-1.png" />);

    await act(async () => {
      if (imageInstances[0]?.onload) imageInstances[0].onload();
    });

    await act(async () => {
      rerender(<SceneImage status="scene" imageUrl="url-2.png" />);
    });

    // 두 번째 이미지 로드 실패 시뮬레이션
    await act(async () => {
      const secondInstance = imageInstances.find((inst) => inst.src === 'url-2.png');
      if (secondInstance?.onerror) secondInstance.onerror();
    });

    expect(screen.getByText('scene.status.image_error')).toBeInTheDocument();
    expect(screen.getByAltText('scene.status.alt')).toHaveAttribute('src', 'url-1.png');
  });

  it('이미지가 전혀 없는 상태에서 에러 발생 시 placeholder를 표시해야 함', async () => {
    render(<SceneImage status="scene" imageUrl="invalid.png" />);

    await act(async () => {
      if (imageInstances[0]?.onerror) imageInstances[0].onerror();
    });

    expect(screen.getByText('scene.status.default')).toBeInTheDocument();
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  describe('Processing Overlay (U-071[Mvp])', () => {
    it('processingPhase가 processing일 때 처리 중 오버레이와 올바른 메시지를 표시해야 함', () => {
      render(<SceneImage status="scene" processingPhase="processing" />);

      expect(screen.getByText('scene.processing.processing')).toBeInTheDocument();
      // CRT 스피너 요소 존재 확인
      expect(document.querySelector('.scene-processing-spinner')).toBeInTheDocument();
    });

    it('processingPhase가 image_pending일 때 이미지 형성 중 메시지를 표시해야 함', () => {
      render(<SceneImage status="scene" processingPhase="image_pending" />);

      expect(screen.getByText('scene.processing.image_pending')).toBeInTheDocument();
    });

    it('처리 중일 때는 이전 이미지가 있더라도 숨겨야 함 (Option C)', async () => {
      const { rerender } = render(<SceneImage status="scene" imageUrl="old-url.png" />);

      // 1. 첫 번째 이미지 로드 완료
      await act(async () => {
        if (imageInstances[0]?.onload) imageInstances[0].onload();
      });

      expect(screen.getByAltText('scene.status.alt')).toHaveAttribute('src', 'old-url.png');

      // 2. 처리 중으로 전환
      rerender(<SceneImage status="scene" imageUrl="old-url.png" processingPhase="processing" />);

      // 이미지 요소가 렌더링되지 않아야 함 (Option C: 처리 중 숨김)
      expect(screen.queryByAltText('scene.status.alt')).not.toBeInTheDocument();
      // 오버레이는 표시되어야 함
      expect(screen.getByText('scene.processing.processing')).toBeInTheDocument();
    });
  });

  describe('Analyzing Overlay (U-089[Mvp])', () => {
    it('isAnalyzing이 true일 때 분석 전용 오버레이와 메시지를 표시해야 함', () => {
      render(<SceneImage status="scene" isAnalyzing={true} />);

      expect(screen.getByText('scene.analyzing.message')).toBeInTheDocument();
      expect(screen.getByText('scene.analyzing.hint')).toBeInTheDocument();
      // 스캔라인 요소 존재 확인
      expect(document.querySelector('.scene-analyzing-scanline')).toBeInTheDocument();
    });

    it('정밀분석 중에는 기존 이미지를 유지해야 함 (Option B)', async () => {
      const { rerender } = render(<SceneImage status="scene" imageUrl="old-url.png" />);

      // 1. 첫 번째 이미지 로드 완료
      await act(async () => {
        if (imageInstances[0]?.onload) imageInstances[0].onload();
      });

      expect(screen.getByAltText('scene.status.alt')).toHaveAttribute('src', 'old-url.png');

      // 2. 정밀분석 시작
      rerender(<SceneImage status="scene" imageUrl="old-url.png" isAnalyzing={true} />);

      // 이미지 요소가 여전히 존재해야 함 (기존 이미지 유지)
      expect(screen.getByAltText('scene.status.alt')).toHaveAttribute('src', 'old-url.png');
      // 분석 오버레이 표시 확인
      expect(screen.getByText('scene.analyzing.message')).toBeInTheDocument();
    });

    it('isAnalyzing이 true일 때는 processingPhase 오버레이보다 우선해야 함', () => {
      render(<SceneImage status="scene" isAnalyzing={true} processingPhase="processing" />);

      // 분석 오버레이는 표시됨
      expect(screen.getByText('scene.analyzing.message')).toBeInTheDocument();
      // 일반 처리 오버레이는 숨겨짐
      expect(screen.queryByText('scene.processing.processing')).not.toBeInTheDocument();
    });
  });
});
