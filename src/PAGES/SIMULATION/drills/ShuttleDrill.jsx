import { useEffect, useRef } from "react";
import { PITCH_W, PITCH_H } from "../field";

function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function moveTowardsM(current, target, speedMps, dt) {
  const dx = target.x - current.x, dy = target.y - current.y;
  const d = Math.hypot(dx, dy);
  if (d === 0) return current;
  const step = Math.min(d, speedMps * dt);
  return { x: current.x + (dx / d) * step, y: current.y + (dy / d) * step };
}
function clampToPitch(p) { return { x: Math.max(0, Math.min(PITCH_W, p.x)), y: Math.max(0, Math.min(PITCH_H, p.y)) }; }
function roleBand(role) {
  if (role === "Forward") return { baseMin: 2.8, baseMax: 3.3 };
  if (role === "Midfielder") return { baseMin: 3.0, baseMax: 3.4 };
  if (role === "Defender") return { baseMin: 2.6, baseMax: 3.0 };
  return { baseMin: 2.8, baseMax: 3.2 };
}
function pickBase(role, speedAttr) {
  const band = roleBand(role);
  const base = band.baseMin + Math.random() * (band.baseMax - band.baseMin);
  const k = Number.isFinite(speedAttr) ? Math.max(0.5, Math.min(1.5, 0.5 + speedAttr / 100)) : 1;
  return base * k;
}

export default function ShuttleDrill({ players, player1Id, player2Id, running, paused, onMetrics, toPct }) {
  const TURN_THRESH_M = 0.6;
  const SHUTTLE_L = 0.2 * PITCH_W;
  const SHUTTLE_R = 0.8 * PITCH_W;
  const SHUTTLE_Y = PITCH_H / 2;

  const stateRef = useRef({});
  const lastTimeRef = useRef(null);
  const shuttleSideRef = useRef({});

  useEffect(() => {
    if (!running) return;
    const ids = [player1Id, player2Id].filter(Boolean);
    if (ids.length === 0) return;

    const nextState = {};
    const nextSides = {};
    ids.forEach((id, idx) => {
      const p = players.find(pp => pp.id === id);
      const laneY = ids.length === 1 ? SHUTTLE_Y : (idx === 0 ? SHUTTLE_Y - 6 : SHUTTLE_Y + 6);
      nextState[id] = { pos: { x: SHUTTLE_L, y: laneY }, prev: null, distM: 0, reps: 0, maxPace: 0, base: pickBase(p.role, Number(p.speed)) };
      nextSides[id] = "R";
    });
    stateRef.current = nextState;
    shuttleSideRef.current = nextSides;
    lastTimeRef.current = null;
  }, [running, players, player1Id, player2Id]);

  useEffect(() => {
    if (!running || paused) return;
    let raf;
    const tick = (ts) => {
      if (!lastTimeRef.current) lastTimeRef.current = ts;
      const dt = Math.min(0.1, (ts - lastTimeRef.current) / 1000);
      lastTimeRef.current = ts;

      const ids = [player1Id, player2Id].filter(Boolean);
      const ps = stateRef.current;

      ids.forEach((id, idx) => {
        const p = players.find(pp => pp.id === id);
        if (!p) return;
        const s = ps[id];
        const laneY = ids.length === 1 ? SHUTTLE_Y : (idx === 0 ? SHUTTLE_Y - 6 : SHUTTLE_Y + 6);
        const side = shuttleSideRef.current[id] || "R";
        const targetX = side === "R" ? SHUTTLE_R : SHUTTLE_L;
        const target = { x: targetX, y: laneY };

        const next = moveTowardsM(s.pos, target, s.base, dt);
        if (s.prev) {
          const step = dist(s.prev, next);
          const pace = step / dt;
          s.distM += step;
          s.maxPace = Math.max(s.maxPace, pace);
        }
        s.prev = s.pos;
        s.pos = clampToPitch(next);

        if (dist(s.pos, target) < TURN_THRESH_M) {
          shuttleSideRef.current[id] = side === "R" ? "L" : "R";
          s.reps = (s.reps || 0) + 1;
        }
      });

      const out = {};
      Object.keys(ps).forEach(id => {
        out[id] = { distM: ps[id].distM, maxPace: ps[id].maxPace, reps: ps[id].reps };
      });
      onMetrics(out);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, paused, players, player1Id, player2Id, onMetrics]);

  function PlayerDot({ id, color }) {
    const s = stateRef.current[id];
    if (!s) return null;
    const pct = toPct(s.pos);
    return (
      <div
        className={`absolute w-8 h-8 rounded-full ${color} transition-transform duration-100`}
        style={{ left: `${pct.x}%`, top: `${pct.y}%`, transform: "translate(-50%, -50%)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
      />
    );
  }

  const ids = [player1Id, player2Id].filter(Boolean);

  return (
    <>
      {ids.map((id, idx) => (
        <PlayerDot key={id} id={id} color={idx === 0 ? "bg-blue-600" : "bg-red-600"} />
      ))}
    </>
  );
}

