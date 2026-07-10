import styled, { keyframes } from 'styled-components';
import { LIVE_FEEDS, type FeedState } from '../../data/sources';
import { t } from '../../i18n';
import { CONVERGE_MS, MONO } from './loaderConstants';

interface FeedStripProps {
  /** Per-feed state, index-aligned with LIVE_FEEDS. */
  states: FeedState[];
  /** Collapses with the rest of the stage on the converge handoff. */
  done: boolean;
}

// The pending marker breathes so a still-loading source reads as live, not hung.
const blink = keyframes`
  0%, 100% { opacity: 0.35; }
  50% { opacity: 0.85; }
`;

// Bottom-left uplink log: one line per real source, checking in as its fetch
// lands. On-theme with the globe's data-station network, and off to the side so
// it never competes with the centered wordmark. Fades out with the stage.
const List = styled.ul<{ $done: boolean }>`
  position: absolute;
  left: clamp(16px, 3vw, 44px);
  bottom: calc(env(safe-area-inset-bottom, 0px) + clamp(16px, 4vh, 48px));
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
  font: 500 12px ${MONO};
  pointer-events: none;
  opacity: ${(p) => (p.$done ? 0 : 1)};
  transform: translateY(${(p) => (p.$done ? '8px' : '0')});
  transition:
    opacity ${CONVERGE_MS}ms ease-in,
    transform ${CONVERGE_MS}ms cubic-bezier(0.55, 0, 0.7, 0.4);

  /* Mobile keeps the compact PctReadout instead — the log would crowd the
     tall phone canvas and the deck's first card sits where it would land. */
  @media (max-width: 820px), (pointer: coarse) {
    display: none;
  }
`;

const Header = styled.li`
  margin-bottom: 3px;
  font-size: 10px;
  letter-spacing: 0.32em;
  color: rgba(143, 184, 236, 0.55);
  text-transform: uppercase;
`;

const Row = styled.li<{ $state: FeedState }>`
  display: flex;
  align-items: baseline;
  gap: 9px;
  color: ${(p) =>
    p.$state === 'ok'
      ? 'rgba(210, 224, 245, 0.92)'
      : p.$state === 'failed'
        ? 'rgba(150, 165, 190, 0.4)'
        : 'rgba(176, 198, 236, 0.6)'};
  transition: color ${CONVERGE_MS}ms ease;
`;

// Fixed-width status cell so the source column stays aligned across rows.
const Glyph = styled.span<{ $state: FeedState }>`
  width: 0.9em;
  flex: 0 0 auto;
  text-align: center;
  color: ${(p) =>
    p.$state === 'ok'
      ? 'rgba(96, 208, 168, 0.95)' /* semantic: confirmed uplink */
      : p.$state === 'failed'
        ? 'rgba(150, 165, 190, 0.45)'
        : 'rgba(144, 133, 233, 0.8)'};
  animation: ${(p) => (p.$state === 'pending' ? blink : 'none')} 1.4s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Source = styled.span`
  letter-spacing: 0.14em;
  opacity: 0.7;
`;

const GLYPH: Record<FeedState, string> = { pending: '·', ok: '✓', failed: '×' };

export function FeedStrip({ states, done }: FeedStripProps) {
  return (
    <List $done={done} aria-hidden>
      <Header>{t('Datenquellen')}</Header>
      {LIVE_FEEDS.map((feed, i) => {
        const state = states[i] ?? 'pending';
        return (
          <Row key={`${feed.source}-${feed.item}`} $state={state}>
            <Glyph $state={state}>{GLYPH[state]}</Glyph>
            <Source>{feed.source}</Source>
            <span>{t(feed.item)}</span>
          </Row>
        );
      })}
    </List>
  );
}
