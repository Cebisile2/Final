import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const BallChaseSimulation = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [playerStats, setPlayerStats] = useState({});

  // Field dimensions - Real football pitch (105 x 68 meters)
  const FIELD_WIDTH_M = 105; // meters
  const FIELD_HEIGHT_M = 68;  // meters
  const CANVAS_WIDTH = 800;   // pixels
  const CANVAS_HEIGHT = 520;  // pixels
  const SCALE = CANVAS_WIDTH / FIELD_WIDTH_M; // pixels per meter (~7.6)
  
  const BALL_SIZE = 4;
  const PLAYER_SIZE = 8;
  const DT = 0.2; // time step in seconds (5 Hz)
  
  // Convert meters to pixels
  const mToPixels = (meters) => meters * SCALE;
  const pixelsToM = (pixels) => pixels / SCALE;

  // Game state with physics-based player model
  const [gameState, setGameState] = useState({
    ball: { 
      x: mToPixels(FIELD_WIDTH_M / 2), 
      y: mToPixels(FIELD_HEIGHT_M / 2), 
      vx: mToPixels(3), 
      vy: mToPixels(2) 
    },
    players: [
      {
        id: 1,
        name: "John Smith",
        position: "CB", // Center Back
        // Physics state
        pos: { x: mToPixels(20), y: mToPixels(34) }, // 20m from goal, center
        vel: { x: 0, y: 0 },
        homePos: { x: mToPixels(20), y: mToPixels(34) },
        // Player attributes
        maxSpeed: 7.0, // m/s - center back
        accelMax: 3.0, // m/s²
        chaseRadius: mToPixels(18), // 18m chase radius
        color: "#3B82F6",
        team: "A",
        // Stats
        distanceAccum: 0, // meters
        ballTouches: 0,
        lastBallTouch: 0,
        stamina: 100
      },
      {
        id: 2,
        name: "Mike Johnson",
        position: "CB",
        pos: { x: mToPixels(85), y: mToPixels(34) }, // 20m from goal, center
        vel: { x: 0, y: 0 },
        homePos: { x: mToPixels(85), y: mToPixels(34) },
        maxSpeed: 7.0,
        accelMax: 3.0,
        chaseRadius: mToPixels(18),
        color: "#EF4444",
        team: "B",
        distanceAccum: 0,
        ballTouches: 0,
        lastBallTouch: 0,
        stamina: 100
      },
      {
        id: 3,
        name: "Alex Brown",
        position: "Winger",
        pos: { x: mToPixels(40), y: mToPixels(10) }, // Left wing
        vel: { x: 0, y: 0 },
        homePos: { x: mToPixels(40), y: mToPixels(10) },
        maxSpeed: 8.5, // m/s - winger faster
        accelMax: 3.5,
        chaseRadius: mToPixels(22),
        color: "#10B981",
        team: "A",
        distanceAccum: 0,
        ballTouches: 0,
        lastBallTouch: 0,
        stamina: 100
      },
      {
        id: 4,
        name: "Sam Wilson",
        position: "Winger",
        pos: { x: mToPixels(65), y: mToPixels(58) }, // Right wing
        vel: { x: 0, y: 0 },
        homePos: { x: mToPixels(65), y: mToPixels(58) },
        maxSpeed: 8.5,
        accelMax: 3.5,
        chaseRadius: mToPixels(22),
        color: "#F59E0B",
        team: "B",
        distanceAccum: 0,
        ballTouches: 0,
        lastBallTouch: 0,
        stamina: 100
      }
    ]
  });

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      drawField(ctx);
      drawGame(ctx);
    }
  }, []);

  // Game loop - physics-based (5 Hz as per your spec)
  useEffect(() => {
    if (isPlaying) {
      // Physics simulation at 5 Hz (every 200ms = 0.2s time step)
      animationRef.current = setInterval(() => {
        updateGame();
        setGameTime(prev => prev + DT); // Increment by time step (0.2s)
      }, 200); // 5 Hz
      
      return () => {
        clearInterval(animationRef.current);
      };
    } else {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    }
  }, [isPlaying]);

  // Draw football field (105m x 68m)
  const drawField = (ctx) => {
    // Grass background
    ctx.fillStyle = '#16A34A';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Field lines
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    
    const fieldLeft = 10;
    const fieldTop = 10;
    const fieldRight = CANVAS_WIDTH - 10;
    const fieldBottom = CANVAS_HEIGHT - 10;
    
    // Outer boundary
    ctx.strokeRect(fieldLeft, fieldTop, fieldRight - fieldLeft, fieldBottom - fieldTop);
    
    // Center line
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, fieldTop);
    ctx.lineTo(CANVAS_WIDTH / 2, fieldBottom);
    ctx.stroke();
    
    // Center circle (9.15m radius)
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, mToPixels(9.15), 0, 2 * Math.PI);
    ctx.stroke();
    
    // Penalty areas (16.5m from goal line, 40.3m wide)
    const penaltyWidth = mToPixels(40.3);
    const penaltyDepth = mToPixels(16.5);
    const penaltyY = (CANVAS_HEIGHT - penaltyWidth) / 2;
    
    // Left penalty area
    ctx.strokeRect(fieldLeft, penaltyY, penaltyDepth, penaltyWidth);
    // Right penalty area
    ctx.strokeRect(fieldRight - penaltyDepth, penaltyY, penaltyDepth, penaltyWidth);
    
    // Goal areas (5.5m from goal line, 18.3m wide)
    const goalWidth = mToPixels(18.3);
    const goalDepth = mToPixels(5.5);
    const goalY = (CANVAS_HEIGHT - goalWidth) / 2;
    
    // Left goal area
    ctx.strokeRect(fieldLeft, goalY, goalDepth, goalWidth);
    // Right goal area
    ctx.strokeRect(fieldRight - goalDepth, goalY, goalDepth, goalWidth);
    
    // Corner arcs (1m radius)
    const cornerRadius = mToPixels(1);
    
    // Top-left
    ctx.beginPath();
    ctx.arc(fieldLeft, fieldTop, cornerRadius, 0, Math.PI / 2);
    ctx.stroke();
    
    // Top-right
    ctx.beginPath();
    ctx.arc(fieldRight, fieldTop, cornerRadius, Math.PI / 2, Math.PI);
    ctx.stroke();
    
    // Bottom-left
    ctx.beginPath();
    ctx.arc(fieldLeft, fieldBottom, cornerRadius, -Math.PI / 2, 0);
    ctx.stroke();
    
    // Bottom-right
    ctx.beginPath();
    ctx.arc(fieldRight, fieldBottom, cornerRadius, Math.PI, -Math.PI / 2);
    ctx.stroke();
  };

  // Draw game elements
  const drawGame = (ctx) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Clear and redraw field
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawField(ctx);

    // Draw ball with shadow
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(gameState.ball.x + 2, gameState.ball.y + 2, BALL_SIZE, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(gameState.ball.x, gameState.ball.y, BALL_SIZE, 0, 2 * Math.PI);
    ctx.fill();
    
    // Ball pattern
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(gameState.ball.x, gameState.ball.y, BALL_SIZE, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Draw players using physics model
    gameState.players.forEach(player => {
      const x = player.pos.x;
      const y = player.pos.y;
      const speed = Math.sqrt(player.vel.x * player.vel.x + player.vel.y * player.vel.y);
      
      // Player shadow
      ctx.fillStyle = '#000000';
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(x + 2, y + 2, PLAYER_SIZE, 0, 2 * Math.PI);
      ctx.fill();
      
      // Player body
      ctx.globalAlpha = 1;
      ctx.fillStyle = player.color;
      ctx.beginPath();
      ctx.arc(x, y, PLAYER_SIZE, 0, 2 * Math.PI);
      ctx.fill();
      
      // Player outline
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Player number
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(player.id.toString(), x, y + 4);
      
      // Player name above
      ctx.fillStyle = '#000000';
      ctx.font = '10px Arial';
      ctx.fillText(player.name.split(' ')[0], x, y - 20);
      
      // Stamina bar
      const barWidth = 20;
      const barHeight = 4;
      const staminaPercent = player.stamina / 100;
      
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(x - barWidth/2, y + 18, barWidth, barHeight);
      
      ctx.fillStyle = staminaPercent > 0.6 ? '#10B981' : staminaPercent > 0.3 ? '#F59E0B' : '#EF4444';
      ctx.fillRect(x - barWidth/2, y + 18, barWidth * staminaPercent, barHeight);
      
      // Movement trail (speed indicator) - only if moving significantly
      if (speed > 0.5) { // Only show trail if moving > 0.5 m/s
        ctx.strokeStyle = player.color;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 3;
        ctx.beginPath();
        const trailLength = mToPixels(speed * 2); // Trail length proportional to speed
        ctx.moveTo(x - (player.vel.x / speed) * trailLength, y - (player.vel.y / speed) * trailLength);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });
  };

  // Helper functions for physics
  const normalize = (vec) => {
    const len = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
    return len > 0 ? { x: vec.x / len, y: vec.y / len } : { x: 0, y: 0 };
  };
  
  const clampLength = (vec, maxLen) => {
    const len = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
    if (len > maxLen) {
      const scale = maxLen / len;
      return { x: vec.x * scale, y: vec.y * scale };
    }
    return vec;
  };

  // Physics-based update game logic
  const updateGame = () => {
    setGameState(prevState => {
      const newState = { ...prevState };
      
      // Update ball position (convert from pixels to meters for physics)
      const ballVelM = { x: pixelsToM(newState.ball.vx), y: pixelsToM(newState.ball.vy) };
      const ballPosM = { x: pixelsToM(newState.ball.x), y: pixelsToM(newState.ball.y) };
      
      ballPosM.x += ballVelM.x * DT;
      ballPosM.y += ballVelM.y * DT;
      
      // Ball bounces off walls
      const fieldMargin = 1; // 1 meter margin
      if (ballPosM.x <= fieldMargin || ballPosM.x >= FIELD_WIDTH_M - fieldMargin) {
        ballVelM.x = -ballVelM.x;
        ballPosM.x = Math.max(fieldMargin, Math.min(FIELD_WIDTH_M - fieldMargin, ballPosM.x));
      }
      if (ballPosM.y <= fieldMargin || ballPosM.y >= FIELD_HEIGHT_M - fieldMargin) {
        ballVelM.y = -ballVelM.y;
        ballPosM.y = Math.max(fieldMargin, Math.min(FIELD_HEIGHT_M - fieldMargin, ballPosM.y));
      }
      
      // Convert back to pixels
      newState.ball.x = mToPixels(ballPosM.x);
      newState.ball.y = mToPixels(ballPosM.y);
      newState.ball.vx = mToPixels(ballVelM.x);
      newState.ball.vy = mToPixels(ballVelM.y);
      
      // Update players with physics model
      newState.players = newState.players.map(player => {
        const newPlayer = { ...player };
        
        // Convert positions to meters for physics calculations
        const playerPosM = { x: pixelsToM(player.pos.x), y: pixelsToM(player.pos.y) };
        const ballPosM_current = { x: pixelsToM(newState.ball.x), y: pixelsToM(newState.ball.y) };
        const homePosM = { x: pixelsToM(player.homePos.x), y: pixelsToM(player.homePos.y) };
        
        // Calculate distance to ball (in meters)
        const ballDx = ballPosM_current.x - playerPosM.x;
        const ballDy = ballPosM_current.y - playerPosM.y;
        const distanceToBall = Math.sqrt(ballDx * ballDx + ballDy * ballDy);
        
        // BEHAVIOR: Decide target
        let target;
        
        if (distanceToBall <= pixelsToM(player.chaseRadius)) {
          // Player is close enough to chase ball
          target = { x: ballPosM_current.x, y: ballPosM_current.y };
        } else {
          // Return to formation with small pull toward ball (20% of vector from home to ball)
          const homeToBallX = ballPosM_current.x - homePosM.x;
          const homeToBallY = ballPosM_current.y - homePosM.y;
          target = {
            x: homePosM.x + homeToBallX * 0.2,
            y: homePosM.y + homeToBallY * 0.2
          };
        }
        
        // STEER: Calculate desired velocity
        const targetDx = target.x - playerPosM.x;
        const targetDy = target.y - playerPosM.y;
        const distanceToTarget = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
        
        let desiredVel = { x: 0, y: 0 };
        if (distanceToTarget > 0.1) { // Only move if target is more than 10cm away
          const desiredDir = normalize({ x: targetDx, y: targetDy });
          const k1 = 0.8;
          const desiredSpeed = Math.min(player.maxSpeed, k1 * distanceToTarget);
          desiredVel = { x: desiredDir.x * desiredSpeed, y: desiredDir.y * desiredSpeed };
        }
        
        // ACCELERATION: Apply acceleration limit
        const currentVel = { x: pixelsToM(player.vel.x), y: pixelsToM(player.vel.y) };
        const dv = { x: desiredVel.x - currentVel.x, y: desiredVel.y - currentVel.y };
        const dvClamped = clampLength(dv, player.accelMax * DT);
        
        const newVel = {
          x: currentVel.x + dvClamped.x,
          y: currentVel.y + dvClamped.y
        };
        
        // Add tiny noise to avoid robotic movement
        const noise = 0.1;
        newVel.x += (Math.random() - 0.5) * noise;
        newVel.y += (Math.random() - 0.5) * noise;
        
        const speed = Math.sqrt(newVel.x * newVel.x + newVel.y * newVel.y);
        
        // UPDATE POSITION & DISTANCE
        const newPosM = {
          x: playerPosM.x + newVel.x * DT,
          y: playerPosM.y + newVel.y * DT
        };
        
        // Keep player within field bounds (with margin)
        newPosM.x = Math.max(2, Math.min(FIELD_WIDTH_M - 2, newPosM.x));
        newPosM.y = Math.max(2, Math.min(FIELD_HEIGHT_M - 2, newPosM.y));
        
        // Calculate distance covered this tick (in meters)
        const distanceCoveredThisTick = speed * DT;
        newPlayer.distanceAccum += distanceCoveredThisTick;
        
        // Convert back to pixels and update player state
        newPlayer.pos = { x: mToPixels(newPosM.x), y: mToPixels(newPosM.y) };
        newPlayer.vel = { x: mToPixels(newVel.x), y: mToPixels(newVel.y) };
        
        // BALL COLLISION (with cooldown to prevent multiple touches)
        const currentTime = gameTime;
        
        // Debug: Log when players get close
        if (distanceToBall < 5) {
          console.log(`Player ${newPlayer.id} distance to ball: ${distanceToBall.toFixed(1)}m`);
        }
        
        if (distanceToBall < 2.5 && (currentTime - newPlayer.lastBallTouch) > 0.3) { // 2.5m collision radius, 0.3 second cooldown
          newPlayer.ballTouches += 1;
          newPlayer.lastBallTouch = currentTime;
          
          // Player kicks ball (more realistic kick)
          const kickStrength = 6 + Math.random() * 6; // 6-12 m/s
          const kickAngle = Math.atan2(ballDy, ballDx) + (Math.random() - 0.5) * 0.8; // More randomness
          
          newState.ball.vx = mToPixels(Math.cos(kickAngle) * kickStrength);
          newState.ball.vy = mToPixels(Math.sin(kickAngle) * kickStrength);
        }
        
        // STAMINA: Simple stamina model
        if (speed > 6) { // Running fast (6+ m/s)
          newPlayer.stamina = Math.max(0, newPlayer.stamina - 2 * DT);
        } else if (speed < 1) { // Resting (< 1 m/s)
          newPlayer.stamina = Math.min(100, newPlayer.stamina + 5 * DT);
        }
        
        return newPlayer;
      });
      
      return newState;
    });
    
    // Update canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      drawGame(ctx);
    }
  };

  // Control functions
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const resetGame = () => {
    setIsPlaying(false);
    setGameTime(0);
    setGameState({
      ball: { 
        x: mToPixels(FIELD_WIDTH_M / 2), 
        y: mToPixels(FIELD_HEIGHT_M / 2), 
        vx: mToPixels(3), 
        vy: mToPixels(2) 
      },
      players: gameState.players.map(player => ({
        ...player,
        pos: { ...player.homePos }, // Reset to home position
        vel: { x: 0, y: 0 }, // Stop moving
        stamina: 100,
        distanceAccum: 0,
        ballTouches: 0,
        lastBallTouch: 0
      }))
    });
    
    // Redraw
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      drawGame(ctx);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Users className="w-8 h-8" />
            ⚽ Ball Chase Simulation
          </CardTitle>
          <p className="text-green-100">
            Watch players chase the ball and track their performance in real-time
          </p>
        </CardHeader>
      </Card>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 justify-between">
            <div className="flex gap-3">
              <Button 
                onClick={togglePlay}
                className={`${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white px-6`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Play
                  </>
                )}
              </Button>
              
              <Button onClick={resetGame} variant="outline" className="px-6">
                <RotateCcw className="w-5 h-5 mr-2" />
                Reset
              </Button>
            </div>
            
            <div className="text-lg font-bold">
              Time: {Math.floor(gameTime / 60)}:{(gameTime % 60).toString().padStart(2, '0')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Field */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="border border-gray-300 bg-green-500"
              style={{ display: 'block', margin: '0 auto' }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Player Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {gameState.players.map(player => (
          <Card key={player.id} className="shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white"
                  style={{ backgroundColor: player.color }}
                />
                {player.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Speed:</span>
                  <span className="font-bold">{(pixelsToM(Math.sqrt(player.vel.x * player.vel.x + player.vel.y * player.vel.y))).toFixed(1)} m/s</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Speed:</span>
                  <span className="font-bold text-gray-600">{player.maxSpeed} m/s</span>
                </div>
                <div className="flex justify-between">
                  <span>Stamina:</span>
                  <span className={`font-bold ${player.stamina > 60 ? 'text-green-600' : player.stamina > 30 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {player.stamina.toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Distance:</span>
                  <span className="font-bold">{player.distanceAccum.toFixed(0)}m</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Speed:</span>
                  <span className="font-bold text-purple-600">
                    {gameTime > 0 ? (player.distanceAccum / gameTime).toFixed(1) : '0.0'} m/s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Ball Touches:</span>
                  <span className="font-bold text-blue-600">{player.ballTouches}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instructions */}
      <Card className="bg-blue-50">
        <CardContent className="pt-6">
          <h3 className="font-bold text-blue-800 mb-2">How it works:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Players automatically chase the ball around the field</li>
            <li>• Running fast drains stamina and counts as "sprints"</li>
            <li>• Tired players move slower and need rest</li>
            <li>• Ball touches show player involvement</li>
            <li>• Distance covered tracks total movement</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default BallChaseSimulation;