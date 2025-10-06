import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/PROVIDERS/AuthProvider";
import { Play, Pause, Square, RotateCcw } from "lucide-react";

export default function VisualFootballSimulation() {
  const { currentUser } = useAuth();
  const players = currentUser?.players || [];

  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [score, setScore] = useState({ home: 0, away: 0 });
  const [gameEvents, setGameEvents] = useState([]);
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 50 });
  const [playerPositions, setPlayerPositions] = useState({});

  const intervalRef = useRef(null);
  const canvasRef = useRef(null);

  // Initialize player positions
  useEffect(() => {
    if (players.length > 0) {
      const homeTeam = players.slice(0, Math.min(5, players.length));
      const awayTeam = players.slice(5, Math.min(10, players.length));
      
      const initialPositions = {};
      
      // Home team formation (left side)
      homeTeam.forEach((player, index) => {
        initialPositions[player.id] = {
          x: 20 + (index % 2) * 15,
          y: 20 + (index * 15),
          team: 'home',
          name: player.name,
          speed: player.speed || 50,
          stamina: player.stamina || 50,
          hasBall: false,
        };
      });
      
      // Away team formation (right side)  
      awayTeam.forEach((player, index) => {
        initialPositions[player.id] = {
          x: 65 + (index % 2) * 15,
          y: 20 + (index * 15),
          team: 'away',
          name: player.name,
          speed: player.speed || 50,
          stamina: player.stamina || 50,
          hasBall: false,
        };
      });
      
      setPlayerPositions(initialPositions);
    }
  }, [players]);

  const startSimulation = () => {
    setIsRunning(true);
    setIsPaused(false);
    
    intervalRef.current = setInterval(() => {
      setGameTime(prev => prev + 1);
      updateGame();
    }, 200);
  };

  const pauseSimulation = () => {
    setIsPaused(!isPaused);
    if (isPaused) {
      intervalRef.current = setInterval(() => {
        setGameTime(prev => prev + 1);
        updateGame();
      }, 200);
    } else {
      clearInterval(intervalRef.current);
    }
  };

  const stopSimulation = () => {
    setIsRunning(false);
    setIsPaused(false);
    clearInterval(intervalRef.current);
    setGameTime(0);
    setScore({ home: 0, away: 0 });
    setGameEvents([]);
    setBallPosition({ x: 50, y: 50 });
  };

  const resetSimulation = () => {
    stopSimulation();
    // Reset player positions to initial formation
    if (players.length > 0) {
      const homeTeam = players.slice(0, Math.min(5, players.length));
      const awayTeam = players.slice(5, Math.min(10, players.length));
      
      const initialPositions = {};
      
      homeTeam.forEach((player, index) => {
        initialPositions[player.id] = {
          x: 20 + (index % 2) * 15,
          y: 20 + (index * 15),
          team: 'home',
          name: player.name,
          speed: player.speed || 50,
          stamina: player.stamina || 50,
          hasBall: false,
        };
      });
      
      awayTeam.forEach((player, index) => {
        initialPositions[player.id] = {
          x: 65 + (index % 2) * 15,
          y: 20 + (index * 15),
          team: 'away',
          name: player.name,
          speed: player.speed || 50,
          stamina: player.stamina || 50,
          hasBall: false,
        };
      });
      
      setPlayerPositions(initialPositions);
    }
  };

  const updateGame = () => {
    if (!isRunning || isPaused) return;

    // Simple AI movement logic
    setPlayerPositions(prev => {
      const newPositions = { ...prev };
      
      Object.keys(newPositions).forEach(playerId => {
        const player = newPositions[playerId];
        
        // Move players towards ball with some randomness
        const ballX = ballPosition.x;
        const ballY = ballPosition.y;
        
        const speed = (player.speed / 100) * 2; // Convert to movement speed
        const randomness = (Math.random() - 0.5) * 3;
        
        // Move towards ball with team strategy
        let targetX = ballX + randomness;
        let targetY = ballY + randomness;
        
        // Team-based positioning
        if (player.team === 'home' && ballX < 50) {
          // Home team advances when ball is on their side
          targetX = Math.min(ballX + 10, player.x + speed);
        } else if (player.team === 'away' && ballX > 50) {
          // Away team advances when ball is on their side  
          targetX = Math.max(ballX - 10, player.x - speed);
        }
        
        // Smooth movement towards target
        const dx = targetX - player.x;
        const dy = targetY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          player.x += (dx / distance) * speed * 0.3;
          player.y += (dy / distance) * speed * 0.3;
        }
        
        // Keep players on field
        player.x = Math.max(5, Math.min(95, player.x));
        player.y = Math.max(5, Math.min(95, player.y));
      });
      
      return newPositions;
    });

    // Move ball randomly with some logic
    setBallPosition(prev => {
      const newX = prev.x + (Math.random() - 0.5) * 4;
      const newY = prev.y + (Math.random() - 0.5) * 4;
      
      return {
        x: Math.max(2, Math.min(98, newX)),
        y: Math.max(2, Math.min(98, newY))
      };
    });

    // Random events
    if (Math.random() < 0.01) { // 1% chance per tick
      const events = [
        "Great pass!",
        "Nice dribble!",
        "Tackle attempt!",
        "Shot on goal!",
        "Defensive clearance!",
        "Through ball!",
      ];
      
      const randomEvent = events[Math.floor(Math.random() * events.length)];
      setGameEvents(prev => [...prev.slice(-4), `${Math.floor(gameTime / 5)}'${gameTime % 5}" - ${randomEvent}`]);
    }

    // Random goals
    if (Math.random() < 0.003) { // Very rare
      const goalTeam = Math.random() > 0.5 ? 'home' : 'away';
      setScore(prev => ({
        ...prev,
        [goalTeam]: prev[goalTeam] + 1
      }));
      setGameEvents(prev => [...prev.slice(-4), `${Math.floor(gameTime / 5)}'${gameTime % 5}" - ⚽ GOAL! ${goalTeam.toUpperCase()} SCORES!`]);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const formatTime = (time) => {
    const minutes = Math.floor(time / 5);
    const seconds = (time % 5) * 12;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-green-50 to-blue-50 min-h-screen">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
          ⚽ Football Match Simulation
        </h1>
        <p className="text-gray-600">Watch your players in action on the pitch!</p>
      </div>

      {/* Game Controls */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Match Controls</CardTitle>
            <div className="text-2xl font-bold">
              {score.home} - {score.away}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="text-lg font-semibold">
              Time: {formatTime(gameTime)}
            </div>
            <div className="flex gap-3">
              {!isRunning ? (
                <Button 
                  onClick={startSimulation}
                  disabled={Object.keys(playerPositions).length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Match
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={pauseSimulation} 
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button 
                    onClick={stopSimulation} 
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                </>
              )}
              <Button 
                onClick={resetSimulation} 
                className="bg-gray-600 hover:bg-gray-700"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Football Pitch */}
      <Card className="shadow-2xl">
        <CardContent className="p-0">
          <div className="relative w-full bg-gradient-to-b from-green-400 to-green-600 rounded-lg overflow-hidden" 
               style={{ aspectRatio: '16/10', minHeight: '500px' }}>
            
            {/* Pitch markings */}
            <div className="absolute inset-4 border-4 border-white rounded-lg">
              {/* Center line */}
              <div className="absolute left-1/2 top-0 w-1 h-full bg-white transform -translate-x-0.5" />
              {/* Center circle */}
              <div className="absolute left-1/2 top-1/2 w-24 h-24 border-4 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2" />
              {/* Penalty areas */}
              <div className="absolute left-0 top-1/2 w-16 h-32 border-4 border-white border-l-0 transform -translate-y-1/2" />
              <div className="absolute right-0 top-1/2 w-16 h-32 border-4 border-white border-r-0 transform -translate-y-1/2" />
              {/* Goal areas */}
              <div className="absolute left-0 top-1/2 w-8 h-16 border-4 border-white border-l-0 transform -translate-y-1/2" />
              <div className="absolute right-0 top-1/2 w-8 h-16 border-4 border-white border-r-0 transform -translate-y-1/2" />
            </div>

            {/* Players */}
            {Object.entries(playerPositions).map(([playerId, player]) => (
              <div
                key={playerId}
                className={`absolute w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg transition-all duration-200 ${
                  player.team === 'home' 
                    ? 'bg-blue-600 border-2 border-blue-800' 
                    : 'bg-red-600 border-2 border-red-800'
                }`}
                style={{
                  left: `${player.x}%`,
                  top: `${player.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10
                }}
                title={player.name}
              >
                {player.name.charAt(0)}
              </div>
            ))}

            {/* Ball */}
            <div
              className="absolute w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-200"
              style={{
                left: `${ballPosition.x}%`,
                top: `${ballPosition.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 15,
                boxShadow: '0 0 10px rgba(255,255,255,0.8)'
              }}
            />

            {/* Team labels */}
            <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
              HOME
            </div>
            <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
              AWAY
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Events */}
      {gameEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📝 Match Commentary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {gameEvents.map((event, index) => (
                <div key={index} className="text-sm bg-gray-100 p-2 rounded">
                  {event}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Lineups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-600">🏠 Home Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.values(playerPositions)
                .filter(p => p.team === 'home')
                .map((player, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span>{player.name}</span>
                    <span className="text-gray-500">Speed: {player.speed}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">✈️ Away Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.values(playerPositions)
                .filter(p => p.team === 'away')
                .map((player, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span>{player.name}</span>
                    <span className="text-gray-500">Speed: {player.speed}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}