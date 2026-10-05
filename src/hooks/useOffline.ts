import { useEffect, useState } from 'react';
import { registerOffline } from '../utils/offline';

export function useOffline(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    void registerOffline().then((available) => {
      if (mounted) setReady(available);
    });
    return () => { mounted = false; };
  }, []);
  return ready;
}
