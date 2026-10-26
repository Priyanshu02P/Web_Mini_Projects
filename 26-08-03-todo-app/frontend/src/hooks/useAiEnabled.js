import { useEffect, useState } from 'react';
import { getAiStatus } from '../api/aiApi';

export default function useAiEnabled() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let alive = true;
    getAiStatus().then((v) => alive && setEnabled(v));
    return () => {
      alive = false;
    };
  }, []);
  return enabled;
}
