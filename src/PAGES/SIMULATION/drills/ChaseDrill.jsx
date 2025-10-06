import { useEffect, useRef } from "react";
import { PITCH_W, PITCH_H } from "../field";

// local helpers
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function moveTowardsM(current, target, speedMps, dt) {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const d = Math.hypot(dx, dy);
  if (d === 0) return current;
  const step = Math.min(d, speedMps * dt);
  return { x: current.x + (dx / d) * step, y: current.y + (dy / d) * step };
}
function clampToPitch(p) {
  return { x: Math.max(0, Math.min(PITCH_W, p.x)), y: Math.max(0, Math.min(PITCH_H, p.y)) };
}
function roleBand(role) {
  if (role === "Forward") return { baseMin: 2.8, baseMax: 3.3, sprint: 7.0 };
  if (role === "Midfielder") return { baseMin: 3.0, baseMax: 3.4, sprint: 6.5 };
  if (role === "Defender") return { baseMin: 2.6, baseMax: 3.0, sprint: 6.0 };
  return { baseMin: 2.8, baseMax: 3.2, sprint: 6.5 };
}
function pickBase(role, speedAttr) {
  const band = roleBand(role);
  const base = band.baseMin + Math.random() * (band.baseMax - band.baseMin);
  const k = Number.isFinite(speedAttr) ? Math.max(0.5, Math.min(1.5, 0.5 + speedAttr / 100)) : 1;
  return { base: base * k, sprint: band.sprint * k };
}

export default function ChaseDrill({ players, player1Id, player2Id, running, paused, onMetrics, toPct }) {
  const PLAYER_MIN_GAP_M = 1.5;
  const BALL_BOUNCE = 0.30;
  const BALL_FRICTION_PER_SEC = 0.98;
  const KICK_SPEED_MPS = 10;

  const ballRef = useRef({ x: PITCH_W / 2, y: PITCH_H / 2 });
  const ballVelRef = useRef({ vx: 0, vy: 0 });
  const stateRef = useRef({});
  const lastTimeRef = useRef(null);
  const lastKickerRef = useRef(null);

  // setup on start
  useEffect(() => {
    if (!running) return;
    const p1 = players.find(p => p.id === player1Id);
    const p2 = players.find(p => p.id === player2Id);
    if (!p1 || !p2) return;

    const b1 = pickBase(p1.role, Number(p1.speed));
    const b2 = pickBase(p2.role, Number(p2.speed));

    stateRef.current = {
      [p1.id]: { pos: { x: PITCH_W * 0.25, y: PITCH_H * 0.5 }, prev: null, distM: 0, maxPace: 0, base: b1.base },
      [p2.id]: { pos: { x: PITCH_W * 0.75, y: PITCH_H * 0.5 }, prev: null, distM: 0, maxPace: 0, base: b2.base },
    };
    ballRef.current = { x: PITCH_W / 2, y: PITCH_H / 2 };
    ballVelRef.current = { vx: 0, vy: 0 };
    lastKickerRef.current = null;
    lastTimeRef.current = null;
  }, [running, player1Id, player2Id, players]);

  // loop
  useEffect(() => {
    if (!running || paused) return;
    let raf;
    const tick = (ts) => {
      if (!lastTimeRef.current) lastTimeRef.current = ts;
      const dt = Math.min(0.1, (ts - lastTimeRef.current) / 1000);
      lastTimeRef.current = ts;

      const p1 = players.find(p => p.id === player1Id);
      const p2 = players.find(p => p.id === player2Id);
      if (!p1 || !p2) return;

      const ps = stateRef.current;
      const b = ballRef.current;
      const bv = ballVelRef.current;

      [p1, p2].forEach((p) => {
        const s = ps[p.id];
        const next = moveTowardsM(s.pos, b, s.base, dt);
        if (s.prev) {
          const step = dist(s.prev, next);
          const pace = step / dt;
          s.distM += step;
          s.maxPace = Math.max(s.maxPace, pace);
        }
        s.prev = s.pos;
        s.pos = clampToPitch(next);
      });

      // kick if close
      const p1d = dist(ps[p1.id].pos, b);
      const p2d = dist(ps[p2.id].pos, b);
      const closest = p1d < p2d ? p1 : p2;
      if (Math.min(p1d, p2d) < PLAYER_MIN_GAP_M && lastKickerRef.current !== closest.id) {
        const kicker = ps[closest.id];
        const angle = Math.atan2(b.y - kicker.pos.y, b.x - kicker.pos.x) + (Math.random() - 0.5) * Math.PI * 0.5;
        bv.vx = Math.cos(angle) * KICK_SPEED_MPS;
        bv.vy = Math.sin(angle) * KICK_SPEED_MPS;
        lastKickerRef.current = closest.id;
      }

      // integrate ball with bounce and friction
      b.x += bv.vx * dt;
      b.y += bv.vy * dt;
      const eps = 0.02;
      if (b.x <= 0) { b.x = eps; bv.vx = Math.abs(bv.vx) * 0.70; }
      if (b.x >= PITCH_W) { b.x = PITCH_W - eps; bv.vx = -Math.abs(bv.vx) * BALL_BOUNCE; }
      if (b.y <= 0) { b.y = eps; bv.vy = Math.abs(bv.vy) * BALL_BOUNCE; }
      if (b.y >= PITCH_H) { b.y = PITCH_H - eps; bv.vy = -Math.abs(bv.vy) * BALL_BOUNCE; }
      const f = Math.pow(BALL_FRICTION_PER_SEC, dt);
      bv.vx *= f; bv.vy *= f;

      // push metrics up
      onMetrics({
        [p1.id]: { distM: ps[p1.id].distM, maxPace: ps[p1.id].maxPace },
        [p2.id]: { distM: ps[p2.id].distM, maxPace: ps[p2.id].maxPace },
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, paused, players, player1Id, player2Id, onMetrics]);

  // render ball and players
  function Ball() {
    const pct = { x: (ballRef.current.x / PITCH_W) * 100, y: (ballRef.current.y / PITCH_H) * 100 };
    return (
      <div
        className="absolute w-4 h-4 bg-yellow-400 rounded-full shadow-lg transition-transform duration-150"
        style={{ left: `${pct.x}%`, top: `${pct.y}%`, transform: "translate(-50%, -50%)" }}
      />
    );
  }
  function PlayerDot({ id, color }) {
    const s = stateRef.current[id];
    if (!s) return null;
    const pct = toPct(s.pos);
    return (
      <div
        className={`absolute w-8 h-8 rounded-full ${color} flex items-center justify-center text-white font-bold transition-transform duration-100`}
        style={{ left: `${pct.x}%`, top: `${pct.y}%`, transform: `translate(-50%, -50%)`, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
      />
    );
  }

  return (
    <>
      <Ball />
      <PlayerDot id={player1Id} color="bg-blue-600" />
      <PlayerDot id={player2Id} color="bg-red-600" />
    </>
  );
}

