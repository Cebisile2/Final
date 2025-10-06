export function mapPositionToRole(position = "") {
  const p = String(position).toLowerCase();
  if (["striker", "forward", "winger", "attacker", "cf", "lw", "rw", "st", "am"].some(k => p.includes(k))) return "Forward";
  if (["mid", "cm", "dm", "cam", "amf", "mf", "mezzala", "volante"].some(k => p.includes(k))) return "Midfielder";
  if (["def", "cb", "rb", "lb", "fb", "rwb", "lwb"].some(k => p.includes(k))) return "Defender";
  if (["gk", "goal", "keeper"].some(k => p.includes(k))) return "Goalkeeper";
  // fallback
  return "Midfielder";
}

export const ROLE_BASELINES = {
  Forward:   { distance_min: 1800, distance_max: 2400, sprint_threshold_mps: 5.8 },
  Midfielder:{ distance_min: 2200, distance_max: 3000, sprint_threshold_mps: 5.6 },
  Defender:  { distance_min: 1600, distance_max: 2200, sprint_threshold_mps: 5.4 },
  Goalkeeper:{ distance_min: 900,  distance_max: 1400, sprint_threshold_mps: 4.8 },
};

function toScore(v, fallback = 50) {
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function speedMultiplier(speed0to100) {
  const s = toScore(speed0to100, 50);
  // 0.7x to 1.3x around the role base band
  return 0.7 + (s / 100) * 0.6;
}

// Normalize the club payload you posted into what the app expects everywhere
export function normalizeClub(raw) {
  if (!raw) return null;

  // never keep plaintext password on client models
  const { password, ...rest } = raw;

  const roster = (raw.players || []).map(p => {
    const role = mapPositionToRole(p.position);
    return {
      id: String(p.id),
      name: String(p.name || "Player"),
      image: p.image || "",
      role,
      position: p.position || "",
      speed: toScore(p.speed, 50),
      stamina: toScore(p.stamina, 50),
      // baseline targets for this role
      baseline: ROLE_BASELINES[role],
      // room for future tags and status
      status: "Active",
      tags: [],
    };
  });

  // Filter duplicates by id just in case
  const seen = new Set();
  const players = roster.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  // Keep the formation shape but ensure numbers
  const formation = {
    name: rest.formation?.name || "Custom",
    spots: (rest.formation?.spots || []).map(s => ({
      x: Number(s.x),
      y: Number(s.y),
      label: s.label || "",
      playerId: s.playerId || null,
    })),
  };

  return {
    uid: String(rest.uid || ""),
    email: String(rest.email || ""),
    name: String(rest.name || "Club"),
    icon: rest.clubIcon || "",
    players,
    formation,
    // sessionHistory will be filled from your backend later
    sessionHistory: {}, // { playerId: [ {date, distance_m, avg_pace, max_pace, sprints} ] }
  };
}

// Readiness score when we do NOT yet have session history
// Uses attributes plus role baselines to avoid an empty page
export function readinessFromAttributes(player) {
  // distance proxy from stamina, pace proxy from speed
  const distProxy = player.stamina / 100;   // 0..1
  const paceProxy = player.speed / 100;     // 0..1
  const s = 100 * (0.5 * distProxy + 0.5 * paceProxy);
  return Math.round(s);
}

// AI suggestion using last sessions if present, otherwise use attributes
export function suggestNextDrill(history = [], player) {
  const last = history[0];
  const prev = history[1];

  if (last) {
    if (last.avg_pace < 2.6 && last.max_pace >= 6.0) return { drill: "Shuttle repeats", why: "raise steady pace while keeping top speed" };
    if (last.max_pace < ROLE_BASELINES[player.role].sprint_threshold_mps) return { drill: "Acceleration sprints", why: "improve peak speed and first steps" };
    if (last.distance_m < ROLE_BASELINES[player.role].distance_min * 0.9) return { drill: "Box to box aerobic", why: "push distance and aerobic base" };
    if (prev && last.sprints < prev.sprints && last.avg_pace >= prev.avg_pace) return { drill: "Repeat sprint ability", why: "recover speed across reps" };
    return { drill: "Small sided game", why: "maintain load with decision making" };
  }

  // attribute based default
  if (player.speed < 45) return { drill: "Acceleration sprints", why: "low speed attribute" };
  if (player.stamina < 45) return { drill: "Box to box aerobic", why: "low stamina attribute" };
  return { drill: "Shuttle repeats", why: "establish steady pace baseline" };
}

export function aiSentence(player, history = []) {
  const last = history[0];
  if (!last) {
    const r = readinessFromAttributes(player);
    if (player.stamina < 45) return `${player.name} needs aerobic base work Focus on zone three runs Readiness ${r}.`;
    if (player.speed < 45) return `${player.name} acceleration is limited Add ten meter starts Readiness ${r}.`;
    return `${player.name} ready for baseline testing Start with shuttles then a short duel Readiness ${r}.`;
  }
  const r = Math.round(
    100 * (
      0.4 * Math.min(1, last.distance_m / player.baseline.distance_max) +
      0.35 * Math.min(1, last.avg_pace / 3.2) +
      0.15 * Math.min(1, last.max_pace / 7.0) +
      0.10 * Math.min(1, last.sprints / 8)
    )
  );
  if (last.avg_pace < 2.6) return `${player.name} steady pace is lagging Focus on controlled shuttles Hold above two point eight Readiness ${r}.`;
  if (last.max_pace < player.baseline.sprint_threshold_mps) return `${player.name} peak speed is limited Add acceleration and flying tens Readiness ${r}.`;
  if (last.distance_m > player.baseline.distance_min && last.avg_pace >= 3.0) return `${player.name} aerobic load is strong Keep recovery solid Readiness ${r}.`;
  return `${player.name} stable session Keep building repeatability Readiness ${r}.`;
}

// Build a sim roster from normalized players and optional position filter
export function rosterForDuel(club) {
  // choose two non goalkeepers if possible
  const field = club.players.filter(p => p.role !== "Goalkeeper");
  const pick = (field.length >= 2 ? field : club.players).slice(0, 2);
  return pick.map(p => ({
    playerId: p.id,
    name: p.name,
    role: p.role,
    speed: p.speed,     // still 0..100 attribute
    stamina: p.stamina, // 0..100 attribute
  }));
}

// FORMATION OPTIMIZER AI SYSTEM

// Common football formations with their characteristics
export const FORMATION_TEMPLATES = {
  "4-4-2": {
    name: "4-4-2",
    positions: [
      { role: "Goalkeeper", x: 50, y: 10 },
      { role: "Defender", x: 20, y: 25 }, { role: "Defender", x: 40, y: 25 },
      { role: "Defender", x: 60, y: 25 }, { role: "Defender", x: 80, y: 25 },
      { role: "Midfielder", x: 20, y: 50 }, { role: "Midfielder", x: 40, y: 50 },
      { role: "Midfielder", x: 60, y: 50 }, { role: "Midfielder", x: 80, y: 50 },
      { role: "Forward", x: 35, y: 80 }, { role: "Forward", x: 65, y: 80 }
    ],
    strengths: ["balanced", "defensive_stability", "wide_play"],
    weaknesses: ["midfield_numbers", "creativity"],
    style: "balanced"
  },
  "4-3-3": {
    name: "4-3-3",
    positions: [
      { role: "Goalkeeper", x: 50, y: 10 },
      { role: "Defender", x: 20, y: 25 }, { role: "Defender", x: 40, y: 25 },
      { role: "Defender", x: 60, y: 25 }, { role: "Defender", x: 80, y: 25 },
      { role: "Midfielder", x: 30, y: 50 }, { role: "Midfielder", x: 50, y: 50 }, { role: "Midfielder", x: 70, y: 50 },
      { role: "Forward", x: 25, y: 80 }, { role: "Forward", x: 50, y: 80 }, { role: "Forward", x: 75, y: 80 }
    ],
    strengths: ["attacking", "wide_play", "pressing"],
    weaknesses: ["defensive_gaps", "midfield_control"],
    style: "attacking"
  },
  "3-5-2": {
    name: "3-5-2",
    positions: [
      { role: "Goalkeeper", x: 50, y: 10 },
      { role: "Defender", x: 30, y: 25 }, { role: "Defender", x: 50, y: 25 }, { role: "Defender", x: 70, y: 25 },
      { role: "Midfielder", x: 15, y: 50 }, { role: "Midfielder", x: 35, y: 45 },
      { role: "Midfielder", x: 50, y: 50 }, { role: "Midfielder", x: 65, y: 45 }, { role: "Midfielder", x: 85, y: 50 },
      { role: "Forward", x: 40, y: 80 }, { role: "Forward", x: 60, y: 80 }
    ],
    strengths: ["midfield_control", "wing_backs", "flexibility"],
    weaknesses: ["wide_defense", "aerial_weakness"],
    style: "possession"
  },
  "5-3-2": {
    name: "5-3-2",
    positions: [
      { role: "Goalkeeper", x: 50, y: 10 },
      { role: "Defender", x: 15, y: 25 }, { role: "Defender", x: 35, y: 25 },
      { role: "Defender", x: 50, y: 25 }, { role: "Defender", x: 65, y: 25 }, { role: "Defender", x: 85, y: 25 },
      { role: "Midfielder", x: 30, y: 55 }, { role: "Midfielder", x: 50, y: 55 }, { role: "Midfielder", x: 70, y: 55 },
      { role: "Forward", x: 40, y: 80 }, { role: "Forward", x: 60, y: 80 }
    ],
    strengths: ["defensive_stability", "counter_attack", "set_pieces"],
    weaknesses: ["creativity", "possession", "attacking_numbers"],
    style: "defensive"
  }
};

// Calculate team strength based on player attributes for specific roles
function calculateRoleStrength(players, role) {
  const rolePlayers = players.filter(p => p.role === role);
  if (rolePlayers.length === 0) return 0;
  
  const avgSpeed = rolePlayers.reduce((sum, p) => sum + p.speed, 0) / rolePlayers.length;
  const avgStamina = rolePlayers.reduce((sum, p) => sum + p.stamina, 0) / rolePlayers.length;
  const readiness = rolePlayers.reduce((sum, p) => sum + readinessFromAttributes(p), 0) / rolePlayers.length;
  
  return (avgSpeed + avgStamina + readiness) / 3;
}

// Analyze squad composition and strengths
export function analyzeSquad(club) {
  const players = club.players || [];
  
  const roleCount = {
    Goalkeeper: players.filter(p => p.role === "Goalkeeper").length,
    Defender: players.filter(p => p.role === "Defender").length,
    Midfielder: players.filter(p => p.role === "Midfielder").length,
    Forward: players.filter(p => p.role === "Forward").length
  };
  
  const roleStrengths = {
    Goalkeeper: calculateRoleStrength(players, "Goalkeeper"),
    Defender: calculateRoleStrength(players, "Defender"),
    Midfielder: calculateRoleStrength(players, "Midfielder"),
    Forward: calculateRoleStrength(players, "Forward")
  };
  
  // Team characteristics
  const avgSpeed = players.reduce((sum, p) => sum + p.speed, 0) / players.length || 0;
  const avgStamina = players.reduce((sum, p) => sum + p.stamina, 0) / players.length || 0;
  const teamFitness = players.reduce((sum, p) => sum + readinessFromAttributes(p), 0) / players.length || 0;
  
  return {
    roleCount,
    roleStrengths,
    teamStats: {
      avgSpeed,
      avgStamina,
      teamFitness,
      totalPlayers: players.length
    }
  };
}

// AI Formation Recommendation Engine
export function recommendOptimalFormation(club) {
  const analysis = analyzeSquad(club);
  const formations = Object.values(FORMATION_TEMPLATES);
  
  const scores = formations.map(formation => {
    let score = 0;
    let reasons = [];
    
    // Check if we have enough players for each role
    const requiredRoles = formation.positions.reduce((acc, pos) => {
      acc[pos.role] = (acc[pos.role] || 0) + 1;
      return acc;
    }, {});
    
    // Penalize formations we can't fill
    let canPlay = true;
    Object.entries(requiredRoles).forEach(([role, needed]) => {
      if (analysis.roleCount[role] < needed) {
        score -= 50; // Heavy penalty
        canPlay = false;
      }
    });
    
    if (!canPlay) {
      return { formation, score, reasons: [`Not enough ${Object.keys(requiredRoles).find(r => analysis.roleCount[r] < requiredRoles[r])}s`] };
    }
    
    // Reward formations that match our squad strengths
    if (analysis.roleStrengths.Defender > 70 && formation.strengths.includes("defensive_stability")) {
      score += 25;
      reasons.push("Strong defensive players");
    }
    
    if (analysis.roleStrengths.Forward > 70 && formation.strengths.includes("attacking")) {
      score += 25;
      reasons.push("Powerful attacking options");
    }
    
    if (analysis.roleStrengths.Midfielder > 70 && formation.strengths.includes("midfield_control")) {
      score += 25;
      reasons.push("Excellent midfield control");
    }
    
    // Consider team fitness and speed
    if (analysis.teamStats.avgSpeed > 70 && formation.strengths.includes("pressing")) {
      score += 15;
      reasons.push("High team speed suits pressing game");
    }
    
    if (analysis.teamStats.avgStamina > 70 && formation.strengths.includes("possession")) {
      score += 15;
      reasons.push("Good stamina for possession play");
    }
    
    // Balance bonus for 4-4-2 if squad is well-rounded
    if (formation.name === "4-4-2") {
      const roleBalance = Object.values(analysis.roleStrengths).reduce((min, curr) => Math.min(min, curr), 100);
      if (roleBalance > 60) {
        score += 20;
        reasons.push("Balanced squad suits 4-4-2");
      }
    }
    
    return { formation, score, reasons };
  });
  
  // Sort by score and return top recommendations
  return scores.sort((a, b) => b.score - a.score);
}

// Generate tactical advice based on formation choice
export function generateTacticalAdvice(formation, squadAnalysis) {
  const advice = [];
  
  // Formation-specific advice
  if (formation.name === "4-3-3" && squadAnalysis.roleStrengths.Forward > 75) {
    advice.push("Utilize your strong forwards with through balls and wide crosses");
  }
  
  if (formation.name === "3-5-2" && squadAnalysis.teamStats.avgStamina > 70) {
    advice.push("Press high and maintain possession with your energetic midfield");
  }
  
  if (formation.name === "5-3-2" && squadAnalysis.roleStrengths.Defender > 70) {
    advice.push("Stay compact and look for quick counter-attacks");
  }
  
  // General tactical advice based on team strengths
  if (squadAnalysis.teamStats.avgSpeed > 75) {
    advice.push("Exploit pace on the wings and in transitions");
  }
  
  if (squadAnalysis.roleStrengths.Midfielder > 80) {
    advice.push("Control the tempo through midfield dominance");
  }
  
  return advice;
}

// PLAYER DEVELOPMENT PREDICTION AI SYSTEM

// Age-based development curves for different attributes
const DEVELOPMENT_CURVES = {
  speed: {
    peak: 25,
    decline_start: 28,
    youth_growth: 0.08,  // 8% per year until peak
    decline_rate: 0.03   // 3% per year after decline
  },
  stamina: {
    peak: 27,
    decline_start: 30,
    youth_growth: 0.06,  // 6% per year until peak
    decline_rate: 0.025  // 2.5% per year after decline
  },
  technical: {
    peak: 29,
    decline_start: 32,
    youth_growth: 0.05,  // 5% per year until peak
    decline_rate: 0.015  // 1.5% per year after decline
  }
};

// Position change potential based on attributes
const POSITION_TRANSITIONS = {
  Forward: {
    to_Midfielder: { speed_min: 70, stamina_min: 75, reason: "High stamina suits midfield play" },
    to_Defender: { speed_min: 60, stamina_min: 80, reason: "Strong stamina for defensive duties" }
  },
  Midfielder: {
    to_Forward: { speed_min: 80, stamina_min: 65, reason: "Pace advantage in attack" },
    to_Defender: { speed_min: 65, stamina_min: 85, reason: "Excellent endurance for defense" }
  },
  Defender: {
    to_Midfielder: { speed_min: 75, stamina_min: 80, reason: "Good mobility for midfield" },
    to_Forward: { speed_min: 85, stamina_min: 60, reason: "Exceptional speed for attacking" }
  }
};

// Calculate player's current age based on attributes (estimate)
function estimatePlayerAge(player) {
  // Use attribute levels to estimate age (higher attributes suggest prime age)
  const avgAttribute = (player.speed + player.stamina) / 2;
  
  if (avgAttribute >= 85) return 26; // Prime player
  if (avgAttribute >= 75) return 24; // Developing player
  if (avgAttribute >= 65) return 22; // Young player
  if (avgAttribute >= 55) return 20; // Youth player
  return 18; // Very young player
}

// Predict attribute development over time
export function predictPlayerDevelopment(player, yearsAhead = 3) {
  const currentAge = estimatePlayerAge(player);
  const predictions = [];
  
  for (let year = 1; year <= yearsAhead; year++) {
    const futureAge = currentAge + year;
    
    // Calculate speed development
    let futureSpeed = player.speed;
    if (futureAge < DEVELOPMENT_CURVES.speed.peak) {
      futureSpeed *= (1 + DEVELOPMENT_CURVES.speed.youth_growth);
    } else if (futureAge > DEVELOPMENT_CURVES.speed.decline_start) {
      futureSpeed *= (1 - DEVELOPMENT_CURVES.speed.decline_rate);
    }
    
    // Calculate stamina development
    let futureStamina = player.stamina;
    if (futureAge < DEVELOPMENT_CURVES.stamina.peak) {
      futureStamina *= (1 + DEVELOPMENT_CURVES.stamina.youth_growth);
    } else if (futureAge > DEVELOPMENT_CURVES.stamina.decline_start) {
      futureStamina *= (1 - DEVELOPMENT_CURVES.stamina.decline_rate);
    }
    
    // Cap at 100 and floor at 1
    futureSpeed = Math.min(100, Math.max(1, Math.round(futureSpeed)));
    futureStamina = Math.min(100, Math.max(1, Math.round(futureStamina)));
    
    predictions.push({
      year,
      age: futureAge,
      speed: futureSpeed,
      stamina: futureStamina,
      overall: Math.round((futureSpeed + futureStamina) / 2)
    });
  }
  
  return {
    currentAge,
    predictions,
    peakYear: predictions.findIndex(p => p.overall === Math.max(...predictions.map(pred => pred.overall))) + 1
  };
}

// Analyze position change potential
export function analyzePositionChange(player) {
  const currentRole = player.role;
  const recommendations = [];
  
  // Check all possible transitions from current position
  const transitions = POSITION_TRANSITIONS[currentRole] || {};
  
  Object.entries(transitions).forEach(([newPosition, requirements]) => {
    const newRole = newPosition.replace('to_', '');
    let score = 0;
    let reasons = [];
    
    // Check if player meets requirements
    if (player.speed >= requirements.speed_min) {
      score += 30;
      reasons.push(`Speed ${player.speed} meets ${newRole} requirements`);
    } else {
      score -= 20;
      reasons.push(`Speed ${player.speed} below ${newRole} minimum (${requirements.speed_min})`);
    }
    
    if (player.stamina >= requirements.stamina_min) {
      score += 30;
      reasons.push(`Stamina ${player.stamina} suits ${newRole} role`);
    } else {
      score -= 20;
      reasons.push(`Stamina ${player.stamina} below ${newRole} minimum (${requirements.stamina_min})`);
    }
    
    // Bonus for exceeding requirements significantly
    if (player.speed > requirements.speed_min + 10) {
      score += 15;
      reasons.push(`Exceptional speed for ${newRole}`);
    }
    
    if (player.stamina > requirements.stamina_min + 10) {
      score += 15;
      reasons.push(`Outstanding endurance for ${newRole}`);
    }
    
    if (score > 0) {
      recommendations.push({
        newPosition: newRole,
        currentPosition: currentRole,
        score,
        feasibility: score > 40 ? "High" : score > 20 ? "Medium" : "Low",
        reasons: reasons.slice(0, 2), // Top 2 reasons
        description: requirements.reason
      });
    }
  });
  
  return recommendations.sort((a, b) => b.score - a.score);
}

// Generate development advice for a player
export function generateDevelopmentAdvice(player) {
  const development = predictPlayerDevelopment(player);
  const positionChanges = analyzePositionChange(player);
  const advice = [];
  
  // Age-based advice
  if (development.currentAge < 23) {
    advice.push(`${player.name} is young (${development.currentAge}) - focus on intensive training to maximize growth potential`);
  } else if (development.currentAge > 30) {
    advice.push(`${player.name} is experienced (${development.currentAge}) - maintain fitness and consider mentoring role`);
  }
  
  // Development trend advice
  const futureOverall = development.predictions[development.predictions.length - 1].overall;
  const currentOverall = Math.round((player.speed + player.stamina) / 2);
  
  if (futureOverall > currentOverall + 5) {
    advice.push(`Strong development potential - overall rating could improve by ${futureOverall - currentOverall} points`);
  } else if (futureOverall < currentOverall - 5) {
    advice.push(`Consider rotation strategy - attributes may decline by ${currentOverall - futureOverall} points`);
  }
  
  // Position change advice
  if (positionChanges.length > 0 && positionChanges[0].feasibility === "High") {
    const topChange = positionChanges[0];
    advice.push(`Consider transition to ${topChange.newPosition} - ${topChange.description.toLowerCase()}`);
  }
  
  // Specific attribute advice
  if (player.speed < player.stamina - 15) {
    advice.push("Focus on speed training to balance attributes");
  } else if (player.stamina < player.speed - 15) {
    advice.push("Prioritize stamina work to improve endurance");
  }
  
  return advice;
}

// Calculate team development potential
export function analyzeTeamDevelopment(club) {
  const players = club.players || [];
  const teamAnalysis = {
    youngTalents: [],
    peakPlayers: [],
    veteranPlayers: [],
    positionChangeCandidates: [],
    overallTrend: "stable"
  };
  
  let totalCurrentRating = 0;
  let totalFutureRating = 0;
  
  players.forEach(player => {
    const development = predictPlayerDevelopment(player);
    const currentRating = Math.round((player.speed + player.stamina) / 2);
    const futureRating = development.predictions[2]?.overall || currentRating; // 3 years ahead
    
    totalCurrentRating += currentRating;
    totalFutureRating += futureRating;
    
    if (development.currentAge < 23) {
      teamAnalysis.youngTalents.push({
        ...player,
        potential: futureRating - currentRating
      });
    } else if (development.currentAge > 30) {
      teamAnalysis.veteranPlayers.push({
        ...player,
        decline: currentRating - futureRating
      });
    } else {
      teamAnalysis.peakPlayers.push(player);
    }
    
    // Check for position change candidates
    const positionChanges = analyzePositionChange(player);
    if (positionChanges.length > 0 && positionChanges[0].feasibility === "High") {
      teamAnalysis.positionChangeCandidates.push({
        player,
        recommendation: positionChanges[0]
      });
    }
  });
  
  // Determine overall team trend
  const avgFutureChange = (totalFutureRating - totalCurrentRating) / players.length;
  if (avgFutureChange > 2) teamAnalysis.overallTrend = "improving";
  else if (avgFutureChange < -2) teamAnalysis.overallTrend = "declining";
  
  return teamAnalysis;
}

// AI TRAINING RECOMMENDATIONS SYSTEM

// Simple training drills for players
const TRAINING_DRILLS = {
  speed: [
    { name: "Sprint Practice", description: "Run fast 10 times, rest 90 seconds", difficulty: "Medium", duration: "45min" },
    { name: "Speed Steps", description: "Quick feet ladder training", difficulty: "Easy", duration: "20min" },
    { name: "Hill Running", description: "Run uphill 8 times to get faster", difficulty: "Hard", duration: "30min" },
    { name: "Back and Forth Runs", description: "Run between cones quickly", difficulty: "Medium", duration: "25min" }
  ],
  stamina: [
    { name: "Long Run", description: "Steady running for 5-8km", difficulty: "Medium", duration: "60min" },
    { name: "Run and Rest", description: "Fast running with short breaks", difficulty: "Hard", duration: "45min" },
    { name: "Mixed Speed Running", description: "Change pace while running", difficulty: "Medium", duration: "40min" },
    { name: "Goal to Goal Runs", description: "Run from goal to goal many times", difficulty: "Easy", duration: "30min" }
  ],
  technical: [
    { name: "Ball Control", description: "Keep ball up with feet", difficulty: "Easy", duration: "15min" },
    { name: "Passing Practice", description: "Pass ball short and long", difficulty: "Medium", duration: "30min" },
    { name: "Dribbling Drills", description: "Move ball around cones", difficulty: "Medium", duration: "25min" },
    { name: "Shooting Practice", description: "Kick ball at goal from different spots", difficulty: "Hard", duration: "35min" }
  ],
  recovery: [
    { name: "Easy Jog", description: "Slow easy running", difficulty: "Easy", duration: "20min" },
    { name: "Stretching", description: "Stretch all muscles gently", difficulty: "Easy", duration: "30min" },
    { name: "Pool Time", description: "Easy swimming or walking in water", difficulty: "Easy", duration: "45min" },
    { name: "Yoga", description: "Gentle stretching and breathing", difficulty: "Easy", duration: "60min" }
  ]
};

// Generate personalized training recommendations
export function generateTrainingPlan(player, trainingHistory = []) {
  const recommendations = [];
  
  // Analyze player's weaknesses
  const speedDeficit = Math.max(0, 75 - player.speed);
  const staminaDeficit = Math.max(0, 75 - player.stamina);
  
  // Recent training load (simulate training frequency)
  const recentSessions = trainingHistory.filter(session => 
    Date.now() - new Date(session.date).getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days
  ).length;
  
  // Speed training recommendations
  if (speedDeficit > 15) {
    const speedDrills = TRAINING_DRILLS.speed.slice(0, 2);
    recommendations.push({
      category: "Get Faster",
      priority: "High",
      reason: `Speed is ${player.speed}/100 - need to run faster`,
      drills: speedDrills,
      frequency: "3 times a week",
      color: "from-yellow-400 to-orange-500"
    });
  } else if (speedDeficit > 5) {
    recommendations.push({
      category: "Stay Fast", 
      priority: "Medium",
      reason: `Speed is ${player.speed}/100 - keep it good`,
      drills: TRAINING_DRILLS.speed.slice(0, 1),
      frequency: "2 times a week",
      color: "from-blue-400 to-blue-600"
    });
  }
  
  // Stamina training recommendations
  if (staminaDeficit > 15) {
    const staminaDrills = TRAINING_DRILLS.stamina.slice(0, 2);
    recommendations.push({
      category: "Build Fitness",
      priority: "High", 
      reason: `Stamina is ${player.stamina}/100 - need more energy`,
      drills: staminaDrills,
      frequency: "4 times a week",
      color: "from-green-400 to-green-600"
    });
  } else if (staminaDeficit > 5) {
    recommendations.push({
      category: "Keep Fit",
      priority: "Medium",
      reason: `Stamina is ${player.stamina}/100 - keep it good`,
      drills: TRAINING_DRILLS.stamina.slice(0, 1), 
      frequency: "2 times a week",
      color: "from-emerald-400 to-emerald-600"
    });
  }
  
  // Recovery recommendations based on training load
  if (recentSessions > 5) {
    recommendations.push({
      category: "Rest Time",
      priority: "High",
      reason: `Trained ${recentSessions} times this week - body needs rest`,
      drills: TRAINING_DRILLS.recovery.slice(0, 2),
      frequency: "Every day",
      color: "from-purple-400 to-purple-600"
    });
  }
  
  // Technical training for all players
  recommendations.push({
    category: "Ball Skills",
    priority: "Medium",
    reason: "Always practice with the ball",
    drills: TRAINING_DRILLS.technical.slice(0, 2),
    frequency: "3 times a week",
    color: "from-indigo-400 to-indigo-600"
  });
  
  return recommendations.slice(0, 4); // Top 4 recommendations
}

// AI INJURY PREVENTION SYSTEM

// Injury risk factors and thresholds
const INJURY_RISK_FACTORS = {
  age: { low: 25, medium: 30, high: 35 },
  workload: { low: 3, medium: 6, high: 8 }, // sessions per week
  fatigue: { low: 20, medium: 40, high: 60 }, // fatigue percentage
  recovery: { good: 48, fair: 24, poor: 12 } // hours since last session
};

// Calculate comprehensive injury risk
export function assessInjuryRisk(player, trainingLoad = {}) {
  const currentAge = estimatePlayerAge(player);
  const riskFactors = [];
  let totalRisk = 0;
  
  // Age-based risk
  let ageRisk = 0;
  if (currentAge >= INJURY_RISK_FACTORS.age.high) {
    ageRisk = 30;
    riskFactors.push("Player is older - higher chance of getting hurt");
  } else if (currentAge >= INJURY_RISK_FACTORS.age.medium) {
    ageRisk = 15;
    riskFactors.push("Player age may cause some injury risk");
  } else if (currentAge >= INJURY_RISK_FACTORS.age.low) {
    ageRisk = 5;
  }
  
  // Training workload risk
  const sessionsPerWeek = trainingLoad.weeklyHours || 4;
  let workloadRisk = 0;
  if (sessionsPerWeek >= INJURY_RISK_FACTORS.workload.high) {
    workloadRisk = 25;
    riskFactors.push("Training too much - body is tired");
  } else if (sessionsPerWeek >= INJURY_RISK_FACTORS.workload.medium) {
    workloadRisk = 10;
    riskFactors.push("Training a lot - watch for tiredness");
  }
  
  // Fatigue and recovery risk
  const fatigueLevel = trainingLoad.fatigueScore || 20;
  let fatigueRisk = 0;
  if (fatigueLevel >= INJURY_RISK_FACTORS.fatigue.high) {
    fatigueRisk = 20;
    riskFactors.push("Player is very tired - needs rest");
  } else if (fatigueLevel >= INJURY_RISK_FACTORS.fatigue.medium) {
    fatigueRisk = 10;
    riskFactors.push("Player is getting tired");
  }
  
  // Physical attributes impact
  let physicalRisk = 0;
  if (player.stamina < 50) {
    physicalRisk += 15;
    riskFactors.push("Low fitness makes injuries more likely");
  }
  if (player.speed > 85 && currentAge > 30) {
    physicalRisk += 10;
    riskFactors.push("Fast older player - be careful");
  }
  
  totalRisk = ageRisk + workloadRisk + fatigueRisk + physicalRisk;
  
  // Determine risk level
  let riskLevel, color, recommendations;
  if (totalRisk >= 60) {
    riskLevel = "HIGH";
    color = "from-red-500 to-red-700";
    recommendations = [
      "Stop training for 2-3 days right now",
      "Go see a doctor or physio", 
      "Do only half the normal training",
      "Do lots of stretching and rest"
    ];
  } else if (totalRisk >= 30) {
    riskLevel = "MEDIUM";
    color = "from-yellow-500 to-orange-600";
    recommendations = [
      "Watch how much you train",
      "Rest more between training days",
      "Warm up and cool down properly",
      "Have some easier training days"
    ];
  } else {
    riskLevel = "LOW";
    color = "from-green-500 to-green-700"; 
    recommendations = [
      "Keep training like you are now",
      "Keep resting well after training",
      "Check fitness regularly",
      "Sleep well and eat good food"
    ];
  }
  
  return {
    riskLevel,
    riskScore: Math.min(100, totalRisk),
    riskFactors,
    recommendations,
    color,
    nextAssessment: riskLevel === "HIGH" ? "24 hours" : riskLevel === "MEDIUM" ? "3 days" : "1 week"
  };
}

// Generate team-wide injury prevention report
export function generateTeamInjuryReport(club, trainingData = {}) {
  const players = club.players || [];
  const report = {
    highRiskPlayers: [],
    mediumRiskPlayers: [],
    lowRiskPlayers: [],
    teamRecommendations: [],
    overallRiskScore: 0
  };
  
  let totalRisk = 0;
  
  players.forEach(player => {
    const playerTrainingLoad = trainingData[player.id] || {};
    const riskAssessment = assessInjuryRisk(player, playerTrainingLoad);
    
    const playerRiskData = {
      ...player,
      riskAssessment
    };
    
    if (riskAssessment.riskLevel === "HIGH") {
      report.highRiskPlayers.push(playerRiskData);
    } else if (riskAssessment.riskLevel === "MEDIUM") {
      report.mediumRiskPlayers.push(playerRiskData);  
    } else {
      report.lowRiskPlayers.push(playerRiskData);
    }
    
    totalRisk += riskAssessment.riskScore;
  });
  
  report.overallRiskScore = Math.round(totalRisk / players.length);
  
  // Team-wide recommendations
  if (report.highRiskPlayers.length > 2) {
    report.teamRecommendations.push("Multiple high-risk players - consider reducing team training intensity");
  }
  if (report.overallRiskScore > 40) {
    report.teamRecommendations.push("Team fatigue levels elevated - schedule additional recovery days");
  }
  report.teamRecommendations.push("Regular team fitness assessments recommended");
  report.teamRecommendations.push("Maintain consistent sleep and nutrition protocols");
  
  return report;
}

