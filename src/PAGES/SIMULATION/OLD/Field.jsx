import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";

const FIELD_BOUNDS = { minX: 5, maxX: 95, minY: 5, maxY: 95 };
const BALL_SPEED_DECAY = 0.96;
const PLAYER_RADIUS = 3;
const BALL_RADIUS = 2;


// shared pitch constants used by all drills and the HUD
export const PITCH_W = 105;
export const PITCH_H = 68;

// shared helper if you want it
export function toPct(p) {
  return { x: (p.x / PITCH_W) * 100, y: (p.y / PITCH_H) * 100 };
}

export default function Field({ player1, player2 }) {
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [ball, setBall] = useState({
    pos: { x: 50, y: 50 },
    vel: { x: 0, y: 0 },
  });

  const [players, setPlayers] = useState({
    p1: {
      pos: { x: 20, y: 50 },
      stats: { possession: 0, distance: 0 },
    },
    p2: {
      pos: { x: 80, y: 50 },
      stats: { possession: 0, distance: 0 },
    },
  });

  const animationRef = useRef();
  const lastUpdate = useRef(performance.now());

  const resetPositions = () => {
    setBall({
      pos: { x: 50, y: 50 },
      vel: { x: 0, y: 0 },
    });
    setPlayers({
      p1: { ...players.p1, pos: { x: 20, y: 50 } },
      p2: { ...players.p2, pos: { x: 80, y: 50 } },
    });
  };

  useEffect(() => {
    const animate = (timestamp) => {
      const deltaTime = (timestamp - lastUpdate.current) / 1000;
      lastUpdate.current = timestamp;

      // Update player positions
      setPlayers((prev) => {
        const newPlayers = { ...prev };

        // Player 1 movement
        const movePlayer = (playerKey, speed) => {
          const toBall = {
            x: ball.pos.x - newPlayers[playerKey].pos.x,
            y: ball.pos.y - newPlayers[playerKey].pos.y,
          };
          const distance = Math.sqrt(toBall.x ** 2 + toBall.y ** 2);

          if (distance > PLAYER_RADIUS + BALL_RADIUS) {
            const moveSpeed = speed * deltaTime * 50;
            newPlayers[playerKey].pos.x += (toBall.x / distance) * moveSpeed;
            newPlayers[playerKey].pos.y += (toBall.y / distance) * moveSpeed;
          }

          // Keep within bounds
          newPlayers[playerKey].pos.x = Math.max(
            FIELD_BOUNDS.minX,
            Math.min(FIELD_BOUNDS.maxX, newPlayers[playerKey].pos.x)
          );
          newPlayers[playerKey].pos.y = Math.max(
            FIELD_BOUNDS.minY,
            Math.min(FIELD_BOUNDS.maxY, newPlayers[playerKey].pos.y)
          );
        };

        movePlayer("p1", player1.speed);
        movePlayer("p2", player2.speed);

        // Update distance stats
        newPlayers.p1.stats.distance += Math.sqrt(
          (newPlayers.p1.pos.x - prev.p1.pos.x) ** 2 +
            (newPlayers.p1.pos.y - prev.p1.pos.y) ** 2
        );

        newPlayers.p2.stats.distance += Math.sqrt(
          (newPlayers.p2.pos.x - prev.p2.pos.x) ** 2 +
            (newPlayers.p2.pos.y - prev.p2.pos.y) ** 2
        );

        return newPlayers;
      });

      // Update ball physics
      setBall((prev) => {
        const newPos = {
          x: prev.pos.x + prev.vel.x * deltaTime,
          y: prev.pos.y + prev.vel.y * deltaTime,
        };

        // Check scoring
        if (newPos.x < 10) {
          setScore((s) => ({ ...s, p2: s.p2 + 1 }));
          resetPositions();
          return prev;
        }
        if (newPos.x > 90) {
          setScore((s) => ({ ...s, p1: s.p1 + 1 }));
          resetPositions();
          return prev;
        }

        // Ball boundary checks
        if (newPos.y < FIELD_BOUNDS.minY || newPos.y > FIELD_BOUNDS.maxY) {
          newPos.y = Math.max(
            FIELD_BOUNDS.minY,
            Math.min(FIELD_BOUNDS.maxY, newPos.y)
          );
          return { pos: newPos, vel: { ...prev.vel, y: -prev.vel.y * 0.8 } };
        }

        return {
          pos: newPos,
          vel: {
            x: prev.vel.x * BALL_SPEED_DECAY,
            y: prev.vel.y * BALL_SPEED_DECAY,
          },
        };
      });

      // Check collisions
      const checkCollision = (playerKey) => {
        const player = players[playerKey];
        const dx = player.pos.x - ball.pos.x;
        const dy = player.pos.y - ball.pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < PLAYER_RADIUS + BALL_RADIUS) {
          // Update possession
          setPlayers((prev) => ({
            ...prev,
            [playerKey]: {
              ...prev[playerKey],
              stats: {
                ...prev[playerKey].stats,
                possession: prev[playerKey].stats.possession + 1,
              },
            },
          }));

          // Calculate kick direction
          const angle = Math.atan2(dy, dx);
          const kickPower =
            500 + (playerKey === "p1" ? player1.power : player2.power) * 50;

          setBall((prev) => ({
            pos: prev.pos,
            vel: {
              x: Math.cos(angle) * kickPower,
              y: Math.sin(angle) * kickPower,
            },
          }));
        }
      };

      checkCollision("p1");
      checkCollision("p2");

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [ball.pos, players.p1.pos, players.p2.pos]);

  return (
    <div className="relative w-full max-w-3xl aspect-video bg-green-700 rounded-md border border-green-900 mx-auto overflow-hidden">
      {/* Court markings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-px bg-white/20" />
        <div className="absolute w-8 h-8 rounded-full border-2 border-white/20" />
      </div>

      {/* Goals */}
      <div className="absolute top-1/2 -translate-y-1/2 w-4 h-20 bg-gray-200/50 left-0" />
      <div className="absolute top-1/2 -translate-y-1/2 w-4 h-20 bg-gray-200/50 right-0" />

      {/* Ball */}
      <div
        className="absolute w-4 h-4 bg-yellow-400 rounded-full transition-transform duration-75"
        style={{
          left: `${ball.pos.x}%`,
          top: `${ball.pos.y}%`,
          transform: `translate(-50%, -50%) scale(${
            1 + Math.sqrt(ball.vel.x ** 2 + ball.vel.y ** 2) / 1000
          })`,
        }}
      />

      {/* Players */}
      <div
        className="absolute w-6 h-6 bg-blue-500 rounded-full text-white flex items-center justify-center text-xs font-bold transition-all duration-75 shadow-md"
        style={{
          left: `${players.p1.pos.x}%`,
          top: `${players.p1.pos.y}%`,
          transform: `translate(-50%, -50%) scale(${
            1 + players.p1.stats.possession * 0.1
          })`,
        }}
      >
        {player1.name?.charAt(0) || "P1"}
      </div>

      <div
        className="absolute w-6 h-6 bg-red-500 rounded-full text-white flex items-center justify-center text-xs font-bold transition-all duration-75 shadow-md"
        style={{
          left: `${players.p2.pos.x}%`,
          top: `${players.p2.pos.y}%`,
          transform: `translate(-50%, -50%) scale(${
            1 + players.p2.stats.possession * 0.1
          })`,
        }}
      >
        {player2.name?.charAt(0) || "P2"}
      </div>

      {/* Scoreboard */}
      <Card className="absolute top-2 left-1/2 -translate-x-1/2 p-2 px-4 text-lg bg-white/90 shadow-md">
        <div className="flex gap-4 font-mono">
          <span className="text-blue-500">{score.p1}</span>
          <span className="text-gray-500">:</span>
          <span className="text-red-500">{score.p2}</span>
        </div>
      </Card>

      {/* Stats */}
      <Card className="absolute bottom-2 left-1/2 -translate-x-1/2 p-2 text-sm bg-white/90 shadow-md w-[90%]">
        <div className="flex justify-between">
          <div className="text-blue-500">
            <strong>{player1?.name || "Player 1"}</strong>
            <div>Possession: {players.p1.stats.possession}</div>
            <div>Distance: {(players.p1.stats.distance / 100).toFixed(1)}m</div>
          </div>
          <div className="text-red-500">
            <strong>{player2?.name || "Player 2"}</strong>
            <div>Possession: {players.p2.stats.possession}</div>
            <div>Distance: {(players.p2.stats.distance / 100).toFixed(1)}m</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
