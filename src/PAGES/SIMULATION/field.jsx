export const PITCH_W = 105;
export const PITCH_H = 68;

export function toPct(p) {
  return { x: (p.x / PITCH_W) * 100, y: (p.y / PITCH_H) * 100 };
}

