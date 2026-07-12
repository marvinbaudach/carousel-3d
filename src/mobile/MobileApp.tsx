import { useEffect, useState } from 'react';
import { MobileDeck } from '../components/MobileDeck';
import { LoadingScreen } from '../components/loading/LoadingScreen';
import { loadLiveData } from '../data/sources';
import { LOCALE, ensureLocaleReady, onLocaleChange } from '../i18n';

const BOOT_MS = 2400;

export default function MobileApp() {
  const [done, setDone] = useState(false);
  const [locale, setLocaleState] = useState(LOCALE);
  const [dictReady, setDictReady] = useState(LOCALE === 'de');
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => onLocaleChange(setLocaleState), []);
  useEffect(() => {
    let alive = true;
    void (async () => {
      await ensureLocaleReady();
      if (alive) setDictReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    loadLiveData();
    const id = setTimeout(() => setDone(true), BOOT_MS);
    return () => clearTimeout(id);
  }, []);

  const ready = done && dictReady;
  return (
    <>
      {ready && <MobileDeck key={locale} />}
      {showLoader && <LoadingScreen done={ready} onExited={() => setShowLoader(false)} />}
    </>
  );
}
