
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/PROVIDERS/AuthProvider";

// pitch meters
const PITCH_W = 105;
const PITCH_H = 68;

// body sizes meters
const PLAYER_RADIUS_M = 0.06;
const BALL_RADIUS_M = 0.4;
const MARGIN_M = 0.04; // small safety ring

// helpers
function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function moveTowardsM(current, target, speedMps, dt) {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const d = Math.hypot(dx, dy);
  if (d === 0) return current;
  const step = Math.min(d, speedMps * dt);
  return { x: current.x + (dx / d) * step, y: current.y + (dy / d) * step };
}
function clampToPitch(p) {
  return {
    x: Math.max(0, Math.min(PITCH_W, p.x)),
    y: Math.max(0, Math.min(PITCH_H, p.y)),
  };
}
function toPct(p) {
  return { x: (p.x / PITCH_W) * 100, y: (p.y / PITCH_H) * 100 };
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
  if (typeof speedAttr === "number") {
    const k = Math.max(0.5, Math.min(1.5, 0.5 + speedAttr / 100));
    return { base: base * k, sprint: band.sprint * k };
  }
  return { base, sprint: band.sprint };
}

// circle separation
function separateCircles(A, rA, B, rB, biasA = 0.5) {
  let dx = B.x - A.x;
  let dy = B.y - A.y;
  let d = Math.hypot(dx, dy);
  const minD = rA + rB + MARGIN_M;
  if (d === 0) {
    dx = 1e-3;
    dy = 0;
    d = 1e-3;
  }
  if (d >= minD) return false;
  const nx = dx / d;
  const ny = dy / d;
  const overlap = minD - d;
  const aPush = overlap * biasA;
  const bPush = overlap * (1 - biasA);
  A.x -= nx * aPush;
  A.y -= ny * aPush;
  B.x += nx * bPush;
  B.y += ny * bPush;
  return true;
}

export default function TrainingPage() {
  const { currentUser } = useAuth();

  console.log(currentUser)
  const players = currentUser?.players || [];

  const [drill, setDrill] = useState("chase"); // chase or shuttle
  const [player1Id, setPlayer1Id] = useState("");
  const [player2Id, setPlayer2Id] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // sim config
  const TURN_THRESH_M = 0.6;
  const SHUTTLE_L = 0.2 * PITCH_W;
  const SHUTTLE_R = 0.8 * PITCH_W;
  const SHUTTLE_Y = PITCH_H / 2;

  // ball physics
  const BALL_BOUNCE = 0.88;
  const BALL_FRICTION_PER_SEC = 0.98;
  const KICK_SPEED_MPS = 18;

  // sprint detection
  const SPRINT_SPEED = 5.5;

  // refs
  const ballRef = useRef({ x: PITCH_W / 2, y: PITCH_H / 2 });
  const ballVelRef = useRef({ vx: 0, vy: 0 });
  const stateRef = useRef({});
  const sprintRef = useRef({});
  const sprintStateRef = useRef({});
  const lastTimeRef = useRef(null);
  const startTimeRef = useRef(null);
  const lastKickerRef = useRef(null);
  const shuttleSideRef = useRef({});
  const [, forceRender] = useState(0);

  function setup() {
    setFeedback(null);
    const p1 = players.find(p => p.id === player1Id);
    const p2 = players.find(p => p.id === player2Id);
    if (!p1 || !p2) return;

    ballRef.current = { x: PITCH_W / 2, y: PITCH_H / 2 };
    ballVelRef.current = { vx: 0, vy: 0 };

    const b1 = pickBase(p1.role, p1.speed);
    const b2 = pickBase(p2.role, p2.speed);

    if (drill === "chase") {
      stateRef.current = {
        [p1.id]: { pos: { x: PITCH_W * 0.25, y: PITCH_H * 0.5 }, prev: null, distM: 0, maxPace: 0, base: b1.base },
        [p2.id]: { pos: { x: PITCH_W * 0.75, y: PITCH_H * 0.5 }, prev: null, distM: 0, maxPace: 0, base: b2.base },
      };
    } else {
      stateRef.current = {
        [p1.id]: { pos: { x: SHUTTLE_L, y: SHUTTLE_Y - 6 }, prev: null, distM: 0, reps: 0, maxPace: 0, base: b1.base },
        [p2.id]: { pos: { x: SHUTTLE_L, y: SHUTTLE_Y + 6 }, prev: null, distM: 0, reps: 0, maxPace: 0, base: b2.base },
      };
      shuttleSideRef.current = { [p1.id]: "R", [p2.id]: "R" };
    }

    sprintRef.current = { [p1.id]: 0, [p2.id]: 0 };
    sprintStateRef.current = { [p1.id]: { tAbove: 0, cooldown: 0 }, [p2.id]: { tAbove: 0, cooldown: 0 } };

    lastKickerRef.current = null;
    lastTimeRef.current = null;
    startTimeRef.current = performance.now();
    setIsRunning(true);
    setPaused(false);
  }

  function endAndFeedback() {
    const p1 = players.find(p => p.id === player1Id);
    const p2 = players.find(p => p.id === player2Id);
    if (!p1 || !p2) return;

    const now = performance.now();
    const elapsedS = Math.max(1, (now - startTimeRef.current) / 1000);

    const s1 = stateRef.current[p1.id];
    const s2 = stateRef.current[p2.id];
    const avg1 = s1.distM / elapsedS;
    const avg2 = s2.distM / elapsedS;

    const lines = [
      `${p1.name} distance ${Math.round(s1.distM)} m avg pace ${avg1.toFixed(2)} m s max ${s1.maxPace.toFixed(2)} sprints ${sprintRef.current[p1.id]}${drill === "shuttle" ? ` shuttles ${Math.floor((s1.reps || 0) / 2)}` : ""}`,
      `${p2.name} distance ${Math.round(s2.distM)} m avg pace ${avg2.toFixed(2)} m s max ${s2.maxPace.toFixed(2)} sprints ${sprintRef.current[p2.id]}${drill === "shuttle" ? ` shuttles ${Math.floor((s2.reps || 0) / 2)}` : ""}`,
    ];

    function fb(name, avg, maxp, distM, reps) {
      if (drill === "shuttle" && Math.floor((reps || 0) / 2) < 20) return `${name} needs more repeatability. Aim for two more shuttles next session.`;
      if (avg < 2.6) return `${name} needs to raise steady pace. Target average above two point eight.`;
      if (maxp > 6.5 && avg < 2.9) return `${name} shows top speed. Improve endurance to hold pace longer.`;
      if (distM > 1800 && avg >= 3.0) return `${name} delivered a strong aerobic load. Keep recovery solid.`;
      return `${name} completed the session.`;
    }
    const coach = [
      fb(p1.name, avg1, s1.maxPace, s1.distM, s1.reps || 0),
      fb(p2.name, avg2, s2.maxPace, s2.distM, s2.reps || 0),
    ];

    setFeedback({ lines, coach });
  }

  const startSimulation = () => {
    if (!player1Id || !player2Id) return;
    setup();
  };

  // steering repel to avoid aiming at the same point
  function steerTarget(pos, desired, others, radius) {
    let tx = desired.x;
    let ty = desired.y;
    others.forEach(o => {
      const dx = pos.x - o.x;
      const dy = pos.y - o.y;
      const d = Math.hypot(dx, dy);
      const minD = radius + PLAYER_RADIUS_M + 0.3; // soft buffer
      if (d > 0 && d < minD) {
        const w = (minD - d) / minD;
        tx += (dx / d) * w * 0.8;
        ty += (dy / d) * w * 0.8;
      }
    });
    return clampToPitch({ x: tx, y: ty });
  }

  function resolveCollisions(iterations = 8) {
    const ids = [player1Id, player2Id];
    const ps = stateRef.current;
    const b = ballRef.current;
    const bv = ballVelRef.current;

    for (let k = 0; k < iterations; k++) {
      let changed = false;

      // player vs player
      const A = ps[ids[0]]?.pos;
      const B = ps[ids[1]]?.pos;
      if (A && B) {
        changed = separateCircles(A, PLAYER_RADIUS_M, B, PLAYER_RADIUS_M, 0.5) || changed;
        if (changed) {
          ps[ids[0]].pos = clampToPitch(ps[ids[0]].pos);
          ps[ids[1]].pos = clampToPitch(ps[ids[1]].pos);
        }
      }

      // ball vs players
      ids.forEach(id => {
        const P = ps[id]?.pos;
        if (!P) return;
        const before = { x: b.x, y: b.y };
        const hit = separateCircles(b, BALL_RADIUS_M, P, PLAYER_RADIUS_M, 0.7); // push ball more
        if (hit) {
          const nx = b.x - P.x;
          const ny = b.y - P.y;
          const nd = Math.hypot(nx, ny) || 1;
          const ux = nx / nd;
          const uy = ny / nd;
          const vdotn = bv.vx * ux + bv.vy * uy;
          if (vdotn < 0) {
            bv.vx = (bv.vx - 2 * vdotn * ux) * BALL_BOUNCE;
            bv.vy = (bv.vy - 2 * vdotn * uy) * BALL_BOUNCE;
          }
          // prevent re penetration
          b.x += ux * 0.01;
          b.y += uy * 0.01;
          changed = true;
        }
        ballRef.current = clampToPitch(ballRef.current);
        ps[id].pos = clampToPitch(ps[id].pos);
      });

      if (!changed) break;
    }
  }

  useEffect(() => {
    if (!isRunning || paused || !player1Id || !player2Id) return;

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

      if (drill === "chase") {
        // steer with soft repel from the other player and the ball
        [p1, p2].forEach((p, idx) => {
          const s = ps[p.id];
          const otherId = idx === 0 ? p2.id : p1.id;
          const desired = b;
          const target = steerTarget(
            s.pos,
            desired,
            [ps[otherId].pos, b],
            PLAYER_RADIUS_M
          );
          const next = moveTowardsM(s.pos, target, s.base, dt);

          if (s.prev) {
            const step = dist(s.prev, next);
            const pace = step / dt;
            s.distM += step;
            s.maxPace = Math.max(s.maxPace, pace);

            const ss = sprintStateRef.current[p.id];
            if (ss.cooldown > 0) ss.cooldown = Math.max(0, ss.cooldown - dt);
            if (pace > SPRINT_SPEED && ss.cooldown === 0) {
              ss.tAbove += dt;
              if (ss.tAbove >= 0.4) {
                sprintRef.current[p.id] += 1;
                ss.tAbove = 0;
                ss.cooldown = 1.2;
              }
            } else {
              ss.tAbove = 0;
            }
          }
          s.prev = s.pos;
          s.pos = clampToPitch(next);
        });

        // kick on contact
        const p1d = dist(ps[p1.id].pos, b);
        const p2d = dist(ps[p2.id].pos, b);
        const closest = p1d < p2d ? p1 : p2;
        const minContact = PLAYER_RADIUS_M + BALL_RADIUS_M + MARGIN_M;
        if (Math.min(p1d, p2d) < minContact && lastKickerRef.current !== closest.id) {
          const kicker = ps[closest.id];
          const angle = Math.atan2(b.y - kicker.pos.y, b.x - kicker.pos.x) + (Math.random() - 0.5) * Math.PI * 0.5;
          bv.vx = Math.cos(angle) * KICK_SPEED_MPS;
          bv.vy = Math.sin(angle) * KICK_SPEED_MPS;
          lastKickerRef.current = closest.id;
        }

        // integrate ball and bounce on walls
        b.x += bv.vx * dt;
        b.y += bv.vy * dt;

        const eps = 0.02;
        if (b.x <= 0) { b.x = eps; bv.vx = Math.abs(bv.vx) * BALL_BOUNCE; }
        if (b.x >= PITCH_W) { b.x = PITCH_W - eps; bv.vx = -Math.abs(bv.vx) * BALL_BOUNCE; }
        if (b.y <= 0) { b.y = eps; bv.vy = Math.abs(bv.vy) * BALL_BOUNCE; }
        if (b.y >= PITCH_H) { b.y = PITCH_H - eps; bv.vy = -Math.abs(bv.vy) * BALL_BOUNCE; }

        const f = Math.pow(BALL_FRICTION_PER_SEC, dt);
        bv.vx *= f;
        bv.vy *= f;
        if (Math.hypot(bv.vx, bv.vy) < 0.2) { bv.vx = 0; bv.vy = 0; }

      } else if (drill === "shuttle") {
        [p1, p2].forEach((p, idx) => {
          const s = ps[p.id];
          const laneY = idx === 0 ? SHUTTLE_Y - 6 : SHUTTLE_Y + 6;
          const side = shuttleSideRef.current[p.id] || "R";
          const targetX = side === "R" ? SHUTTLE_R : SHUTTLE_L;
          const desired = { x: targetX, y: laneY };
          const otherId = idx === 0 ? p2.id : p1.id;
          const target = steerTarget(s.pos, desired, [ps[otherId].pos], PLAYER_RADIUS_M);

          const next = moveTowardsM(s.pos, target, s.base, dt);
          if (s.prev) {
            const step = dist(s.prev, next);
            const pace = step / dt;
            s.distM += step;
            s.maxPace = Math.max(s.maxPace, pace);

            const ss = sprintStateRef.current[p.id];
            if (ss.cooldown > 0) ss.cooldown = Math.max(0, ss.cooldown - dt);
            if (pace > SPRINT_SPEED && ss.cooldown === 0) {
              ss.tAbove += dt;
              if (ss.tAbove >= 0.4) {
                sprintRef.current[p.id] += 1;
                ss.tAbove = 0;
                ss.cooldown = 1.2;
              }
            } else {
              ss.tAbove = 0;
            }
          }
          s.prev = s.pos;
          s.pos = clampToPitch(next);

          if (dist(s.pos, desired) < TURN_THRESH_M) {
            shuttleSideRef.current[p.id] = side === "R" ? "L" : "R";
            s.reps = (s.reps || 0) + 1;
          }
        });
      }

      // hard separation loop
      resolveCollisions(8);

      forceRender(n => n + 1);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isRunning, paused, drill, player1Id, player2Id, players]);

  console.log(players)
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Training simulation</h1>

      <Card className="p-4 space-y-2">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="block text-sm">Drill</label>
            <select
              value={drill}
              onChange={(e) => setDrill(e.target.value)}
              className="border p-2 rounded"
              disabled={isRunning}
            >
              <option value="chase">One versus one ball chase</option>
              <option value="shuttle">Shuttle run lanes</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm">Player 1</label>
            <select
              value={player1Id}
              onChange={(e) => setPlayer1Id(e.target.value)}
              className="border p-2 rounded"
              disabled={isRunning}
            >
              <option value="">Select player</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm">Player 2</label>
            <select
              value={player2Id}
              onChange={(e) => setPlayer2Id(e.target.value)}
              className="border p-2 rounded"
              disabled={isRunning}
            >
              <option value="">Select player</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button onClick={startSimulation} disabled={!player1Id || !player2Id}>
              {isRunning ? "Restart" : "Start"}
            </Button>
            {isRunning && (
              <Button variant="outline" onClick={() => setPaused(!paused)}>
                {paused ? "Resume" : "Pause"}
              </Button>
            )}
            {isRunning && (
              <Button
                variant="outline"
                onClick={() => {
                  setIsRunning(false);
                  endAndFeedback();
                }}
              >
                Stop and analyze
              </Button>
            )}
          </div>
        </div>
      </Card>

      {isRunning && (
        <div className="relative w-full max-w-3xl aspect-video bg-green-800 rounded-lg border-2 border-green-900 mx-auto overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/30 rounded-full" />
            <div className="absolute left-0 top-1/2 w-full h-px bg-white/30 -translate-y-1/2" />
            <div className="absolute left-4 top-1/2 w-16 h-32 border-2 border-white/30 rounded-lg -translate-y-1/2" />
            <div className="absolute right-4 top-1/2 w-16 h-32 border-2 border-white/30 rounded-lg -translate-y-1/2" />
            {drill === "shuttle" && (
              <>
                <div className="absolute left-[20%] top-0 w-px h-full bg-white/30" />
                <div className="absolute left-[80%] top-0 w-px h-full bg-white/30" />
              </>
            )}
          </div>

          <div
            className="absolute w-4 h-4 bg-yellow-400 rounded-full shadow-lg transition-transform duration-150"
            style={{
              left: `${toPct(ballRef.current).x}%`,
              top: `${toPct(ballRef.current).y}%`,
              transform: "translate(-50%, -50%)",
            }}
          />

          {[player1Id, player2Id].map((id, index) => {
            const s = stateRef.current[id];
            if (!s) return null;
            const pct = toPct(s.pos);
            const player = players.find(p => p.id === id);
            return (
              <div
                key={id}
                className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-white font-bold transition-transform duration-100 ${index === 0 ? "bg-blue-600" : "bg-red-600"}`}
                style={{
                  left: `${pct.x}%`,
                  top: `${pct.y}%`,
                  transform: "translate(-50%, -50%)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}
              >
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs text-black shadow">
                  {player?.number || index + 1}
                </div>
              </div>
            );
          })}

          <Card className="absolute bottom-2 left-1/2 -translate-x-1/2 p-3 text-sm bg-white/95 backdrop-blur-sm w-[92%] shadow-lg">
            <div className="flex justify-between gap-6">
              {[player1Id, player2Id].map((id) => {
                const player = players.find(p => p.id === id);
                const s = stateRef.current[id] || {};
                const elapsed = startTimeRef.current ? Math.max(1, (performance.now() - startTimeRef.current) / 1000) : 1;
                const avg = s.distM ? s.distM / elapsed : 0;
                return (
                  <div key={id} className="text-center flex-1">
                    <div className="font-bold text-base">{player?.name}</div>
                    <div>Distance {Math.round(s.distM || 0)} m</div>
                    <div>Avg pace {avg.toFixed(2)} m s</div>
                    <div>Max pace {(s.maxPace || 0).toFixed(2)} m s</div>
                    <div>Sprints {sprintRef.current[id] || 0}</div>
                    {drill === "shuttle" && <div>Shuttles {Math.floor((s.reps || 0) / 2)}</div>}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {feedback && (
        <Card className="p-4 space-y-2">
          <div className="font-semibold">Session summary</div>
          <div className="space-y-1">
            {feedback.lines.map((l, i) => (<div key={i}>{l}</div>))}
          </div>
          <div className="mt-2">
            {feedback.coach.map((l, i) => (<div key={i}>{l}</div>))}
          </div>
        </Card>
      )}
    </div>
  );
}

