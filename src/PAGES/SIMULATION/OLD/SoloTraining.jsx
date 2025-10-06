import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/PROVIDERS/AuthProvider";

function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

export default function SoloTrainingPage() {
  const { currentUser } = useAuth();
  const players = currentUser?.players || [];

  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [targetPosition, setTargetPosition] = useState({ x: 50, y: 50 });

  const playerStateRef = useRef({
    position: { x: 50, y: 50 },
    velocity: { x: 0, y: 0 },
    stamina: 100,
    distanceCovered: 0,
    rotation: 0,
  });

  const [, forceRender] = useState(0);
  const animationRef = useRef();
  const targetRef = useRef(targetPosition);

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId);

  // Sync target ref with state
  useEffect(() => {
    targetRef.current = targetPosition;
  }, [targetPosition]);

  const startSimulation = () => {
    if (!selectedPlayer) return;

    playerStateRef.current = {
      position: { x: 50, y: 50 },
      velocity: { x: 0, y: 0 },
      stamina: 100,
      distanceCovered: 0,
      rotation: 0,
    };

    setTargetPosition({ x: 50, y: 50 });
    setIsRunning(true);
    setPaused(false);
  };

  useEffect(() => {
    if (!isRunning || paused || !selectedPlayer) return;

    const animate = (timestamp) => {
      const state = playerStateRef.current;
      const baseSpeed = (selectedPlayer.speed || 50) / 800;
      const agility = (selectedPlayer.agility || 50) / 100;

      // Calculate direction to target
      const dx = targetRef.current.x - state.position.x;
      const dy = targetRef.current.y - state.position.y;
      const distance = Math.hypot(dx, dy);

      // Update rotation
      if (distance > 1) {
        const targetRotation = Math.atan2(dy, dx);
        state.rotation = lerp(state.rotation, targetRotation, agility * 0.15);
      }

      // Update velocity with stamina effect
      const speedMultiplier = baseSpeed * (state.stamina / 100);
      if (distance > 2) {
        state.velocity.x = lerp(
          state.velocity.x,
          dx * speedMultiplier,
          agility * 0.1
        );
        state.velocity.y = lerp(
          state.velocity.y,
          dy * speedMultiplier,
          agility * 0.1
        );
      } else {
        state.velocity.x = lerp(state.velocity.x, 0, 0.2);
        state.velocity.y = lerp(state.velocity.y, 0, 0.2);
      }

      // Update position
      state.position.x += state.velocity.x;
      state.position.y += state.velocity.y;

      // Boundary constraints
      state.position.x = Math.max(5, Math.min(95, state.position.x));
      state.position.y = Math.max(5, Math.min(95, state.position.y));

      // Update stats
      const distanceMoved = Math.hypot(state.velocity.x, state.velocity.y);
      state.distanceCovered += distanceMoved;
      state.stamina = Math.max(0, state.stamina - distanceMoved * 0.4);
      if (distanceMoved < 0.1) {
        state.stamina = Math.min(100, state.stamina + 0.8);
      }

      forceRender((n) => n + 1);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isRunning, paused, selectedPlayer]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Solo Player Training</h1>

      <Card className="p-4 space-y-2">
        <div className="flex gap-4 flex-wrap items-center">
          <div className="space-y-1">
            <label className="block text-sm">Select Player:</label>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
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
            <Button onClick={startSimulation} disabled={!selectedPlayerId}>
              {isRunning ? "Reset" : "Start"}
            </Button>

            {isRunning && (
              <Button variant="outline" onClick={() => setPaused(!paused)}>
                {paused ? "Resume" : "Pause"}
              </Button>
            )}
        {isRunning && (
              <Button variant="outline" onClick={() =>  setIsRunning(false)}>
              cancel simulation 
              </Button>
            )}
          </div>
        </div>
      </Card>

      {isRunning && selectedPlayer && (
        <div className="relative w-full max-w-3xl aspect-video bg-green-800 rounded-lg border-2 border-green-900 mx-auto overflow-hidden">
          {/* Field Pattern */}
          <div className="absolute inset-0 bg-green-700/20 pattern-diagonal-lines pattern-green-900 pattern-bg-transparent pattern-opacity-20 pattern-size-8" />

          {/* Player */}
          <div
            className="absolute w-8 h-8 transition-all duration-100"
            style={{
              left: `${playerStateRef.current.position.x}%`,
              top: `${playerStateRef.current.position.y}%`,
              transform: `translate(-50%, -50%) rotate(${playerStateRef.current.rotation}rad)`,
            }}
          >
            <div className="w-full h-full bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs text-black shadow">
                {selectedPlayer.number || 1}
              </div>
            </div>
            {/* Direction Indicator */}
            <div
              className="absolute top-1/2 left-1/2 w-12 h-1 bg-yellow-400 rounded-full origin-left"
              style={{
                transform: `translate(0, -50%) scaleX(${
                  0.3 +
                  Math.min(
                    1,
                    Math.hypot(
                      playerStateRef.current.velocity.x,
                      playerStateRef.current.velocity.y
                    ) * 10
                  )
                })`,
                opacity: 0.7,
              }}
            />
          </div>

          {/* Target Marker */}
          <div
            className="absolute w-6 h-6 bg-transparent border-2 border-yellow-400 rounded-full animate-pulse"
            style={{
              left: `${targetPosition.x}%`,
              top: `${targetPosition.y}%`,
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 12px rgba(250, 204, 21, 0.4)",
            }}
          />

          {/* Stats Panel */}
          <Card className="absolute bottom-2 left-1/2 -translate-x-1/2 p-3 text-sm bg-white/95 backdrop-blur-sm w-[90%] shadow-lg">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-gray-500">Speed</div>
                <div className="font-bold">
                  {(selectedPlayer.speed || 50).toFixed(0)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Stamina</div>
                <div className="font-bold">
                  {Math.round(playerStateRef.current.stamina)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Distance</div>
                <div className="font-bold">
                  {Math.round(playerStateRef.current.distanceCovered)}m
                </div>
              </div>
            </div>
          </Card>

          {/* Control Buttons */}
          <div className="absolute top-2 right-2 space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setTargetPosition({
                  x: Math.random() * 80 + 10,
                  y: Math.random() * 80 + 10,
                })
              }
            >
              Random Target
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTargetPosition({ x: 50, y: 50 })}
            >
              Center Ball
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
