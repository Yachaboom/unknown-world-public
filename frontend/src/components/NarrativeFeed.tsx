import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { NarrativeEntry } from '../stores/worldStore';

interface NarrativeFeedProps {
  entries: NarrativeEntry[];
  streamingText: string;
}

export function NarrativeFeed({ entries, streamingText }: NarrativeFeedProps) {
  const { t } = useTranslation();
  const feedRef = useRef<HTMLDivElement>(null);

  // 새 엔트리 추가 시 스크롤
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [entries, streamingText]);

  return (
    <div className="narrative-feed" ref={feedRef}>
      {entries.map((entry, index) => (
        <div key={`${entry.turn}-${index}`} className="narrative-entry">
          <span className="narrative-timestamp">
            {t('narrative.turn_label', { turn: entry.turn })}
          </span>
          <span className="narrative-text">{entry.text}</span>
        </div>
      ))}
      {streamingText && (
        <div className="narrative-entry streaming">
          <span className="narrative-timestamp">{t('narrative.streaming_label')}</span>
          <span className="narrative-text">{streamingText}</span>
          <span className="cursor-blink">▌</span>
        </div>
      )}
    </div>
  );
}
