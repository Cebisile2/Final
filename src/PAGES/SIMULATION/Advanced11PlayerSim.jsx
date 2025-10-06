import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/PROVIDERS/AuthProvider";
import { Play, Pause, Square, RotateCcw } from "lucide-react";

// Pitch dimensions in meters (standard FIFA dimensions)
const PITCH_WIDTH = 105;
const PITCH_HEIGHT = 68;

// Formation positions in percentages [x, y] - 4-3-3 formation
const FORMATION_4_3_3 = {
  // Goalkeeper
  GK: [10, 50],
  // Defenders
  LB: [25, 15],  // Left Back
  CB1: [25, 35], // Center Back 1
  CB2: [25, 65], // Center Back 2
  RB: [25, 85],  // Right Back
  // Midfielders
  CM1: [50, 25], // Center Mid 1
  CM2: [50, 50], // Center Mid 2 (Central)
  CM3: [50, 75], // Center Mid 3
  // Forwards
  LW: [75, 25],  // Left Wing
  ST: [75, 50],  // Striker
  RW: [75, 75]   // Right Wing
};

export default function Advanced11PlayerSim() {
  const { currentUser } = useAuth();
  const players = currentUser?.players || [];

  const [isRunning, setIsRunning] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 50 });
  const [playerPositions, setPlayerPositions] = useState({});
  const [playerStats, setPlayerStats] = useState({});
  const [ballPossession, setBallPossession] = useState(null);
  const [matchEvents, setMatchEvents] = useState([]);

  const intervalRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());

  // Initialize players with 4-3-3 formation
  useEffect(() => {
    if (players.length >= 11) {
      const formationPositions = Object.values(FORMATION_4_3_3);
      const initialPositions = {};
      const initialStats = {};

      players.slice(0, 11).forEach((player, index) => {
        const [x, y] = formationPositions[index] || [50, 50];

        initialPositions[player.id] = {
          x: x,
          y: y,
          targetX: x,
          targetY: y,
          name: player.name,
          position: player.position,
          speed: (player.speed || 50) / 100, // Normalize to 0-1
          stamina: player.stamina || 70,
          currentStamina: player.stamina || 70,
          maxSpeed: (player.speed || 50) / 100 * 3, // Max m/s
          role: getPlayerRole(index),
          isWithBall: false,
          intention: 'defending', // defending, attacking, supporting
          lastAction: 'idle',
          actionCooldown: 0
        };

        initialStats[player.id] = {
          name: player.name,
          position: player.position,
          distanceCovered: 0,
          passes: 0,
          tackles: 0,
          shots: 0,
          ballTouches: 0,
          averageSpeed: 0
        };
      });

      setPlayerPositions(initialPositions);
      setPlayerStats(initialStats);
      setBallPossession(players[9]?.id); // Start with striker
    }
  }, [players]);

  // Get player role based on formation index
  const getPlayerRole = (index) => {
    const roles = ['GK', 'LB', 'CB1', 'CB2', 'RB', 'CM1', 'CM2', 'CM3', 'LW', 'ST', 'RW'];
    return roles[index] || 'SUB';
  };

  // Advanced AI decision making for each player
  const updatePlayerAI = (playerId, playerData, allPlayers, ball, deltaTime) => {
    const distanceToBall = calculateDistance(playerData, ball);
    const isCloseToBall = distanceToBall < 5;

    let newIntention = playerData.intention;
    let targetX = playerData.targetX;
    let targetY = playerData.targetY;

    // Role-based AI behavior
    switch (playerData.role) {
      case 'GK':
        // Goalkeeper stays near goal, moves based on ball position
        targetX = Math.max(5, Math.min(20, ball.x * 0.3 + 10));
        targetY = Math.max(30, Math.min(70, ball.y));
        newIntention = 'defending';
        break;

      case 'LB':
      case 'CB1':
      case 'CB2':
      case 'RB':
        // Defenders: stay in defensive third, move towards ball if in danger
        if (ball.x < 40) {
          targetX = ball.x * 0.8 + 15;
          targetY = ball.y * 0.6 + playerData.y * 0.4;
          newIntention = 'defending';
        } else {
          targetX = 30;
          targetY = FORMATION_4_3_3[playerData.role][1];
          newIntention = 'supporting';
        }
        break;

      case 'CM1':
      case 'CM2':
      case 'CM3':
        // Midfielders: dynamic positioning based on ball location
        if (ballPossession && playerData.id === ballPossession) {
          newIntention = 'attacking';
        } else if (ball.x < 50) {
          targetX = ball.x * 0.7 + 35;
          targetY = ball.y * 0.7 + playerData.y * 0.3;
          newIntention = 'defending';
        } else {
          targetX = ball.x * 0.6 + 40;
          targetY = ball.y * 0.8 + FORMATION_4_3_3[playerData.role][1] * 0.2;
          newIntention = 'attacking';
        }
        break;

      case 'LW':
      case 'ST':
      case 'RW':
        // Forwards: move towards goal when attacking
        if (ball.x > 50) {
          targetX = Math.min(85, ball.x + 10);
          targetY = ball.y * 0.8 + FORMATION_4_3_3[playerData.role][1] * 0.2;
          newIntention = 'attacking';
        } else {
          targetX = 60;
          targetY = FORMATION_4_3_3[playerData.role][1];
          newIntention = 'supporting';
        }
        break;
    }

    // Ball possession logic
    if (isCloseToBall && !ballPossession) {
      setBallPossession(playerId);
      setMatchEvents(prev => [...prev.slice(-4), {
        time: gameTime,
        event: `${playerData.name} gains possession`,
        type: 'possession'
      }]);
    }

    // Movement towards target with realistic physics
    const targetDistance = calculateDistance(playerData, { x: targetX, y: targetY });
    const moveSpeed = playerData.maxSpeed * (playerData.currentStamina / 100) * deltaTime;

    let newX = playerData.x;
    let newY = playerData.y;

    if (targetDistance > 1) {
      const moveRatio = Math.min(moveSpeed / targetDistance, 1);
      newX = playerData.x + (targetX - playerData.x) * moveRatio;
      newY = playerData.y + (targetY - playerData.y) * moveRatio;
    }

    // Stamina depletion based on movement
    const movement = calculateDistance(playerData, { x: newX, y: newY });
    const staminaLoss = movement * 0.1;

    return {
      ...playerData,
      x: Math.max(5, Math.min(95, newX)),
      y: Math.max(5, Math.min(95, newY)),
      targetX,
      targetY,
      intention: newIntention,
      currentStamina: Math.max(20, playerData.currentStamina - staminaLoss),
      actionCooldown: Math.max(0, playerData.actionCooldown - deltaTime)
    };
  };

  // Ball physics and movement
  const updateBallPhysics = (deltaTime) => {
    if (ballPossession) {
      const possessor = playerPositions[ballPossession];
      if (possessor) {
        // Ball follows player with possession
        setBallPosition({
          x: possessor.x + (Math.random() - 0.5) * 2,
          y: possessor.y + (Math.random() - 0.5) * 2
        });

        // Random chance to lose possession or pass
        if (Math.random() < 0.02) { // 2% chance per frame
          passBall(possessor);
        }
      }
    } else {
      // Ball moves freely, slowing down due to friction
      setBallPosition(prev => ({
        x: Math.max(5, Math.min(95, prev.x + (Math.random() - 0.5) * 0.5)),
        y: Math.max(5, Math.min(95, prev.y + (Math.random() - 0.5) * 0.5))
      }));
    }
  };

  // Pass ball logic
  const passBall = (fromPlayer) => {
    const teammates = Object.values(playerPositions).filter(p =>
      p.id !== fromPlayer.id &&
      calculateDistance(fromPlayer, p) < 30 &&
      p.intention === 'attacking' || p.intention === 'supporting'
    );

    if (teammates.length > 0) {
      const target = teammates[Math.floor(Math.random() * teammates.length)];
      setBallPossession(target.id);

      // Update stats
      setPlayerStats(prev => ({
        ...prev,
        [fromPlayer.id]: {
          ...prev[fromPlayer.id],
          passes: prev[fromPlayer.id].passes + 1
        }
      }));

      setMatchEvents(prev => [...prev.slice(-4), {
        time: gameTime,
        event: `${fromPlayer.name} passes to ${target.name}`,
        type: 'pass'
      }]);
    } else {
      setBallPossession(null);
    }
  };

  // Calculate distance between two points
  const calculateDistance = (p1, p2) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  };

  // Main simulation loop
  const updateSimulation = () => {
    const now = Date.now();
    const deltaTime = (now - lastUpdateRef.current) / 1000; // Convert to seconds
    lastUpdateRef.current = now;

    setGameTime(prev => prev + deltaTime);

    // Update ball physics
    updateBallPhysics(deltaTime);

    // Update all players
    setPlayerPositions(prev => {
      const updated = {};
      Object.keys(prev).forEach(playerId => {
        updated[playerId] = updatePlayerAI(playerId, prev[playerId], prev, ballPosition, deltaTime);
      });
      return updated;
    });

    // Update player statistics
    setPlayerStats(prev => {
      const updated = { ...prev };
      Object.values(playerPositions).forEach(player => {
        if (updated[player.id]) {
          updated[player.id] = {
            ...updated[player.id],
            distanceCovered: updated[player.id].distanceCovered + (player.maxSpeed * deltaTime),
            averageSpeed: player.maxSpeed * (player.currentStamina / 100)
          };
        }
      });
      return updated;
    });
  };

  const startSimulation = () => {
    setIsRunning(true);
    lastUpdateRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      updateSimulation();
    }, 50); // 20 FPS for smooth movement
  };

  const pauseSimulation = () => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const stopSimulation = () => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setGameTime(0);
    setBallPossession(null);
    setMatchEvents([]);
  };

  const resetPositions = () => {
    if (players.length >= 11) {
      const formationPositions = Object.values(FORMATION_4_3_3);
      setPlayerPositions(prev => {
        const reset = {};
        Object.keys(prev).forEach((playerId, index) => {
          const [x, y] = formationPositions[index] || [50, 50];
          reset[playerId] = {
            ...prev[playerId],
            x,
            y,
            targetX: x,
            targetY: y,
            currentStamina: prev[playerId].stamina,
            intention: 'defending'
          };
        });
        return reset;
      });
      setBallPosition({ x: 50, y: 50 });
      setBallPossession(players[9]?.id);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  if (players.length < 11) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold mb-4">⚠️ Not Enough Players</h2>
            <p>You need 11 players to run the advanced simulation.</p>
            <p>Current players: {players.length}/11</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">⚽ Advanced 11-Player Football Simulation</h1>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div className="text-lg font-bold">
              Time: {gameTime.toFixed(1)}s | Players: {Object.keys(playerPositions).length}/11
            </div>
            <div className="flex gap-2">
              {!isRunning ? (
                <Button onClick={startSimulation} className="bg-green-600">
                  <Play className="w-4 h-4 mr-1" />
                  Start Match
                </Button>
              ) : (
                <Button onClick={pauseSimulation} className="bg-yellow-600">
                  <Pause className="w-4 h-4 mr-1" />
                  Pause
                </Button>
              )}
              <Button onClick={stopSimulation} className="bg-red-600">
                <Square className="w-4 h-4 mr-1" />
                Stop
              </Button>
              <Button onClick={resetPositions} className="bg-gray-600">
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset Formation
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Football Pitch */}
      <Card>
        <CardContent className="p-4">
          <div
            className="relative w-full h-96 bg-green-500 border-4 border-white rounded"
            style={{ minHeight: '500px' }}
          >
            {/* Pitch markings */}
            <div className="absolute left-1/2 top-0 w-1 h-full bg-white transform -translate-x-0.5"></div>
            <div className="absolute left-1/2 top-1/2 w-20 h-20 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>

            {/* Goals */}
            <div className="absolute left-0 top-1/2 w-8 h-24 border-2 border-white transform -translate-y-1/2"></div>
            <div className="absolute right-0 top-1/2 w-8 h-24 border-2 border-white transform -translate-y-1/2"></div>

            {/* Penalty areas */}
            <div className="absolute left-0 top-1/2 w-16 h-40 border-2 border-white transform -translate-y-1/2"></div>
            <div className="absolute right-0 top-1/2 w-16 h-40 border-2 border-white transform -translate-y-1/2"></div>

            {/* Ball */}
            <div
              className="absolute w-4 h-4 bg-white border-2 border-black rounded-full shadow-lg z-30"
              style={{
                left: `${ballPosition.x}%`,
                top: `${ballPosition.y}%`,
                transform: 'translate(-50%, -50%)',
                boxShadow: ballPossession ? '0 0 10px #ffff00' : '0 2px 4px rgba(0,0,0,0.3)'
              }}
            ></div>

            {/* Players */}
            {Object.entries(playerPositions).map(([playerId, player]) => {
              const isWithBall = ballPossession === playerId;
              const roleColors = {
                GK: 'bg-yellow-500',
                LB: 'bg-blue-600', CB1: 'bg-blue-600', CB2: 'bg-blue-600', RB: 'bg-blue-600',
                CM1: 'bg-green-600', CM2: 'bg-green-600', CM3: 'bg-green-600',
                LW: 'bg-red-600', ST: 'bg-red-600', RW: 'bg-red-600'
              };

              return (
                <div key={playerId}>
                  <div
                    className={`absolute w-8 h-8 ${roleColors[player.role] || 'bg-gray-600'} border-2 border-white rounded-full flex items-center justify-center text-white text-xs font-bold transition-all duration-100 z-20`}
                    style={{
                      left: `${player.x}%`,
                      top: `${player.y}%`,
                      transform: 'translate(-50%, -50%)',
                      boxShadow: isWithBall ? '0 0 15px #ffff00' : '0 2px 4px rgba(0,0,0,0.3)',
                      border: isWithBall ? '3px solid #ffff00' : '2px solid white'
                    }}
                  >
                    {player.role}
                  </div>

                  {/* Player name and stats */}
                  <div
                    className="absolute text-xs bg-black text-white px-1 rounded z-10"
                    style={{
                      left: `${player.x}%`,
                      top: `${player.y + 6}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {player.name.split(' ')[0]}
                  </div>

                  {/* Stamina bar */}
                  <div
                    className="absolute w-8 h-1 bg-gray-300 rounded z-10"
                    style={{
                      left: `${player.x}%`,
                      top: `${player.y - 8}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <div
                      className="h-full bg-green-400 rounded"
                      style={{ width: `${(player.currentStamina / player.stamina) * 100}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Match Events */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>📈 Live Match Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 h-32 overflow-y-auto">
              {matchEvents.map((event, index) => (
                <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                  <span className="font-mono text-blue-600">{event.time.toFixed(1)}s</span> - {event.event}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>⚽ Ball Possession</CardTitle>
          </CardHeader>
          <CardContent>
            {ballPossession ? (
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {playerPositions[ballPossession]?.name}
                </div>
                <div className="text-sm text-gray-600">
                  {playerPositions[ballPossession]?.role} • {playerPositions[ballPossession]?.intention}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                Ball is loose
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Player Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Player Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Player</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-left p-2">Distance</th>
                  <th className="text-left p-2">Passes</th>
                  <th className="text-left p-2">Stamina</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(playerPositions).map(([playerId, player]) => {
                  const stats = playerStats[playerId] || {};
                  return (
                    <tr key={playerId} className="border-b">
                      <td className="p-2 font-medium">{player.name}</td>
                      <td className="p-2">{player.role}</td>
                      <td className="p-2">{(stats.distanceCovered || 0).toFixed(0)}m</td>
                      <td className="p-2">{stats.passes || 0}</td>
                      <td className="p-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${(player.currentStamina / player.stamina) * 100}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          player.intention === 'attacking' ? 'bg-red-100 text-red-800' :
                          player.intention === 'defending' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {player.intention}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}