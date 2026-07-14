import { useEffect } from 'react';

export default function Fireworks() {
  useEffect(() => {
    let stop = false;
    import('canvas-confetti').then(({ default: confetti }) => {
      const burst = (x: number) =>
        confetti({ particleCount: 90, spread: 75, origin: { x, y: 0.7 } });
      burst(0.3); burst(0.7);
      const t = setTimeout(() => { if (!stop) burst(0.5); }, 500);
      return () => clearTimeout(t);
    });
    return () => { stop = true; };
  }, []);
  return null;
}
