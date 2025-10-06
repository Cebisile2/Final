
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/PROVIDERS/AuthProvider";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase";

// pitch in meters
const PITCH_W = 105;
const PITCH_H = 68;

// Canvas dimensions for precise tracking
const CANVAS_WIDTH_PX = 800;  // Your canvas width in pixels
const CANVAS_HEIGHT_PX = 500; // Your canvas height in pixels
const M_PER_PX_X = PITCH_W / CANVAS_WIDTH_PX;   // meters per pixel X
const M_PER_PX_Y = PITCH_H / CANVAS_HEIGHT_PX;  // meters per pixel Y

// helpers in meters
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

// Player Development System Functions
function convertSpeedToRating(speedMps) {
  // Convert m/s to 0-100 rating scale
  // Assuming max realistic speed is ~9.0 m/s for amateur players
  const maxSpeed = 9.0;
  const rating = Math.round((speedMps / maxSpeed) * 100);
  return Math.max(0, Math.min(100, rating)); // Clamp between 0-100
}

function getPlayerMatchHistory(player) {
  // Get existing match history or initialize empty array
  return player.matchHistory || [];
}

function updatePlayerWithNewMatch(player, avgSpeedMps, matchDate = new Date().toISOString()) {
  const history = getPlayerMatchHistory(player);
  
  // Add new match performance
  history.push({
    date: matchDate,
    avgSpeed: avgSpeedMps
  });
  
  // Keep only last 6 matches for rolling average
  const recentHistory = history.slice(-6);
  
  let newRating;
  
  // For new players (speed = 0) or players with very few matches, establish baseline
  if (player.speed === 0 || history.length <= 2) {
    // For first 1-2 matches, use actual performance as rating
    // This establishes their baseline ability
    newRating = convertSpeedToRating(avgSpeedMps);
  } else {
    // For established players, use rolling average for gradual development
    const recentSpeeds = recentHistory.map(match => match.avgSpeed);
    const avgRecentSpeed = recentSpeeds.reduce((sum, speed) => sum + speed, 0) / recentSpeeds.length;
    newRating = convertSpeedToRating(avgRecentSpeed);
  }
  
  return {
    ...player,
    matchHistory: history,
    matchesPlayed: history.length,
    speed: newRating,
    previousSpeed: player.speed || 0,
    newRating // Include calculated rating for easy access
  };
}

// Professional sports analytics helper functions
function rollingMean(arr, windowCount) {
  if (windowCount <= 1) return [...arr];
  const out = new Array(arr.length).fill(0);
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
    if (i >= windowCount) sum -= arr[i - windowCount];
    const denom = Math.min(i + 1, windowCount);
    out[i] = sum / denom;
  }
  return out;
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const a = [...arr].sort((a, b) => a - b);
  const idx = Math.min(a.length - 1, Math.max(0, Math.round((p / 100) * (a.length - 1))));
  return a[idx];
}

/** 
 * Professional sports analytics function
 * t[], x[], y[] are in SECONDS and METERS 
 */
function computeMetricsFromMeters(
  t, x, y,
  opts = { smoothSec: 1.0, capMps: 12.0, hiSpeed: 4.7, sprint: 5.5, minSprintSec: 1.0 }
) {
  const N = Math.min(t.length, x.length, y.length);
  if (N < 2) {
    return {
      distance_m: 0, duration_s: 0, avg_speed_mps: 0,
      max_speed_mps: 0, p95_speed_mps: 0, high_speed_time_s: 0, sprint_count: 0
    };
  }

  const speeds = [];
  const dts = [];
  let dist = 0, maxv = 0;

  for (let i = 1; i < N; i++) {
    const dx = x[i] - x[i - 1];
    const dy = y[i] - y[i - 1];
    const dd = Math.hypot(dx, dy);
    const dt = Math.max(1e-6, t[i] - t[i - 1]);
    dts.push(dt);
    let v = dd / dt;

    // clamp impossible spikes
    if (v > opts.capMps) v = opts.capMps;

    speeds.push(v);
    dist += dd;
    if (v > maxv) maxv = v;
  }

  const duration = Math.max(0, t[N - 1] - t[0]);
  const avg = duration > 0 ? dist / duration : 0;

  // smooth ~1s
  const medDt = dts.slice().sort((a, b) => a - b)[Math.floor(dts.length / 2)] || 0.2;
  const win = Math.max(1, Math.round(opts.smoothSec / medDt));
  const smooth = rollingMean(speeds, win);

  // high-speed time
  let hiTime = 0;
  for (let i = 0; i < smooth.length; i++) {
    const dt = dts[i] || medDt;
    if (smooth[i] >= opts.hiSpeed) hiTime += dt;
  }

  // sprint bouts: continuous ≥ sprint for ≥ minSprintSec
  let sprintCount = 0, inSprint = false, dur = 0;
  for (let i = 0; i < smooth.length; i++) {
    const dt = dts[i] || medDt;
    if (smooth[i] >= opts.sprint) {
      inSprint = true; dur += dt;
    } else {
      if (inSprint && dur >= opts.minSprintSec) sprintCount++;
      inSprint = false; dur = 0;
    }
  }
  if (inSprint && dur >= opts.minSprintSec) sprintCount++;

  const p95 = percentile(smooth, 95);

  return {
    distance_m: dist,
    duration_s: duration,
    avg_speed_mps: avg,
    max_speed_mps: maxv,
    p95_speed_mps: p95,
    high_speed_time_s: hiTime,
    sprint_count: sprintCount,
  };
}

// Realistic Player Speed Calculation Based on Physical Attributes
function calculateRealisticPlayerSpeed(player) {
  // Position-based base speeds (m/s)
  const positionBaseSpeeds = {
    "Forward": { min: 3.5, max: 4.2 },
    "Striker": { min: 3.5, max: 4.2 },
    "Midfielder": { min: 3.2, max: 3.8 },
    "Defender": { min: 3.0, max: 3.6 },
    "Goalkeeper": { min: 2.8, max: 3.2 }
  };

  const speedRange = positionBaseSpeeds[player.position] || positionBaseSpeeds["Midfielder"];
  const baseSpeed = speedRange.min + Math.random() * (speedRange.max - speedRange.min);

  // Height impact - taller players generally faster due to stride length
  const height = player.height || 175; // default if missing
  const heightMultiplier = 0.8 + (height - 160) * 0.004;
  
  // Weight/BMI impact - optimal BMI for speed is around 22
  const weight = player.weight || 70; // default if missing
  const heightInM = height / 100;
  const bmi = weight / (heightInM * heightInM);
  const weightMultiplier = Math.max(0.6, Math.min(1.2, 1.2 - Math.abs(bmi - 22) * 0.05));
  
  // Age impact - peak speed around 25, decline after 28
  const age = player.age || 25; // default if missing
  let ageMultiplier;
  if (age <= 22) {
    ageMultiplier = 0.85 + (age - 18) * 0.025; // Young players still developing
  } else if (age <= 28) {
    ageMultiplier = 1.0; // Peak performance
  } else {
    ageMultiplier = Math.max(0.7, 1.0 - (age - 28) * 0.02); // Decline after 28
  }

  // Random variation (±10%)
  const randomVariation = 0.9 + Math.random() * 0.2;

  // Final calculated speed
  const finalSpeed = baseSpeed * heightMultiplier * weightMultiplier * ageMultiplier * randomVariation;
  
  return {
    calculatedSpeed: Math.max(2.0, Math.min(5.0, finalSpeed)), // Clamp between 2-5 m/s
    breakdown: {
      baseSpeed: baseSpeed.toFixed(2),
      heightMultiplier: heightMultiplier.toFixed(2),
      weightMultiplier: weightMultiplier.toFixed(2),
      ageMultiplier: ageMultiplier.toFixed(2),
      finalSpeed: finalSpeed.toFixed(2)
    }
  };
}

// Calculate Player Stamina Based on Physical Attributes
function calculatePlayerStamina(player) {
  // Position-based base stamina (0-100)
  const positionStamina = {
    "Midfielder": { min: 85, max: 95 },    // Best endurance
    "Defender": { min: 75, max: 85 },      // Good stamina
    "Forward": { min: 70, max: 80 },       // Moderate stamina
    "Striker": { min: 65, max: 75 },       // Lower stamina (burst-focused)
    "Goalkeeper": { min: 60, max: 70 }     // Lowest (minimal running)
  };

  const staminaRange = positionStamina[player.position] || positionStamina["Midfielder"];
  const baseStamina = staminaRange.min + Math.random() * (staminaRange.max - staminaRange.min);

  // Age impact on stamina - peak at 23-27, decline after
  const age = player.age || 25;
  let ageMultiplier;
  if (age <= 23) {
    ageMultiplier = 0.9 + (age - 18) * 0.02; // Young players building endurance
  } else if (age <= 27) {
    ageMultiplier = 1.0; // Peak stamina
  } else {
    ageMultiplier = Math.max(0.75, 1.0 - (age - 27) * 0.015); // Gradual decline
  }

  // BMI impact - optimal BMI for stamina is around 21-23
  const weight = player.weight || 70;
  const height = player.height || 175;
  const heightInM = height / 100;
  const bmi = weight / (heightInM * heightInM);
  const bmiMultiplier = Math.max(0.7, Math.min(1.1, 1.1 - Math.abs(bmi - 22) * 0.03));

  // Final stamina calculation
  const finalStamina = baseStamina * ageMultiplier * bmiMultiplier;

  return Math.max(50, Math.min(100, Math.round(finalStamina))); // Clamp 50-100
}

// Calculate current speed based on stamina level
function getCurrentSpeedWithStamina(baseSpeed, currentStamina) {
  // Stamina affects speed: 100% = full speed, 50% = half speed, etc.
  const staminaMultiplier = Math.max(0.4, currentStamina / 100); // Minimum 40% speed
  return baseSpeed * staminaMultiplier;
}

// Calculate stamina depletion rate based on activity
function getStaminaDepletionRate(player, isRunning, currentSpeed) {
  // Base depletion rate per second
  let depletionRate = 0.1; // Very slow base rate
  
  if (isRunning) {
    // Running depletes stamina faster
    depletionRate = 0.8 + (currentSpeed / 4.0) * 1.2; // Faster running = more depletion
    
    // Position affects stamina usage
    const positionMultiplier = {
      "Midfielder": 0.8,    // Most efficient
      "Defender": 0.9,      
      "Forward": 1.1,       // Less efficient
      "Striker": 1.2,       // Least efficient (burst players)
      "Goalkeeper": 0.7     // Most efficient
    };
    
    depletionRate *= positionMultiplier[player.position] || 1.0;
    
    // Age affects efficiency - older players tire faster
    const age = player.age || 25;
    if (age > 28) {
      depletionRate *= 1.0 + (age - 28) * 0.05; // 5% more per year after 28
    }
  }
  
  return depletionRate;
}

// Legacy function for compatibility - now uses realistic calculation
function roleBand(role) {
  if (role === "Forward") return { baseMin: 3.5, baseMax: 4.2, sprint: 7.0 };
  if (role === "Midfielder") return { baseMin: 3.2, baseMax: 3.8, sprint: 6.5 };
  if (role === "Defender") return { baseMin: 3.0, baseMax: 3.6, sprint: 6.0 };
  return { baseMin: 3.2, baseMax: 3.8, sprint: 6.5 };
}
function pickBase(role, player) {
  // Now uses realistic calculation instead of simple role bands
  const speedData = calculateRealisticPlayerSpeed(player);
  const band = roleBand(role);
  return { 
    base: speedData.calculatedSpeed, 
    sprint: band.sprint,
    breakdown: speedData.breakdown
  };
}

export default function TrainingPage() {
  const { currentUser } = useAuth();
  const players = currentUser?.players || [];

  const [drill, setDrill] = useState("chase"); // chase or shuttle
  const [selectedPlayerIds, setSelectedPlayerIds] = useState(Array(2).fill(""));
  const [isRunning, setIsRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [staminaStats, setStaminaStats] = useState({});

  // sim constants
  const PLAYER_MIN_GAP_M = 1.5;
  const TURN_THRESH_M = 0.6;
  const SHUTTLE_L = 0.2 * PITCH_W;
  const SHUTTLE_R = 0.8 * PITCH_W;
  const SHUTTLE_Y = PITCH_H / 2;

// slalom course
const SLALOM_GATES = 8;           // cones to clear
const SLALOM_START_X = PITCH_W * 0.15;
const SLALOM_END_X   = PITCH_W * 0.85;
const SLALOM_OFFSET  = 6;         // lateral cone offset in meters
const SLALOM_REACH_R = 1.0;       // how close counts as a pass

// slalom state
const slalomGatesRef = useRef({});     // id -> [{x,y}...]
const slalomProgRef  = useRef({});     // id -> current gate index
const slalomErrRef   = useRef({});     // id -> error count
const slalomDoneRef  = useRef({});     // id -> boolean
const slalomTimeRef  = useRef({});     // id -> seconds to complete



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


  // ball physics
  const BALL_BOUNCE = 0.70;
  const BALL_FRICTION_PER_SEC = 0.98;
  const KICK_SPEED_MPS = 18;

  // refs
  const ballRef = useRef({ x: PITCH_W / 2, y: PITCH_H / 2 });
  const ballVelRef = useRef({ vx: 0, vy: 0 });
  const stateRef = useRef({});
  const sprintRef = useRef({});
  const lastTimeRef = useRef(null);
  const startTimeRef = useRef(null);
  const lastKickerRef = useRef(null);
  const shuttleSideRef = useRef({});
  const staminaTimerRef = useRef(null);
  const [, forceRender] = useState(0);

  // Position tracking buffers for precise distance calculation
  const positionBuffersRef = useRef({});
  const preciseStatsRef = useRef({});

  function setup() {
    setFeedback(null);
    const selectedPlayers = selectedPlayerIds.filter(id => id !== "").map(id => players.find(p => p.id === id)).filter(Boolean);
    if (selectedPlayers.length < 2) return;

    ballRef.current = { x: PITCH_W / 2, y: PITCH_H / 2 };
    ballVelRef.current = { vx: 0, vy: 0 };

    // Initialize position tracking buffers for all selected players
    positionBuffersRef.current = {};
    selectedPlayers.forEach(player => {
      positionBuffersRef.current[player.id] = { t: [], x: [], y: [] };
    });
    preciseStatsRef.current = {};

    if (drill === "chase") {
      stateRef.current = {};
      selectedPlayers.forEach((player, index) => {
        const b = pickBase(player.role || player.position, player);
        const stamina = calculatePlayerStamina(player);

        // Position players in a formation around the field
        const angle = (index / selectedPlayers.length) * 2 * Math.PI;
        const radius = 20;
        const centerX = PITCH_W * 0.5;
        const centerY = PITCH_H * 0.5;

        stateRef.current[player.id] = {
          pos: {
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius
          },
          base: b.base,
          sprintCap: b.sprint,
          maxStamina: stamina,
          currentStamina: stamina,
          baseSpeed: b.base,
          isRunning: false
        };
      });
    } else if (drill === "slalom") {
      stateRef.current = {};
      slalomGatesRef.current = {};
      slalomProgRef.current = {};
      slalomErrRef.current = {};
      slalomDoneRef.current = {};
      slalomTimeRef.current = {};

      // Only use the first player for slalom
      const player = selectedPlayers[0];
      if (player) {
        const b = pickBase(player.role || player.position, player);
        const laneY = PITCH_H * 0.5; // Center the course

        stateRef.current[player.id] = {
          pos: { x: SLALOM_START_X - 5, y: laneY },
          base: b.base,
        };

        slalomGatesRef.current[player.id] = buildSlalomForPlayer(laneY);
        slalomProgRef.current[player.id] = 0;
        slalomErrRef.current[player.id] = 0;
        slalomDoneRef.current[player.id] = false;
        slalomTimeRef.current[player.id] = 0;
      }
    }

    else {
      // Shuttle drill
      stateRef.current = {};
      shuttleSideRef.current = {};

      selectedPlayers.forEach((player, index) => {
        const b = pickBase(player.role || player.position, player);
        const laneOffset = (index - selectedPlayers.length / 2) * 4; // Spread players across lanes

        stateRef.current[player.id] = {
          pos: { x: SHUTTLE_L, y: SHUTTLE_Y + laneOffset },
          reps: 0,
          base: b.base,
          sprintCap: b.sprint,
        };
        shuttleSideRef.current[player.id] = "R";
      });
    }

    sprintRef.current = {};
    selectedPlayers.forEach(player => {
      sprintRef.current[player.id] = 0;
    });
    lastKickerRef.current = null;
    lastTimeRef.current = null;
    startTimeRef.current = performance.now();
    setIsRunning(true);
    setPaused(false);
  }

  function endAndFeedback() {
    // Get the actual selected players
    const selectedPlayers = selectedPlayerIds.filter(id => id !== "").map(id => players.find(p => p.id === id)).filter(Boolean);

    if (selectedPlayers.length === 0) return;

    // Analyze precise tracking data first
    analyzePreciseData();

    const now = performance.now();
    const elapsedS = Math.max(1, (now - startTimeRef.current) / 1000);

    // Initialize lines and coach arrays
    let lines = [];
    let coach = [];
    const playerDevelopment = [];

    // Handle slalom drill differently
    if (drill === "slalom") {
      const p1 = selectedPlayers[0];
      if (!p1) return;

      const s1 = stateRef.current[p1.id];
      const precise1 = preciseStatsRef.current[p1.id] || {};

      const progress1 = slalomProgRef.current[p1.id] ?? 0;
      const time1 = slalomTimeRef.current[p1.id] ?? 0;
      const errors1 = slalomErrRef.current[p1.id] ?? 0;

      const avg1 = precise1.avg_speed_mps || 0;
      const dist1 = precise1.distance_m || 0;

      // Slalom summary line
      lines.push(
        `${p1.name} - Slalom Result: Cleared ${progress1}/${SLALOM_GATES} gates in ${time1.toFixed(2)}s`
      );
      lines.push(
        `${p1.name} - distance ${Math.round(dist1)} m, avg speed ${avg1.toFixed(2)} m/s, ` +
        `max ${(precise1.p95_speed_mps || precise1.max_speed_mps || 0).toFixed(2)} m/s`
      );

      // Slalom-specific feedback
      coach.push(getSlalomFeedback({
        name: p1.name,
        progress: progress1,
        time: time1,
        errors: errors1
      }));

      // Player development for slalom (using speed attribute)
      if (avg1 > 0) {
        const updatedP1 = updatePlayerWithNewMatch(p1, avg1);
        playerDevelopment.push({
          name: p1.name,
          oldRating: p1.speed || 0,
          newRating: updatedP1.speed,
          performanceSpeed: avg1,
          matchesPlayed: updatedP1.matchesPlayed,
          change: updatedP1.speed - (p1.speed || 0),
          isNew: !p1.speed || p1.speed === 0
        });
      }

    } else {
      // Handle chase and shuttle drills (2 players)
      const p1 = selectedPlayers[0];
      const p2 = selectedPlayers[1];

      if (!p1 || !p2) return;

      const s1 = stateRef.current[p1.id];
      const s2 = stateRef.current[p2.id];
      const precise1 = preciseStatsRef.current[p1.id] || {};
      const precise2 = preciseStatsRef.current[p2.id] || {};

      const avg1 = precise1.avg_speed_mps || 0;
      const avg2 = precise2.avg_speed_mps || 0;
      const dist1 = precise1.distance_m || 0;
      const dist2 = precise2.distance_m || 0;

      // Summary lines for both players
      lines = [
        `${p1.name} distance ${Math.round(dist1)} m avg speed ${avg1.toFixed(2)} m/s ` +
        `max ${(precise1.p95_speed_mps || precise1.max_speed_mps || 0).toFixed(2)} m/s ` +
        `sprints ${precise1.sprint_count ?? 0}${drill === "shuttle" ? ` reps ${s1.reps || 0}` : ""} [PRECISE]`,
        `${p2.name} distance ${Math.round(dist2)} m avg speed ${avg2.toFixed(2)} m/s ` +
        `max ${(precise2.p95_speed_mps || precise2.max_speed_mps || 0).toFixed(2)} m/s ` +
        `sprints ${precise2.sprint_count ?? 0}${drill === "shuttle" ? ` reps ${s2.reps || 0}` : ""} [PRECISE]`,
      ];

      // General fitness feedback function
      function fb(name, avg, maxp, distM, reps) {
        if (drill === "shuttle" && reps < 20)
          return `${name} needs more repeatability. Aim for plus two shuttles next session.`;
        if (avg < 2.6)
          return `${name} needs to raise steady pace. Target average above two point eight.`;
        if (maxp > 6.5 && avg < 2.9)
          return `${name} has good top speed. Improve endurance to hold pace longer.`;
        if (distM > 1800 && avg >= 3.0)
          return `${name} delivered a strong aerobic load today. Keep recovery solid.`;
        return `${name} completed the session.`;
      }

      coach = [
        fb(p1.name, avg1, precise1.p95_speed_mps || 0, dist1, s1.reps || 0),
        fb(p2.name, avg2, precise2.p95_speed_mps || 0, dist2, s2.reps || 0),
      ];

      // Player development for both players
      if (avg1 > 0) {
        const updatedP1 = updatePlayerWithNewMatch(p1, avg1);
        playerDevelopment.push({
          name: p1.name,
          oldRating: p1.speed || 0,
          newRating: updatedP1.speed,
          performanceSpeed: avg1,
          matchesPlayed: updatedP1.matchesPlayed,
          change: updatedP1.speed - (p1.speed || 0),
          isNew: !p1.speed || p1.speed === 0
        });
      }

      if (avg2 > 0) {
        const updatedP2 = updatePlayerWithNewMatch(p2, avg2);
        playerDevelopment.push({
          name: p2.name,
          oldRating: p2.speed || 0,
          newRating: updatedP2.speed,
          performanceSpeed: avg2,
          matchesPlayed: updatedP2.matchesPlayed,
          change: updatedP2.speed - (p2.speed || 0),
          isNew: !p2.speed || p2.speed === 0
        });
      }
    }

    setFeedback({ lines, coach, playerDevelopment });
  }

  // Helper function for slalom feedback
  function getSlalomFeedback({ name, progress, time, errors }) {
    const totalGates = SLALOM_GATES;
    const completionRate = progress / totalGates;

    // Incomplete - stopped early (less than 50%)
    if (completionRate < 0.5) {
      return `${name}, the run stopped early at Gate ${progress} of ${totalGates}. Focus on consistency and concentration. Try mastering the first 4 cones before attempting the full course.`;
    }

    // Incomplete - stopped near the end (50%-99%)
    if (progress < totalGates) {
      return `${name}, great effort reaching Gate ${progress}. You broke down near the end - often a sign of endurance issues. Focus on maintaining high speed and precision during the final cones.`;
    }

    // Complete but slow (adjust threshold based on testing)
    if (time > 15.0) {
      return `${name}, you completed the course in ${time.toFixed(2)}s. Good control, but the pace is cautious. Focus on taking fewer, stronger touches to attack the space between cones.`;
    }

    // Complete and fast
    if (time < 10.0) {
      return `${name}, brilliant time of ${time.toFixed(2)}s! Excellent pace. Review your path to ensure you're not taking wide turns - next step is to minimize travel distance.`;
    }

    // Default - completed in acceptable time
    return `${name} completed the slalom successfully in ${time.toFixed(2)}s. Keep practicing to improve your time!`;
  }

  // Analyze precise tracking data
  function analyzePreciseData() {
    const selectedPlayers = selectedPlayerIds.filter(id => id !== "").map(id => players.find(p => p.id === id)).filter(Boolean);

    // Calculate precise metrics for each selected player
    selectedPlayers.forEach(player => {
      const buffer = positionBuffersRef.current[player.id];
      if (buffer && buffer.t.length > 1) {
        const preciseStats = computeMetricsFromMeters(buffer.t, buffer.x, buffer.y);
        preciseStatsRef.current[player.id] = preciseStats;
      }
    });
  }

  // Helper function to add missing attributes to existing players
  const addMissingPlayerAttributes = (player) => {
    // If player already has speed, return as-is
    if (typeof player.speed === 'number') {
      return player;
    }
    
    // For existing players without speed attributes, set them as unknown (like new players)
    // Their abilities will be discovered through match performance
    return {
      ...player,
      speed: 0,           // Unknown until they play
      stamina: 0,         // Unknown until they play
      strength: 0,        // Unknown until they play
      technique: 0,       // Unknown until they play
      matchHistory: player.matchHistory || [],
      lastUpdated: new Date().toISOString()
    };
  };

  const savePlayerDevelopment = async (playerDevelopmentData) => {
    try {
      console.log('Player Development Data to Save:', playerDevelopmentData);
      
      // Get current user's club document reference
      const clubRef = doc(db, "clubs", currentUser.uid);
      
      // Update each player's data
      const updatedPlayers = [...currentUser.players];
      let updatedCount = 0;
      
      for (const dev of playerDevelopmentData) {
        const playerIndex = updatedPlayers.findIndex(p => p.name === dev.name);
        if (playerIndex !== -1) {
          let currentPlayer = updatedPlayers[playerIndex];
          
          // Add missing attributes if needed (for existing players)
          currentPlayer = addMissingPlayerAttributes(currentPlayer);
          
          // Calculate new player data with match history
          const updatedPlayerData = updatePlayerWithNewMatch(currentPlayer, dev.performanceSpeed);
          
          // Update the player in the array
          updatedPlayers[playerIndex] = {
            ...currentPlayer,
            speed: Math.round(updatedPlayerData.newRating), // Update the main speed rating
            matchHistory: updatedPlayerData.matchHistory,   // Update match history
            lastUpdated: new Date().toISOString()           // Track when updated
          };
          
          updatedCount++;
          console.log(`Updated ${dev.name}: ${currentPlayer.speed} → ${updatedPlayerData.newRating}`);
        }
      }
      
      // Save all updated players to Firebase
      await updateDoc(clubRef, {
        players: updatedPlayers
      });
      
      alert(`✅ Successfully updated ${updatedCount} player records in the database!`);
    } catch (error) {
      console.error('Error saving player development:', error);
      alert('❌ Failed to save player development data to database');
    }
  };

  const startSimulation = () => {
    if (selectedPlayerIds.filter(id => id !== "").length < 2) return;
    setup();
    
    // Start stamina monitoring
    if (staminaTimerRef.current) clearInterval(staminaTimerRef.current);
    staminaTimerRef.current = setInterval(() => {
      if (!isRunning || paused) return;
      
      const currentState = stateRef.current;
      const selectedPlayers = selectedPlayerIds.filter(id => id !== "").map(id => players.find(p => p.id === id)).filter(Boolean);

      if (selectedPlayers.length > 0) {
        // Update stamina for all selected players
        selectedPlayers.forEach((player) => {
          const state = currentState[player.id];
          if (state.currentStamina !== undefined) {
            // Determine if player is running (moving towards ball)
            const isRunning = true; // For simplicity, assume always running during simulation
            const currentSpeed = getCurrentSpeedWithStamina(state.baseSpeed, state.currentStamina);
            const depletionRate = getStaminaDepletionRate(player, isRunning, currentSpeed);
            
            // Decrease stamina
            state.currentStamina = Math.max(30, state.currentStamina - depletionRate);
            
            // Update base speed based on current stamina
            state.base = getCurrentSpeedWithStamina(state.baseSpeed, state.currentStamina);
          }
        });
        
        // Update stamina display for all selected players
        const newStaminaStats = {};
        selectedPlayers.forEach(player => {
          const state = currentState[player.id];
          if (state && state.currentStamina !== undefined) {
            newStaminaStats[player.id] = {
              current: Math.round(state.currentStamina),
              max: state.maxStamina,
              percentage: Math.round((state.currentStamina / state.maxStamina) * 100)
            };
          }
        });
        setStaminaStats(newStaminaStats);
      }
    }, 1000); // Update every second
  };

  useEffect(() => {
    if (!isRunning || paused || selectedPlayerIds.filter(id => id !== "").length < 2) return;

    let raf;
    const tick = (ts) => {
      if (!lastTimeRef.current) lastTimeRef.current = ts;
      const dt = Math.min(0.1, (ts - lastTimeRef.current) / 1000);
      lastTimeRef.current = ts;

      const selectedPlayers = selectedPlayerIds.filter(id => id !== "").map(id => players.find(p => p.id === id)).filter(Boolean);
      if (selectedPlayers.length < 2) return;

      const ps = stateRef.current;
      const b = ballRef.current;
      const bv = ballVelRef.current;

      if (drill === "chase") {
        // players chase ball
        selectedPlayers.forEach((p) => {
          const s = ps[p.id];
          if (s) {
            const next = moveTowardsM(s.pos, b, s.base, dt);
            s.pos = clampToPitch(next);

            // Record position for precise tracking
            if (positionBuffersRef.current[p.id] && startTimeRef.current) {
              const now = performance.now() / 1000;
              const elapsedTime = now - (startTimeRef.current / 1000);
              positionBuffersRef.current[p.id].t.push(elapsedTime);
              positionBuffersRef.current[p.id].x.push(s.pos.x); // meters
              positionBuffersRef.current[p.id].y.push(s.pos.y); // meters
            }
          }
        });

        // Find closest player to ball for kicking
        let closest = null;
        let minDistance = Infinity;
        selectedPlayers.forEach(p => {
          if (ps[p.id]) {
            const distance = dist(ps[p.id].pos, b);
            if (distance < minDistance) {
              minDistance = distance;
              closest = p;
            }
          }
        });

        if (closest && minDistance < PLAYER_MIN_GAP_M && lastKickerRef.current !== closest.id) {
          const kicker = ps[closest.id];
          const angle =
            Math.atan2(b.y - kicker.pos.y, b.x - kicker.pos.x) +
            (Math.random() - 0.5) * Math.PI * 0.5;
          bv.vx = Math.cos(angle) * KICK_SPEED_MPS;
          bv.vy = Math.sin(angle) * KICK_SPEED_MPS;
          lastKickerRef.current = closest.id;
        }

        // integrate ball with bounce and friction
        b.x += bv.vx * dt;
        b.y += bv.vy * dt;

        const eps = 0.02;
        if (b.x <= 0) {
          b.x = eps;
          bv.vx = Math.abs(bv.vx) * BALL_BOUNCE;
        }
        if (b.x >= PITCH_W) {
          b.x = PITCH_W - eps;
          bv.vx = -Math.abs(bv.vx) * BALL_BOUNCE;
        }
        if (b.y <= 0) {
          b.y = eps;
          bv.vy = Math.abs(bv.vy) * BALL_BOUNCE;
        }
        if (b.y >= PITCH_H) {
          b.y = PITCH_H - eps;
          bv.vy = -Math.abs(bv.vy) * BALL_BOUNCE;
        }

        const f = Math.pow(BALL_FRICTION_PER_SEC, dt);
        bv.vx *= f;
        bv.vy *= f;

        if (Math.hypot(bv.vx, bv.vy) < 0.2) {
          bv.vx = 0;
          bv.vy = 0;
        }
      } else if (drill === "shuttle") {
        // lane shuttles
        selectedPlayers.forEach((p, idx) => {
          const s = ps[p.id];
          if (s) {
            const laneOffset = (idx - selectedPlayers.length / 2) * 4;
            const laneY = SHUTTLE_Y + laneOffset;
            const side = shuttleSideRef.current[p.id] || "R";
            const targetX = side === "R" ? SHUTTLE_R : SHUTTLE_L;
            const target = { x: targetX, y: laneY };

            const next = moveTowardsM(s.pos, target, s.base, dt);
            s.pos = clampToPitch(next);

            // Record position for precise tracking (shuttle)
            if (positionBuffersRef.current[p.id] && startTimeRef.current) {
              const now = performance.now() / 1000;
              const elapsedTime = now - (startTimeRef.current / 1000);
              positionBuffersRef.current[p.id].t.push(elapsedTime);
              positionBuffersRef.current[p.id].x.push(s.pos.x); // meters
              positionBuffersRef.current[p.id].y.push(s.pos.y); // meters
            }

            if (dist(s.pos, target) < TURN_THRESH_M) {
              shuttleSideRef.current[p.id] = side === "R" ? "L" : "R";
              s.reps = (s.reps || 0) + 1;
            }
          }
        });
        // ball stays put
      } else if (drill === "slalom") {
        // slalom drill - player weaves through cones
        selectedPlayers.forEach((p) => {
          const s = ps[p.id];
          if (s && !slalomDoneRef.current[p.id]) {
            const gates = slalomGatesRef.current[p.id];
            const currentGateIdx = slalomProgRef.current[p.id];

            if (currentGateIdx < gates.length) {
              const targetGate = gates[currentGateIdx];
              const next = moveTowardsM(s.pos, targetGate, s.base, dt);
              s.pos = clampToPitch(next);

              // Record position for precise tracking
              if (positionBuffersRef.current[p.id] && startTimeRef.current) {
                const now = performance.now() / 1000;
                const elapsedTime = now - (startTimeRef.current / 1000);
                positionBuffersRef.current[p.id].t.push(elapsedTime);
                positionBuffersRef.current[p.id].x.push(s.pos.x);
                positionBuffersRef.current[p.id].y.push(s.pos.y);
              }

              // Check if reached current gate
              if (dist(s.pos, targetGate) < SLALOM_REACH_R) {
                slalomProgRef.current[p.id]++;
                slalomTimeRef.current[p.id] = (performance.now() - startTimeRef.current) / 1000;
              }
            } else {
              // Completed the course
              slalomDoneRef.current[p.id] = true;
            }
          }
        });
        // ball stays put
      }

      forceRender((n) => n + 1);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isRunning, paused, drill, selectedPlayerIds, players]);

// build current report from live state when user clicks
function buildSessionReportNow() {
  const p1 = players.find(p => p.id === player1Id);
  const p2 = players.find(p => p.id === player2Id);
  if (!p1 || !p2) return null;

  // Analyze precise tracking data first
  analyzePreciseData();

  const s1 = stateRef.current[p1.id] || {};
  const s2 = stateRef.current[p2.id] || {};
  const precise1 = preciseStatsRef.current[p1.id] || {};
  const precise2 = preciseStatsRef.current[p2.id] || {};
  const now = performance.now();
  const endTs = lastTimeRef.current ?? now;
  const startTs = startTimeRef.current ?? now;
  const duration_s = Math.max(1, (endTs - startTs) / 1000);

  const avg1 = precise1.avg_speed_mps || 0;
  const avg2 = precise2.avg_speed_mps || 0;

  function fb(name, avg, maxp, distM, reps) {
    if (drill === "shuttle" && (reps || 0) < 20) return `${name} needs more repeatability Aim for plus two shuttles next session.`;
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
    players: [
      {
        id: p1.id,
        name: p1.name,
        position: p1.position || p1.role || "",
        speed: Number(p1.speed ?? ""),
        stamina: Number(p1.stamina ?? ""),
        distance_m: precise1.distance_m || 0,
        avg_speed_mps: precise1.avg_speed_mps || 0,
        p95_speed_mps: precise1.p95_speed_mps || 0,
        max_speed_mps: precise1.max_speed_mps || 0,
        high_speed_time_s: precise1.high_speed_time_s || 0,
        sprint_count: precise1.sprint_count ?? 0,
        shuttles: drill === "shuttle" ? s1.reps || 0 : "",
        feedback: fb(p1.name, precise1.avg_speed_mps || 0, precise1.p95_speed_mps || 0, precise1.distance_m || 0, s1.reps || 0),
        precise_duration: precise1.duration_s || 0,
      },
      {
        id: p2.id,
        name: p2.name,
        position: p2.position || p2.role || "",
        speed: Number(p2.speed ?? ""),
        stamina: Number(p2.stamina ?? ""),
        distance_m: precise2.distance_m || 0,
        avg_speed_mps: precise2.avg_speed_mps || 0,
        p95_speed_mps: precise2.p95_speed_mps || 0,
        max_speed_mps: precise2.max_speed_mps || 0,
        high_speed_time_s: precise2.high_speed_time_s || 0,
        sprint_count: precise2.sprint_count ?? 0,
        shuttles: drill === "shuttle" ? s2.reps || 0 : "",
        feedback: fb(p2.name, precise2.avg_speed_mps || 0, precise2.p95_speed_mps || 0, precise2.distance_m || 0, s2.reps || 0),
        precise_duration: precise2.duration_s || 0,
      },
    ],
  };
}

// handlers
function downloadCSVReport() {
  const report = buildSessionReportNow();
  if (!report) return;
  const csv = toCSV(report);
  downloadBlob(csv, `playsmart_${report.session.id}.csv`, "text/csv;charset=utf-8");
}
function downloadJSONReport() {
  const report = buildSessionReportNow();
  if (!report) return;
  const json = JSON.stringify(report, null, 2);
  downloadBlob(json, `playsmart_${report.session.id}.json`, "application/json");
}
function printOrPDFReport() {
  const report = buildSessionReportNow();
  if (!report) return;
  const html = buildPrintHTML(report);
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}


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
<option value="slalom">Dribble slalom</option>
            </select>
          </div>


          {/* 2 Player Selection Grid */}
          <div className="col-span-full">
            <label className="block text-sm font-medium mb-2">Two Player Selection</label>
            <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg">
              {Array.from({ length: 2 }, (_, index) => {
                const playerNumber = index + 1;
                const selectedId = selectedPlayerIds[index];
                const usedPlayerIds = selectedPlayerIds.filter(id => id !== "");

                return (
                  <div key={index} className="space-y-1">
                    <label className="block text-xs font-medium text-center">
                      Player {playerNumber}
                    </label>
                    <select
                      value={selectedId}
                      onChange={(e) => {
                        const newIds = [...selectedPlayerIds];
                        newIds[index] = e.target.value;
                        setSelectedPlayerIds(newIds);
                      }}
                      className="w-full border p-1 rounded text-xs"
                      disabled={isRunning}
                    >
                      <option value="">Select</option>
                      {players.map((p) => {
                        const isAlreadySelected = usedPlayerIds.includes(p.id) && selectedId !== p.id;
                        return (
                          <option
                            key={p.id}
                            value={p.id}
                            disabled={isAlreadySelected}
                            style={isAlreadySelected ? {color: '#999'} : {}}
                          >
                            {p.name} {isAlreadySelected ? '(Used)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={startSimulation}
              disabled={selectedPlayerIds.filter(id => id !== "").length < (drill === "slalom" ? 1 : 2)}
            >
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
                  // Clean up stamina timer
                  if (staminaTimerRef.current) {
                    clearInterval(staminaTimerRef.current);
                    staminaTimerRef.current = null;
                  }
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
          {/* field markings */}
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

          {/* ball */}
          <div
            className="absolute w-4 h-4 bg-yellow-400 rounded-full shadow-lg transition-transform duration-150"
            style={{
              left: `${toPct(ballRef.current).x}%`,
              top: `${toPct(ballRef.current).y}%`,
              transform: "translate(-50%, -50%)",
            }}
          />

          {/* slalom cones */}
          {drill === "slalom" && Object.keys(slalomGatesRef.current).map((playerId) => {
            const gates = slalomGatesRef.current[playerId];
            const currentGateIdx = slalomProgRef.current[playerId] || 0;

            return gates.map((gate, idx) => {
              const pct = toPct(gate);
              const isPassed = idx < currentGateIdx;
              const isCurrent = idx === currentGateIdx;

              return (
                <div
                  key={`${playerId}-cone-${idx}`}
                  className={`absolute w-3 h-3 rounded-full transition-all duration-200 ${
                    isPassed ? 'bg-gray-400' : isCurrent ? 'bg-yellow-400 ring-2 ring-yellow-600' : 'bg-orange-500'
                  }`}
                  style={{
                    left: `${pct.x}%`,
                    top: `${pct.y}%`,
                    transform: "translate(-50%, -50%)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                  }}
                />
              );
            });
          })}

          {/* players */}
          {selectedPlayerIds.filter(id => id !== "").map((id, index) => {
            const s = stateRef.current[id];
            if (!s) return null;
            const pct = toPct(s.pos);
            const player = players.find((p) => p.id === id);

            // Color players differently based on index
            const colors = [
              "bg-blue-600", "bg-red-600", "bg-green-600", "bg-yellow-600", "bg-purple-600",
              "bg-pink-600", "bg-indigo-600", "bg-gray-600", "bg-orange-600", "bg-teal-600", "bg-cyan-600"
            ];

            return (
              <div
                key={id}
                className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-white font-bold transition-transform duration-100 ${
                  colors[index % colors.length]
                }`}
                style={{
                  left: `${pct.x}%`,
                  top: `${pct.y}%`,
                  transform: "translate(-50%, -50%)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}
              >
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs text-black shadow">
                  {index + 1}
                </div>
              </div>
            );
          })}

          {/* stats */}
          <Card className="absolute opacity-50 bottom-2 left-1/2 -translate-x-1/2 p-3 text-sm bg-white/95 backdrop-blur-sm w-[92%] shadow-lg">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
              {selectedPlayerIds.filter(id => id !== "").slice(0, drill === "slalom" ? 1 : 2).map((id, index) => {
                const player = players.find((p) => p.id === id);
                const positionData = positionBuffersRef.current[id];
                const trackingCount = positionData ? positionData.t.length : 0;
                return (
                  <div key={id} className="text-center">
                    <div className="font-bold text-xs text-blue-800">{player?.name}</div>
                    <div className="space-y-1 text-xs">
                      <div className="bg-blue-100 px-1 py-0.5 rounded">
                        <span className="font-semibold">#{index + 1}</span>
                      </div>
                      <div className="bg-green-100 px-1 py-0.5 rounded">
                        <span className="font-semibold">Tracking:</span> {trackingCount}
                      </div>
                      {drill === "shuttle" && (
                        <div className="bg-orange-100 px-1 py-0.5 rounded">
                          <span className="font-semibold">Shuttles:</span> {stateRef.current[id]?.reps || 0}
                        </div>
                      )}
                      {drill === "slalom" && (
                        <div className="bg-purple-100 px-1 py-0.5 rounded">
                          <span className="font-semibold">Gates:</span> {slalomProgRef.current[id] || 0}/{SLALOM_GATES}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

<div className="text-center mt-3 pt-3 border-t border-gray-300">
  <div className="bg-yellow-100 px-4 py-2 rounded-lg inline-block">
    <span className="font-bold text-lg">⏱️ Time: </span>
    <span className="font-bold text-xl text-red-600">
      {startTimeRef.current ? Math.max(0, Math.floor((performance.now() - startTimeRef.current) / 1000)) : 0}s
    </span>
  </div>
</div>
          </Card>
        </div>
      )}

      {feedback && (
        <Card className="p-4 space-y-2">
          <div className="font-semibold">Session summary</div>
          <div className="space-y-1">
            {feedback.lines.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
          <div className="mt-2">
            {feedback.coach.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>

          {/* Realistic Player Speed Analysis */}
          {feedback.playerDevelopment && feedback.playerDevelopment.length > 0 && (
            <div className="mt-4">
              <div className="font-semibold text-green-700 mb-2">⚡ Realistic Speed Analysis</div>
              <div className="bg-green-50 rounded-lg p-3 mb-4">
                <div className="text-sm text-green-800 mb-2">
                  Each player's speed is calculated based on their physical attributes:
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-green-200">
                      <th className="text-left p-2 font-semibold">Player</th>
                      <th className="text-left p-2 font-semibold">Height</th>
                      <th className="text-left p-2 font-semibold">Weight</th>
                      <th className="text-left p-2 font-semibold">Age</th>
                      <th className="text-left p-2 font-semibold">Position</th>
                      <th className="text-left p-2 font-semibold">Calculated Speed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPlayerIds.filter(id => id !== "").map((playerId) => {
                      const player = players.find(p => p.id === playerId);
                      if (!player) return null;
                      const speedData = calculateRealisticPlayerSpeed(player);
                      return (
                        <tr key={playerId} className="border-b border-green-100">
                          <td className="p-2 font-medium">{player.name}</td>
                          <td className="p-2">{player.height || 175}cm</td>
                          <td className="p-2">{player.weight || 70}kg</td>
                          <td className="p-2">{player.age || 25}y</td>
                          <td className="p-2">{player.position}</td>
                          <td className="p-2 font-bold text-green-600">{speedData.calculatedSpeed.toFixed(2)} m/s</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="mt-2 text-xs text-green-700">
                  💡 <strong>Formula:</strong> Position Base × Height Factor × Weight Factor × Age Factor × Random Variation
                </div>
              </div>
            </div>
          )}

          {/* Live Stamina Monitor */}
          {isRunning && Object.keys(staminaStats).length > 0 && (
            <div className="mt-4">
              <div className="font-semibold text-orange-700 mb-2">💪 Live Stamina Monitor</div>
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-4">
                  {selectedPlayerIds.filter(id => id !== "").map((playerId) => {
                    const player = players.find(p => p.id === playerId);
                    const stamina = staminaStats[playerId];
                    if (!player || !stamina) return null;

                    const staminaColor = stamina.percentage > 70 ? 'bg-green-500' : 
                                       stamina.percentage > 40 ? 'bg-yellow-500' : 'bg-red-500';
                    
                    return (
                      <div key={playerId} className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="font-medium text-sm mb-2">{player.name}</div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-xs text-gray-600 w-16">Stamina:</div>
                          <div className="flex-1 bg-gray-200 rounded-full h-3">
                            <div 
                              className={`h-3 rounded-full transition-all duration-500 ${staminaColor}`}
                              style={{ width: `${stamina.percentage}%` }}
                            />
                          </div>
                          <div className="text-xs font-bold w-12">{stamina.percentage}%</div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {stamina.current}/{stamina.max} stamina points
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs text-orange-700">
                  ⚡ <strong>Speed Impact:</strong> Lower stamina = Slower movement speed
                </div>
              </div>
            </div>
          )}

          {/* Player Development Analysis Table */}
          {feedback.playerDevelopment && feedback.playerDevelopment.length > 0 && (
            <div className="mt-4">
              <div className="font-semibold text-blue-700 mb-2">🚀 Player Development Analysis</div>
              <div className="bg-blue-50 rounded-lg p-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-blue-200">
                      <th className="text-left p-2 font-semibold">Player</th>
                      <th className="text-left p-2 font-semibold">Old Rating</th>
                      <th className="text-left p-2 font-semibold">Performance</th>
                      <th className="text-left p-2 font-semibold">New Rating</th>
                      <th className="text-left p-2 font-semibold">Matches</th>
                      <th className="text-left p-2 font-semibold">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedback.playerDevelopment.map((dev, i) => (
                      <tr key={i} className="border-b border-blue-100">
                        <td className="p-2 font-medium">{dev.name}</td>
                        <td className="p-2">
                          {dev.isNew ? (
                            <span className="text-gray-500 italic">NEW</span>
                          ) : (
                            dev.oldRating
                          )}
                        </td>
                        <td className="p-2">{dev.performanceSpeed.toFixed(2)} m/s</td>
                        <td className="p-2 font-bold text-blue-600">{dev.newRating}</td>
                        <td className="p-2">{dev.matchesPlayed}</td>
                        <td className="p-2">
                          {dev.isNew ? (
                            <span className="text-green-600 font-bold">+{dev.newRating} (NEW!)</span>
                          ) : dev.change > 0 ? (
                            <span className="text-green-600 font-bold">+{dev.change}</span>
                          ) : dev.change < 0 ? (
                            <span className="text-red-600 font-bold">{dev.change}</span>
                          ) : (
                            <span className="text-gray-500">No change</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="text-xs text-blue-600 mt-2 italic">
                  * Ratings based on rolling average of last 6 matches
                </div>
                <div className="mt-3 flex gap-2">
                  <Button 
                    onClick={() => savePlayerDevelopment(feedback.playerDevelopment)}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2"
                  >
                    💾 Update Player Records
                  </Button>
                  <span className="text-xs text-gray-500 self-center">
                    This will permanently update player ratings based on this simulation
                  </span>
                </div>
              </div>
            </div>
          )}

{/* report actions - temporarily disabled */}
{/*
<div className="mt-3 flex flex-wrap gap-2">
  <Button variant="outline" onClick={downloadCSVReport}>Download CSV</Button>
  <Button variant="outline" onClick={downloadJSONReport}>Download JSON</Button>
</div>
<div className="text-xs text-neutral-500 mt-1">
  CSV includes both players. Print view lets you save as PDF.
</div>
*/}
        </Card>
      )}
    </div>
  );
}



// utils for reports
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
    "distance_m","avg_speed_mps","p95_speed_mps","max_speed_mps","high_speed_time_s","sprint_count","shuttles","feedback",
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
      fmt(p.avg_speed_mps || 0, 2),
      fmt(p.p95_speed_mps || 0, 2),
      fmt(p.max_speed_mps || 0, 2),
      fmt(p.high_speed_time_s || 0, 1),
      p.sprint_count ?? 0,
      p.shuttles ?? "",
      `"${(p.feedback || "").replace(/"/g, '""')}"`,
    ].join(",")
  );
  return [header, ...rows].join("\n");
}
function buildPrintHTML(report) {
  const s = report.session;
  const rows = report.players.map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${p.position || p.role || ""}</td>
      <td>${Math.round(p.distance_m || 0)}</td>
      <td>${fmt(p.avg_speed_mps || 0)}</td>
      <td>${fmt(p.p95_speed_mps || p.max_speed_mps || 0)}</td>
      <td>${p.sprint_count ?? 0}</td>
      <td>${p.shuttles ?? ""}</td>
      <td>${p.feedback || ""}</td>
    </tr>
  `).join("");
  return `
<!doctype html><html><head><meta charset="utf-8"/>
<title>PlaySmart Report ${s.id}</title>
<style>
body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;margin:24px}
h1{margin:0 0 8px 0}.meta{color:#444;margin-bottom:16px}
table{width:100%;border-collapse:collapse}
th,td{border:1px solid #ddd;padding:8px;font-size:14px;vertical-align:top}
th{background:#f7f7f7;text-align:left}.small{font-size:12px;color:#555;margin-top:8px}
@media print{.noprint{display:none}}
</style></head><body>
<h1>PlaySmart session report</h1>
<div class="meta">Session ${s.id} Date ${s.date} Drill ${s.drill} Duration ${Math.round(s.duration_s)} s</div>
<table><thead><tr>
<th>Player</th><th>Position</th><th>Distance (m)</th><th>Avg speed (m/s)</th><th>P95 speed (m/s)</th><th>Sprints</th><th>Shuttles</th><th>Feedback</th>
</tr></thead><tbody>${rows}</tbody></table>
<div class="small">Generated by PlaySmart</div>
<button class="noprint" onclick="window.print()">Print or Save as PDF</button>
</body></html>`;
}


