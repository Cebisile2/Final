import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/PROVIDERS/AuthProvider";
import { Play, Pause, Square, RotateCcw } from "lucide-react";

// Import all the simulations
import NewSimulation from "./OLD/newSimulation";

export default function FunctionalFootballSim() {
  const { currentUser } = useAuth();
  const players = currentUser?.players || [];

  const [selectedSimulation, setSelectedSimulation] = useState("main");
  const [isRunning, setIsRunning] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 50 });
  const [playerPositions, setPlayerPositions] = useState({});
  const [playerStats, setPlayerStats] = useState({});

  const intervalRef = useRef(null);

  // Initialize players with starting speed 0.0
  useEffect(() => {
    if (players.length > 0) {
      const initialPositions = {};
      const initialStats = {};

      // Use all available players up to 11 for a full team
      const teamPlayers = players.slice(0, 11);

      // Place players in a proper 4-3-3 formation
      teamPlayers.forEach((player, index) => {
        let x, y;

        if (index === 0) {
          // Goalkeeper
          x = 10;
          y = 50;
        } else if (index <= 4) {
          // Defenders (4 players)
          const defenderIndex = index - 1;
          x = 25;
          y = 20 + defenderIndex * 20;
        } else if (index <= 7) {
          // Midfielders (3 players)
          const midfielderIndex = index - 5;
          x = 50;
          y = 25 + midfielderIndex * 25;
        } else {
          // Forwards (3 players)
          const forwardIndex = index - 8;
          x = 75;
          y = 25 + forwardIndex * 25;
        }

        initialPositions[player.id] = {
          x: x,
          y: y,
          name: player.name,
          maxSpeed: player.speed || 50,
          currentSpeed: 0.0, // Start at 0.0
          direction: { x: 0, y: 0 },
          distanceCovered: 0,
        };

        initialStats[player.id] = {
          name: player.name,
          currentSpeed: 0.0,
          totalSpeed: 0.0, // Track cumulative speed
          distanceCovered: 0,
          timeActive: 0,
        };
      });

      setPlayerPositions(initialPositions);
      setPlayerStats(initialStats);
    }
  }, [players]);

  const startSimulation = () => {
    setIsRunning(true);
    
    intervalRef.current = setInterval(() => {
      setGameTime(prev => prev + 0.1);
      updateSimulation();
    }, 100); // Update every 100ms for smooth movement
  };

  const pauseSimulation = () => {
    setIsRunning(false);
    clearInterval(intervalRef.current);
  };

  const stopSimulation = () => {
    setIsRunning(false);
    clearInterval(intervalRef.current);
    setGameTime(0);
    
    // Reset all speeds to 0.0
    setPlayerStats(prev => {
      const reset = {};
      Object.keys(prev).forEach(playerId => {
        reset[playerId] = {
          ...prev[playerId],
          currentSpeed: 0.0,
          totalSpeed: 0.0,
          distanceCovered: 0,
          timeActive: 0,
        };
      });
      return reset;
    });
    
    setPlayerPositions(prev => {
      const reset = {};
      Object.keys(prev).forEach(playerId => {
        reset[playerId] = {
          ...prev[playerId],
          currentSpeed: 0.0,
        };
      });
      return reset;
    });
  };

  const resetPositions = () => {
    if (players.length > 0) {
      const resetPositions = {};

      const teamPlayers = players.slice(0, 11);

      teamPlayers.forEach((player, index) => {
        let x, y;

        if (index === 0) {
          // Goalkeeper
          x = 10;
          y = 50;
        } else if (index <= 4) {
          // Defenders (4 players)
          const defenderIndex = index - 1;
          x = 25;
          y = 20 + defenderIndex * 20;
        } else if (index <= 7) {
          // Midfielders (3 players)
          const midfielderIndex = index - 5;
          x = 50;
          y = 25 + midfielderIndex * 25;
        } else {
          // Forwards (3 players)
          const forwardIndex = index - 8;
          x = 75;
          y = 25 + forwardIndex * 25;
        }

        resetPositions[player.id] = {
          ...playerPositions[player.id],
          x: x,
          y: y,
          currentSpeed: 0.0,
          direction: { x: 0, y: 0 },
        };
      });

      setPlayerPositions(resetPositions);
      setBallPosition({ x: 50, y: 50 });
    }
  };

  const updateSimulation = () => {
    // Move ball randomly
    setBallPosition(prev => ({
      x: Math.max(5, Math.min(95, prev.x + (Math.random() - 0.5) * 3)),
      y: Math.max(5, Math.min(95, prev.y + (Math.random() - 0.5) * 3))
    }));

    // Update player positions and speeds
    setPlayerPositions(prev => {
      const updated = {};
      
      Object.keys(prev).forEach(playerId => {
        const player = prev[playerId];
        
        // Calculate new speed (accelerate/decelerate randomly)
        const speedChange = (Math.random() - 0.5) * 2;
        const newSpeed = Math.max(0, Math.min(player.maxSpeed / 10, player.currentSpeed + speedChange));
        
        // Random direction change
        const newDirection = {
          x: player.direction.x + (Math.random() - 0.5) * 0.5,
          y: player.direction.y + (Math.random() - 0.5) * 0.5
        };
        
        // Normalize direction
        const dirLength = Math.sqrt(newDirection.x * newDirection.x + newDirection.y * newDirection.y);
        if (dirLength > 0) {
          newDirection.x /= dirLength;
          newDirection.y /= dirLength;
        }
        
        // Move player
        const newX = Math.max(5, Math.min(95, player.x + newDirection.x * newSpeed));
        const newY = Math.max(5, Math.min(95, player.y + newDirection.y * newSpeed));
        
        // Calculate distance moved
        const distance = Math.sqrt((newX - player.x) ** 2 + (newY - player.y) ** 2);
        
        updated[playerId] = {
          ...player,
          x: newX,
          y: newY,
          currentSpeed: newSpeed,
          direction: newDirection,
          distanceCovered: player.distanceCovered + distance,
        };
      });
      
      return updated;
    });

    // Update player stats
    setPlayerStats(prev => {
      const updated = {};
      
      Object.keys(prev).forEach(playerId => {
        const currentPlayer = playerPositions[playerId];
        if (currentPlayer) {
          updated[playerId] = {
            ...prev[playerId],
            currentSpeed: currentPlayer.currentSpeed,
            totalSpeed: prev[playerId].totalSpeed + currentPlayer.currentSpeed,
            distanceCovered: currentPlayer.distanceCovered,
            timeActive: prev[playerId].timeActive + 0.1,
          };
        }
      });
      
      return updated;
    });
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Go directly to New Simulation (training page)
  return <NewSimulation />;
}