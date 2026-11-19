import { useEffect, useState } from 'react';

// true kalau lebar layar minimal 1024 px (tampilan laptop)
export function useIsDesktop() {
  const query = '(min-width: 1024px)';
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = (e) => setMatch(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return match;
}
