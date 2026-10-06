import React, { useSyncExternalStore } from 'react';
import { getCacheStats, subscribeCacheStats } from '../api/cache';
import './CacheStats.css';

export default function CacheStats() {
  const { hits, misses } = useSyncExternalStore(subscribeCacheStats, getCacheStats);
  const total = hits + misses;
  const rate = total ? Math.round((hits / total) * 100) : 0;

  return (
    <p className="cachestats" title="Client-side cache (60s TTL)">
      Cache · <span className="cachestats__hit">{hits} hit{hits === 1 ? '' : 's'}</span> ·{' '}
      <span className="cachestats__miss">{misses} miss{misses === 1 ? '' : 'es'}</span>
      {total > 0 && <> · {rate}%</>}
    </p>
  );
}
