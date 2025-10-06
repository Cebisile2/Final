import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/PROVIDERS/AuthProvider";
import { toPct as toPctField } from "./field";
import ChaseDrill from "./drills/ChaseDrill";
import ShuttleDrill from "./drills/ShuttleDrill";
import SlalomDrill from "./drills/SlalomDrill";

export default function MainSimulation() {
  const { currentUser } = useAuth();
  const players = currentUser?.players || [];

  const [drill, setDrill] = useState("chase");
  const [player1Id, setPlayer1Id] = useState("");
  const [player2Id, setPlayer2Id] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [stats, setStats] = useState({});

  const startTimeRef = useRef(null);
  const toPct = toPctField;

  const requiredPlayers = { chase: 2, shuttle: 1, slalom: 1 };
  const needsTwo = requiredPlayers[drill] === 2;
  const activeIds = needsTwo ? [player1Id, player2Id].filter(Boolean) : [player1Id].filter(Boolean);

  function fmt(n, d = 2) {
    if (!Number.isFinite(n)) return "0";
    return n.toFixed(d);
  }
  function nowIso() {
    const d = new Date();
    const pad = (x) => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
  function downloadBlob(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }
  function toCSV(report) {
    const header = [
      "session_id","date_time","drill","duration_s",
      "player_id","player_name","position","speed_attr","stamina_attr",
      "distance_m","avg_pace_mps","max_pace_mps","sprints","shuttles","gates","errors","slalom_time_s","feedback",
    ].join(",");
    const rows = report.players.map((p) =>
      [
        report.session.id,
        report.session.date,
        report.session.drill,
        Math.round(report.session.duration_s),
        p.id,
        p.name,
        p.position || p.role || "",
        p.speed ?? "",
        p.stamina ?? "",
        Math.round(p.distance_m || 0),
        fmt(p.avg_pace_mps || 0, 2),
        fmt(p.max_pace_mps || 0, 2),
        p.sprints ?? 0,
        p.shuttles ?? "",
        p.gates ?? "",
        p.errors ?? "",
        p.slalom_time_s ?? "",
        `"${(p.feedback || "").replace(/"/g, '""')}"`,
      ].join(",")
    );
    return [header, ...rows].join("\n");
  }
  function buildSessionReport() {
    if (activeIds.length === 0) return null;
    const selectedPlayers = activeIds
      .map(id => players.find(p => p.id === id))
      .filter(Boolean);

    const now = performance.now();
    const start = startTimeRef.current ?? now;
    const duration_s = Math.max(1, (now - start) / 1000);

    function fb(name, avg, maxp, distM, reps, gates, errors) {
      if (drill === "shuttle" && (reps || 0) < 20) return `${name} needs more repeatability Aim for plus two shuttles next session.`;
      if (drill === "slalom") return `${name} slalom completed Gates ${gates ?? 0} Errors ${errors ?? 0}`;
      if (avg < 2.6) return `${name} needs to raise steady pace Target average above two point eight.`;
      if (maxp > 6.5 && avg < 2.9) return `${name} has good top speed Improve endurance to hold pace longer.`;
      if (distM > 1800 && avg >= 3.0) return `${name} delivered a strong aerobic load today Keep recovery solid.`;
      return `${name} completed the session.`;
    }

    return {
      session: {
        id: `S-${Date.now()}`,
        date: nowIso(),
        drill,
        duration_s,
      },
      players: selectedPlayers.map((px) => {
        const sx = stats[px.id] || {};
        const avg = sx.distM ? sx.distM / duration_s : 0;
        return {
          id: px.id,
          name: px.name,
          position: px.position || px.role || "",
          speed: Number(px.speed ?? ""),
          stamina: Number(px.stamina ?? ""),
          distance_m: sx.distM || 0,
          avg_pace_mps: avg,
          max_pace_mps: sx.maxPace || 0,
          sprints: sx.sprints || 0,
          shuttles: sx.reps ?? "",
          gates: sx.gates ?? "",
          errors: sx.errors ?? "",
          slalom_time_s: sx.time_s ?? "",
          feedback: fb(px.name, avg, sx.maxPace || 0, sx.distM || 0, sx.reps || 0, sx.gates, sx.errors),
        };
      }),
    };
  }
  function downloadCSVReport() {
    const report = buildSessionReport();
    if (!report) return;
    const csv = toCSV(report);
    downloadBlob(csv, `playsmart_${report.session.id}.csv`, "text/csv;charset=utf-8");
  }
  function downloadJSONReport() {
    const report = buildSessionReport();
    if (!report) return;
    const json = JSON.stringify(report, null, 2);
    downloadBlob(json, `playsmart_${report.session.id}.json`, "application/json");
  }

  function start() {
    if (requiredPlayers[drill] === 2) {
      if (!player1Id || !player2Id) return;
    } else {
      if (!player1Id) return;
    }
    setFeedback(null);
    setStats({});
    startTimeRef.current = performance.now();
    setIsRunning(true);
    setPaused(false);
  }
  function stopAndAnalyze() {
    setIsRunning(false);
    setPaused(false);
    const report = buildSessionReport();
    if (!report) return;
    const lines = report.players.map(p =>
      `${p.name} distance ${Math.round(p.distance_m)} m avg pace ${fmt(p.avg_pace_mps)} m s max ${fmt(p.max_pace_mps)} sprints ${p.sprints}` +
      (drill === "shuttle" ? ` reps ${p.shuttles || 0}` : "") +
      (drill === "slalom" ? ` gates ${p.gates || 0} errors ${p.errors || 0} time ${Math.floor(p.slalom_time_s || 0)} s` : "")
    );
    const coach = report.players.map(p => p.feedback);
    setFeedback({ lines, coach });
  }

  const elapsedS = useMemo(() => {
    if (!isRunning || !startTimeRef.current) return 0;
    return Math.max(0, Math.floor((performance.now() - startTimeRef.current) / 1000));
  }, [isRunning, startTimeRef.current]);

  const canStart = requiredPlayers[drill] === 2 ? (player1Id && player2Id) : !!player1Id;

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
              <option value="shuttle">Shuttle run lane</option>
              <option value="slalom">Dribble slalom</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm">Player</label>
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

          {needsTwo && (
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
          )}

          <div className="flex gap-2">
            {!isRunning && <Button onClick={start} disabled={!canStart}>Start</Button>}
            {isRunning && <Button variant="outline" onClick={() => setPaused(v => !v)}>{paused ? "Resume" : "Pause"}</Button>}
            {isRunning && <Button variant="outline" onClick={stopAndAnalyze}>Stop and analyze</Button>}
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

          {drill === "chase" && (
            <ChaseDrill
              players={players}
              player1Id={player1Id}
              player2Id={player2Id}
              running={isRunning}
              paused={paused}
              onMetrics={setStats}
              toPct={toPct}
            />
          )}
          {drill === "shuttle" && (
            <ShuttleDrill
              players={players}
              player1Id={player1Id}
              player2Id={null}  
              running={isRunning}
              paused={paused}
              onMetrics={setStats}
              toPct={toPct}
            />
          )}
          {drill === "slalom" && (
            <SlalomDrill
              players={players}
              player1Id={player1Id}
              player2Id={null}
              running={isRunning}
              paused={paused}
              onMetrics={setStats}
              toPct={toPct}
            />
          )}

          <Card className="absolute opacity-60 bottom-2 left-1/2 -translate-x-1/2 p-3 text-sm bg-white/95 backdrop-blur-sm w-[92%] shadow-lg">
            <div className="flex justify-between gap-6">
              {activeIds.map((id) => {
                const player = players.find((p) => p.id === id);
                const s = stats[id] || {};
                const avg = s.distM && startTimeRef.current
                  ? s.distM / Math.max(1, (performance.now() - startTimeRef.current) / 1000)
                  : 0;
                return (
                  <div key={id} className="text-center flex-1">
                    <div className="font-bold text-base">{player?.name}</div>
                    <div>Avg pace {avg.toFixed(2)} m s</div>
                    <div>Max pace {(s.maxPace || 0).toFixed(2)} m s</div>
                    {drill === "shuttle" && <div>Shuttles {s.reps || 0}</div>}
                    {drill === "slalom" && (
                      <>
                        <div>Gates {s.gates || 0}</div>
                        <div>Errors {s.errors || 0}</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-1">Time {startTimeRef.current ? Math.max(0, Math.floor((performance.now() - startTimeRef.current) / 1000)) : 0} s</div>
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

          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadCSVReport}>Download CSV</Button>
            <Button variant="outline" onClick={downloadJSONReport}>Download JSON</Button>
          </div>
      
        </Card>
      )}
    </div>
  );
}

