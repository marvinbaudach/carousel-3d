import { useEffect, useState } from 'react';

// Small phones or any touch device: the scene trims its heavy post-processing
// and pixel ratio here to stay smooth on mobile GPUs.
const QUERY = '(max-width: 820px), (pointer: coarse)';

function match(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(QUERY).matches;
}

/** True on touch phones / small screens, re-evaluated on viewport changes. */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(match);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return mobile;
}
