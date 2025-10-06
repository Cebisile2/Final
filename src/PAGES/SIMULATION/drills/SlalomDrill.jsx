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

const SLALOM_GATES = 8;
const SLALOM_START_X = PITCH_W * 0.15;
const SLALOM_END_X = PITCH_W * 0.85;
const SLALOM_OFFSET = 6;
const SLALOM_REACH_R = 1.0;

function buildSlalomForPlayer(laneY) {
  const gates = [];
  for (let i = 0; i < SLALOM_GATES; i++) {
    const t = i / (SLALOM_GATES - 1);
    const x = SLALOM_START_X + t * (SLALOM_END_X - SLALOM_START_X);
    const y = laneY + (i % 2 === 0 ? -SLALOM_OFFSET : SLALOM_OFFSET);
    gates.push({ x, y });
  }
  return gates;
}

export default function SlalomDrill({ players, player1Id, player2Id, running, paused, onMetrics, toPct }) {
  const stateRef = useRef({});
  const gatesRef = useRef({});
  const progRef = useRef({});
  const errRef = useRef({});
  const doneRef = useRef({});
  const timeRef = useRef({});
  const lastTimeRef = useRef(null);
  const startMsRef = useRef(null);

  useEffect(() => {
    if (!running) return;
    const ids = [player1Id, player2Id].filter(Boolean);
    if (ids.length === 0) return;

    const laneY1 = ids.length === 1 ? PITCH_H * 0.5 : PITCH_H * 0.40;
    const laneY2 = PITCH_H * 0.60;

    const nextState = {};
    const nextGates = {};
    const nextProg = {};
    const nextErr = {};
    const nextDone = {};
    const nextTime = {};

    ids.forEach((id, idx) => {
      const p = players.find(pp => pp.id === id);
      const laneY = ids.length === 1 ? laneY1 : (idx === 0 ? laneY1 : laneY2);
      nextState[id] = { pos: { x: SLALOM_START_X - 5, y: laneY }, prev: null, distM: 0, maxPace: 0, base: pickBase(p.role, Number(p.speed)) };
      nextGates[id] = buildSlalomForPlayer(laneY);
      nextProg[id] = 0;
      nextErr[id] = 0;
      nextDone[id] = false;
      nextTime[id] = 0;
    });

    stateRef.current = nextState;
    gatesRef.current = nextGates;
    progRef.current = nextProg;
    errRef.current = nextErr;
    doneRef.current = nextDone;
    timeRef.current = nextTime;

    lastTimeRef.current = null;
    startMsRef.current = performance.now();
  }, [running, players, player1Id, player2Id]);

  useEffect(() => {
    if (!running || paused) return;
    let raf;
    const tick = (ts) => {
      if (!lastTimeRef.current) lastTimeRef.current = ts;
      const dt = Math.min(0.1, (ts - lastTimeRef.current) / 1000);
      lastTimeRef.current = ts;

      const ids = [player1Id, player2Id].filter(Boolean);

      ids.forEach((id) => {
        const s = stateRef.current[id];
        if (!s || doneRef.current[id]) return;

        const gates = gatesRef.current[id];
        const i = progRef.current[id];
        const target = gates[i];

        const next = moveTowardsM(s.pos, target, s.base, dt);

        if (s.prev) {
          const step = Math.hypot(next.x - s.prev.x, next.y - s.prev.y);
          const pace = step / dt;
          s.distM += step;
          s.maxPace = Math.max(s.maxPace, pace);

          const v1x = s.pos.x - s.prev.x, v1y = s.pos.y - s.prev.y;
          const v2x = next.x - s.pos.x, v2y = next.y - s.pos.y;
          const d1 = Math.hypot(v1x, v1y), d2 = Math.hypot(v2x, v2y);
          if (d1 > 0.01 && d2 > 0.01) {
            const cosA = (v1x * v2x + v1y * v2y) / (d1 * d2);
            const angle = Math.acos(Math.max(-1, Math.min(1, cosA)));
            if (angle > Math.PI * 0.5 && pace > 4.5) errRef.current[id] += 1;
          }
        }

        s.prev = s.pos;
        s.pos = clampToPitch(next);

        if (dist(s.pos, target) < SLALOM_REACH_R) {
          progRef.current[id] = i + 1;
          if (i + 1 >= gates.length) {
            doneRef.current[id] = true;
            timeRef.current[id] = Math.max(0, (performance.now() - (startMsRef.current || performance.now())) / 1000);
          }
        }
      });

      const out = {};
      Object.keys(stateRef.current).forEach(id => {
        out[id] = {
          distM: stateRef.current[id].distM,
          maxPace: stateRef.current[id].maxPace,
          gates: progRef.current[id],
          errors: errRef.current[id],
          time_s: timeRef.current[id],
        };
      });
      onMetrics(out);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, paused, player1Id, player2Id, onMetrics]);

  function PlayerDot({ id, color }) {
    const s = stateRef.current[id];
    if (!s) return null;
    const pct = { x: (s.pos.x / PITCH_W) * 100, y: (s.pos.y / PITCH_H) * 100 };
    return (
      <div
        className={`absolute w-8 h-8 rounded-full ${color} transition-transform duration-100`}
        style={{ left: `${pct.x}%`, top: `${pct.y}%`, transform: "translate(-50%, -50%)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
      />
    );
  }

  const ids = [player1Id, player2Id].filter(Boolean);
  const allGates = ids.flatMap(id => gatesRef.current[id] || []);

  return (
    <>
      <div className="absolute left-0 top-[50%] w-full h-px bg-white/30" />
      {allGates.map((g, gi) => {
        const pct = { x: (g.x / PITCH_W) * 100, y: (g.y / PITCH_H) * 100 };
        return (
          <div
            key={`${g.x}-${g.y}-${gi}`}
            className="absolute rounded-full bg-orange-400 shadow"
            style={{ width: 10, height: 10, left: `${pct.x}%`, top: `${pct.y}%`, transform: "translate(-50%, -50%)", opacity: 0.9 }}
          />
        );
      })}
      {ids.map((id, idx) => (
        <PlayerDot key={id} id={id} color={idx === 0 ? "bg-blue-600" : "bg-red-600"} />
      ))}
    </>
  );
}

