
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/PROVIDERS/AuthProvider";

function getDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function moveTowards(current, target, maxStep) {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const distance = Math.hypot(dx, dy);
  return distance <= maxStep
    ? target
    : {
        x: current.x + (dx / distance) * maxStep,
        y: current.y + (dy / distance) * maxStep,
      };
}

export default function TrainingPage() {
  const { currentUser } = useAuth();
  const players = currentUser?.players || [];

  const [player1Id, setPlayer1Id] = useState("");
  const [player2Id, setPlayer2Id] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [paused, setPaused] = useState(false);

  // Game parameters
  const PLAYER_MIN_DISTANCE = 6;
  const BALL_SPEED = 1.5;
  const PLAYER_SPEED_MULTIPLIER = 0.03;
  const KICK_BASE_DISTANCE = 30;
  const FIELD_PADDING = 12;

  // Refs for game state
  const ballRef = useRef({ x: 50, y: 50 });
  const ballTargetRef = useRef({ x: 50, y: 50 });
  const playersStateRef = useRef({});
  const statsRef = useRef({});
  const lastKickerRef = useRef(null);
  const [, forceRender] = useState(0);

  const startSimulation = () => {
    if (!player1Id || !player2Id) return;

    // Set initial positions with more spacing
    ballRef.current = { x: 50, y: 50 };
    ballTargetRef.current = {
      x: 50 + (Math.random() - 0.5) * 30,
      y: 50 + (Math.random() - 0.5) * 30,
    };

    playersStateRef.current = {
      [player1Id]: { x: 25, y: 50, distance: 0 },
      [player2Id]: { x: 75, y: 50, distance: 0 },
    };

    statsRef.current = {
      [player1Id]: { possession: 0 },
      [player2Id]: { possession: 0 },
    };

    lastKickerRef.current = null;
    setIsRunning(true);
    setPaused(false);
  };

  useEffect(() => {
    if (!isRunning || paused || !player1Id || !player2Id) return;

    let animationFrame;
    const animate = () => {
      const ball = { ...ballRef.current };
      const playersState = { ...playersStateRef.current };
      const stats = { ...statsRef.current };
      const player1 = players.find((p) => p.id === player1Id);
      const player2 = players.find((p) => p.id === player2Id);

      // Update player positions
      [player1, player2].forEach((player, index) => {
        const current = playersState[player.id];
        const speed = (player.speed || 50) * PLAYER_SPEED_MULTIPLIER;
        const newPos = moveTowards(current, ball, speed);

        // Collision avoidance
        [ball, playersState[index === 0 ? player2.id : player1.id]].forEach(
          (target) => {
            const dx = target.x - newPos.x;
            const dy = target.y - newPos.y;
            const distance = Math.hypot(dx, dy);
            if (distance < PLAYER_MIN_DISTANCE) {
              newPos.x = target.x - (dx / distance) * PLAYER_MIN_DISTANCE;
              newPos.y = target.y - (dy / distance) * PLAYER_MIN_DISTANCE;
            }
          }
        );

        playersState[player.id] = {
          x: Math.max(FIELD_PADDING, Math.min(100 - FIELD_PADDING, newPos.x)),
          y: Math.max(FIELD_PADDING, Math.min(100 - FIELD_PADDING, newPos.y)),
          distance: current.distance + getDistance(current, newPos),
        };
      });

      // Check for kicks
      const [p1Pos, p2Pos] = [
        playersState[player1.id],
        playersState[player2.id],
      ];
      const [p1Dist, p2Dist] = [
        getDistance(p1Pos, ball),
        getDistance(p2Pos, ball),
      ];
      const closestPlayer = p1Dist < p2Dist ? player1 : player2;

      if (
        Math.min(p1Dist, p2Dist) < PLAYER_MIN_DISTANCE &&
        lastKickerRef.current !== closestPlayer.id
      ) {
        const kickPower = KICK_BASE_DISTANCE * (1 + closestPlayer.speed / 100);
        const kickAngle =
          Math.atan2(
            ball.y - playersState[closestPlayer.id].y,
            ball.x - playersState[closestPlayer.id].x
          ) +
          ((Math.random() - 0.5) * Math.PI) / 2; // Add random angle variance

        // Calculate new ball target
        ballTargetRef.current = {
          x: ball.x + Math.cos(kickAngle) * kickPower,
          y: ball.y + Math.sin(kickAngle) * kickPower,
        };

        // Keep within bounds
        ballTargetRef.current.x = Math.max(
          FIELD_PADDING,
          Math.min(100 - FIELD_PADDING, ballTargetRef.current.x)
        );
        ballTargetRef.current.y = Math.max(
          FIELD_PADDING,
          Math.min(100 - FIELD_PADDING, ballTargetRef.current.y)
        );

        // Immediately move ball and update state
        ballRef.current = moveTowards(
          ball,
          ballTargetRef.current,
          BALL_SPEED * 2
        );
        stats[closestPlayer.id].possession++;
        lastKickerRef.current = closestPlayer.id;
      }

      // Normal ball movement
      ballRef.current = moveTowards(ball, ballTargetRef.current, BALL_SPEED);

      // Add random ball target jitter
      if (Math.random() < 0.02) {
        ballTargetRef.current = {
          x: ballTargetRef.current.x + (Math.random() - 0.5) * 4,
          y: ballTargetRef.current.y + (Math.random() - 0.5) * 4,
        };
      }

      // Update refs and render
      playersStateRef.current = playersState;
      statsRef.current = stats;
      forceRender((n) => n + 1);

      if (!paused) animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isRunning, paused, player1Id, player2Id]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">1 vs 1 Soccer Simulation</h1>

      <Card className="p-4 space-y-2">
        <div className="flex gap-4 flex-wrap items-center">
          <div className="space-y-1">
            <label className="block text-sm">Player 1:</label>
            <select
              value={player1Id}
              onChange={(e) => setPlayer1Id(e.target.value)}
              className="border p-2 rounded"
              disabled={isRunning}
            >
              <option value="">Select Player</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm">Player 2:</label>
            <select
              value={player2Id}
              onChange={(e) => setPlayer2Id(e.target.value)}
              className="border p-2 rounded"
              disabled={isRunning}
            >
              <option value="">Select Player</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 items-end">
            <Button
              onClick={startSimulation}
              disabled={!player1Id || !player2Id}
            >
              {isRunning ? "Restart" : "Start"}
            </Button>
            {isRunning && (
              <Button variant="outline" onClick={() => setPaused(!paused)}>
                {paused ? "Resume" : "Pause"}
              </Button>
            )}
            {isRunning && (
              <Button variant="outline" onClick={() => setIsRunning(false)}>
              cancel simulation
              </Button>
            )}
          </div>
        </div>
      </Card>

      {isRunning && (
        <div className="relative w-full max-w-3xl aspect-video bg-green-800 rounded-lg border-2 border-green-900 mx-auto overflow-hidden">
          {/* Field Markings */}
          <div className="absolute inset-0">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/30 rounded-full" />
            <div className="absolute left-0 top-1/2 w-full h-px bg-white/30 -translate-y-1/2" />
            <div className="absolute left-4 top-1/2 w-16 h-32 border-2 border-white/30 rounded-lg -translate-y-1/2" />
            <div className="absolute right-4 top-1/2 w-16 h-32 border-2 border-white/30 rounded-lg -translate-y-1/2" />
          </div>

          {/* Grass Pattern */}
          <div className="absolute inset-0 opacity-20 bg-[size:40px_40px] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)]" />

          {/* Ball */}
          <div
            className="absolute w-4 h-4 bg-yellow-400 rounded-full shadow-lg transition-all duration-300"
            style={{
              left: `${ballRef.current.x}%`,
              top: `${ballRef.current.y}%`,
              transform: `translate(-50%, -50%)`,
            }}
          />

          {/* Players */}
          {[player1Id, player2Id].map((id, index) => {
            const player = players.find((p) => p.id === id);
            return (
              <div
                key={id}
                className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-white font-bold transition-all duration-200 ${
                  index === 0 ? "bg-blue-600" : "bg-red-600"
                }`}
                style={{
                  left: `${playersStateRef.current[id]?.x}%`,
                  top: `${playersStateRef.current[id]?.y}%`,
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

          {/* Stats Panel */}
          <Card className="absolute bottom-2 left-1/2 -translate-x-1/2 p-3 text-sm bg-white/95 backdrop-blur-sm w-[90%] shadow-lg">
            <div className="flex justify-between">
              {[player1Id, player2Id].map((id, index) => {
                const player = players.find((p) => p.id === id);
                return (
                  <div key={id} className="text-center flex-1">
                    <div className="font-bold text-base">{player?.name}</div>
                    <div>
                      Possessions: {statsRef.current[id]?.possession || 0}
                    </div>
                    <div>
                      Distance:{" "}
                      {Math.round(playersStateRef.current[id]?.distance || 0)}m
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
