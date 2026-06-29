import { useEffect, useRef, useState, useCallback } from 'react';
import type { ParticleConfig } from './SkiaNode.types';

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  opacity: number;
  life: number;      // 0-1 remaining life
  maxLife: number;   // ms
  born: number;      // timestamp
}

export function useParticleSystem(
  config: ParticleConfig | null,
  scaleX: number,
  scaleY: number,
  active: boolean,
) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const particleIdRef = useRef(0);

  const emit = useCallback(() => {
    if (!config) return [];
    const now = performance.now();
    const newParticles: Particle[] = [];

    for (let i = 0; i < config.count; i++) {
      const spreadRad = ((config.spread ?? 360) * Math.PI) / 180;
      const baseAngle = -Math.PI / 2; // upward
      const angle = baseAngle + (Math.random() - 0.5) * spreadRad;
      const speed = config.speed * (0.5 + Math.random() * 0.5);

      newParticles.push({
        id: particleIdRef.current++,
        x: config.emitX * scaleX,
        y: config.emitY * scaleY,
        vx: Math.cos(angle) * speed * scaleX * 0.016,
        vy: Math.sin(angle) * speed * scaleY * 0.016,
        radius: config.radius * (0.5 + Math.random() * 0.5) * ((scaleX + scaleY) / 2),
        color: config.colors[Math.floor(Math.random() * config.colors.length)],
        opacity: 1,
        life: 1,
        maxLife: config.lifetime * (0.7 + Math.random() * 0.6),
        born: now,
      });
    }

    return newParticles;
  }, [config, scaleX, scaleY]);

  const tick = useCallback((time: number) => {
    if (!config) return;
    const dt = time - lastTimeRef.current;
    lastTimeRef.current = time;
    const gravity = (config.gravity ?? 0.3) * scaleY * 0.016;

    setParticles((prev) => {
      const now = performance.now();
      const updated = prev
        .map((p) => {
          const age = now - p.born;
          const life = 1 - age / p.maxLife;
          if (life <= 0) return null;
          return {
            ...p,
            x: p.x + p.vx * dt,
            y: p.y + p.vy * dt,
            vy: p.vy + gravity,
            opacity: config.fadeOut ? life : 1,
            life,
          };
        })
        .filter(Boolean) as Particle[];

      // Emit new batch if loop
      if (config.loop && updated.length < config.count * 0.3) {
        return [...updated, ...emit()];
      }

      return updated;
    });

    frameRef.current = requestAnimationFrame(tick);
  }, [config, emit, scaleY]);

  useEffect(() => {
    if (!active || !config) return;

    // Initial emit
    setParticles(emit());
    lastTimeRef.current = performance.now();
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [active, config]);

  return particles;
}
