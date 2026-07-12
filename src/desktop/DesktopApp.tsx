import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { loadLiveData } from '../data/sources';
import { LOCALE, ensureLocaleReady } from '../i18n';
import Gallery from './gallery/Gallery';
import { AubergineBackdrop } from './gallery/AubergineBackdrop';
import { ProgressBar } from './gallery/GallerySkeletons';
import { ACCENT } from './gallery/galleryChrome';
import { buildEntries } from './gallery/galleryData';
import { progressPct } from './gallery/progress';

const Wrap = styled.div`
  position: fixed;
  inset: 0;
  overflow: hidden;
`;

export default function DesktopApp() {
  const total = useMemo(() => buildEntries().length, []);
  const [renderedIds, setRenderedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [accent, setAccent] = useState(ACCENT);
  const [dictReady, setDictReady] = useState(LOCALE === 'de');

  useEffect(() => {
    loadLiveData();
    let alive = true;
    void (async () => {
      await ensureLocaleReady();
      if (alive) setDictReady(true);
    })();
    return () => { alive = false; };
  }, []);

  const onThumbRendered = useCallback((id: string) => {
    setRenderedIds((ids) => ids.has(id) ? ids : new Set(ids).add(id));
  }, []);
  const pct = dictReady ? progressPct(renderedIds.size, total) : 0;

  return (
    <Wrap>
      <AubergineBackdrop accent={accent} />
      <ProgressBar pct={pct} />
      {dictReady && (
        <Gallery onAccentChange={setAccent} onThumbRendered={onThumbRendered} />
      )}
    </Wrap>
  );
}
