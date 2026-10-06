import { lazy } from 'react';

/**
 * React.lazy wrapper that guarantees the Suspense fallback stays visible for
 * at least `minDelay` ms. This avoids a distracting loader "flash" when the
 * chunk is already cached / loads almost instantly.
 *
 * The delay only applies to the first load: React.lazy memoises the resolved
 * module, so later renders are instant.
 *
 *   const Page = lazyWithMinDelay(() => import('./Page'), 300);
 */
export default function lazyWithMinDelay(importFn, minDelay = 300) {
  return lazy(() => {
    const minWait = new Promise((resolve) => setTimeout(resolve, minDelay));
    // Wait for BOTH the chunk and the minimum delay; a failed import still rejects.
    return Promise.all([importFn(), minWait]).then(([module]) => module);
  });
}
