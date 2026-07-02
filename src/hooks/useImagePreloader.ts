import { useEffect, useState } from 'react';

interface PreloaderState {
  progress: number; // 0..1
  loaded: number;
  total: number;
  done: boolean;
}

/**
 * Preloads all given image URLs and reports real progress.
 * Each image is loaded through an `Image()` object so the data lands in the
 * browser cache before Three.js turns it into textures.
 */
export function useImagePreloader(urls: string[]): PreloaderState {
  const [loaded, setLoaded] = useState(0);
  const [done, setDone] = useState(false);
  const total = urls.length;
  // Stable reference so the effect only restarts when the URL list changes.
  const urlsKey = urls.join('|');

  useEffect(() => {
    if (total === 0) {
      setDone(true);
      return;
    }

    // Reset the counter on every (re)start.
    setLoaded(0);
    setDone(false);

    let cancelled = false;
    let count = 0;

    const bump = () => {
      if (cancelled) return;
      count += 1;
      setLoaded(count);
      if (count === total) setDone(true);
    };

    const images = urls.map((url) => {
      const img = new Image();
      // decode() guarantees the image sits decoded in memory; otherwise the
      // first draw into the WebGL context would cause a hitch.
      img.onload = () => {
        img
          .decode()
          .then(bump)
          .catch(bump); // decode can fail for some formats -> count anyway
      };
      img.onerror = bump; // broken images must not block the loading screen
      img.src = url;
      return img;
    });

    return () => {
      cancelled = true;
      images.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [urlsKey, urls, total]);

  return {
    progress: total === 0 ? 1 : loaded / total,
    loaded,
    total,
    done,
  };
}
