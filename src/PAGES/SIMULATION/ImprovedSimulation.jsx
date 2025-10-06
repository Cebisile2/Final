import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/PROVIDERS/AuthProvider";
import { Play, Pause, Square, BarChart3, TrendingUp, Zap, Shield, Brain } from "lucide-react";
import { Line } from 'react-chartjs-2';

export default function ImprovedSimulation() {
  const { currentUser } = useAuth();
  const players = currentUser?.players || [];

  const [selectedScenario, setSelectedScenario] = useState("tactical-analysis");
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [simulationData, setSimulationData] = useState({
    time: 0,
    performance: [],
    injuryRisk: [],
    fatigue: [],
    insights: [],
  });
  const [realTimeStats, setRealTimeStats] = useState({});
  
  const intervalRef = useRef(null);

  const scenarios = {
    "tactical-analysis": {
      name: "🧠 AI Tactical Analysis",
      description: "Analyze player movement patterns and tactical decisions",
      players: 11,
      duration: 90,
      color: "from-blue-500 to-purple-600"
    },
    "injury-prediction": {
      name: "🏥 Injury Risk Assessment", 
      description: "Monitor player fatigue and injury risk in real-time",
      players: 5,
      duration: 45,
      color: "from-red-500 to-pink-600"
    },
    "performance-optimization": {
      name: "⚡ Performance Optimization",
      description: "Track player performance metrics and optimization opportunities",
      players: 8,
      duration: 60,
      color: "from-green-500 to-teal-600"
    }
  };

  const startSimulation = () => {
    if (selectedPlayers.length === 0) return;
    
    setIsRunning(true);
    setIsPaused(false);
    setSimulationData({
      time: 0,
      performance: [],
      injuryRisk: [],
      fatigue: [],
      insights: [],
    });

    intervalRef.current = setInterval(() => {
      setSimulationData(prev => {
        const newTime = prev.time + 1;
        
        // Generate realistic simulation data
        const performance = Math.random() * 100;
        const injuryRisk = Math.max(0, Math.min(100, 20 + Math.random() * 40 + Math.sin(newTime / 10) * 20));
        const fatigue = Math.min(100, newTime * 1.2 + Math.random() * 15);
        
        // Generate AI insights at intervals
        const insights = [...prev.insights];
        if (newTime % 10 === 0) {
          const insight = generateAIInsight(newTime, performance, injuryRisk, fatigue);
          insights.push(insight);
        }

        // Update real-time stats for selected players
        const newRealTimeStats = {};
        selectedPlayers.forEach(playerId => {
          const player = players.find(p => p.id === playerId);
          if (player) {
            newRealTimeStats[playerId] = {
              name: player.name,
              performance: Math.round(performance + Math.random() * 20 - 10),
              injuryRisk: Math.round(injuryRisk + Math.random() * 20 - 10),
              fatigue: Math.round(fatigue + Math.random() * 10 - 5),
              heartRate: Math.round(140 + Math.random() * 40),
              distance: Math.round(newTime * 15 + Math.random() * 100),
            };
          }
        });
        setRealTimeStats(newRealTimeStats);

        return {
          time: newTime,
          performance: [...prev.performance, performance],
          injuryRisk: [...prev.injuryRisk, injuryRisk],
          fatigue: [...prev.fatigue, fatigue],
          insights: insights.slice(-5), // Keep only last 5 insights
        };
      });
    }, 1000);
  };

  const pauseSimulation = () => {
    setIsPaused(!isPaused);
    if (isPaused) {
      startSimulation();
    } else {
      clearInterval(intervalRef.current);
    }
  };

  const stopSimulation = () => {
    setIsRunning(false);
    setIsPaused(false);
    clearInterval(intervalRef.current);
  };

  const generateAIInsight = (time, performance, injuryRisk, fatigue) => {
    const insights = [
      `⚠️ Player showing elevated injury risk (${Math.round(injuryRisk)}%) - recommend rotation`,
      `📈 Performance peak detected - optimal time for tactical changes`,
      `🔋 Fatigue levels rising (${Math.round(fatigue)}%) - consider substitution`,
      `🎯 Tactical opportunity: opponent's left flank showing weakness`,
      `💪 Player stamina holding strong - can maintain current intensity`,
      `🧠 AI suggests formation adjustment to exploit space`,
    ];
    return {
      time,
      message: insights[Math.floor(Math.random() * insights.length)]
    };
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Chart data for real-time performance
  const chartData = {
    labels: simulationData.performance.map((_, i) => `${i}s`).slice(-20),
    datasets: [
      {
        label: 'Performance %',
        data: simulationData.performance.slice(-20),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Injury Risk %',
        data: simulationData.injuryRisk.slice(-20),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Fatigue %',
        data: simulationData.fatigue.slice(-20),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true, max: 100 },
    },
    plugins: {
      legend: { position: 'top' },
    },
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          🤖 AI-Powered Training Simulation
        </h1>
        <p className="text-gray-600">Advanced analytics and real-time insights for professional training</p>
      </div>

      {/* Scenario Selection */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Select Training Scenario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Object.entries(scenarios).map(([key, scenario]) => (
              <div
                key={key}
                className={`p-4 rounded-lg cursor-pointer transition-all duration-300 ${
                  selectedScenario === key
                    ? `bg-gradient-to-r ${scenario.color} text-white shadow-lg transform scale-105`
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedScenario(key)}
              >
                <h3 className="font-bold mb-2">{scenario.name}</h3>
                <p className={`text-sm ${selectedScenario === key ? 'text-white/90' : 'text-gray-600'}`}>
                  {scenario.description}
                </p>
                <div className={`text-xs mt-2 ${selectedScenario === key ? 'text-white/80' : 'text-gray-500'}`}>
                  {scenario.players} players • {scenario.duration} minutes
                </div>
              </div>
            ))}
          </div>

          {/* Player Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Players for Simulation:</label>
            <div className="flex flex-wrap gap-2">
              {players.slice(0, scenarios[selectedScenario].players).map((player) => (
                <label key={player.id} className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm">
                  <input
                    type="checkbox"
                    checked={selectedPlayers.includes(player.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPlayers([...selectedPlayers, player.id]);
                      } else {
                        setSelectedPlayers(selectedPlayers.filter(id => id !== player.id));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">{player.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-3">
            {!isRunning ? (
              <Button 
                onClick={startSimulation} 
                disabled={selectedPlayers.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Simulation
              </Button>
            ) : (
              <>
                <Button onClick={pauseSimulation} className="bg-yellow-600 hover:bg-yellow-700">
                  <Pause className="w-4 h-4 mr-2" />
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button onClick={stopSimulation} className="bg-red-600 hover:bg-red-700">
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Simulation Display */}
      {isRunning && (
        <>
          {/* Real-time Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-8 h-8" />
                  <div>
                    <p className="text-sm opacity-90">Simulation Time</p>
                    <p className="text-2xl font-bold">{Math.floor(simulationData.time / 60)}:{(simulationData.time % 60).toString().padStart(2, '0')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8" />
                  <div>
                    <p className="text-sm opacity-90">Avg Performance</p>
                    <p className="text-2xl font-bold">
                      {simulationData.performance.length > 0 
                        ? Math.round(simulationData.performance[simulationData.performance.length - 1])
                        : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8" />
                  <div>
                    <p className="text-sm opacity-90">Injury Risk</p>
                    <p className="text-2xl font-bold">
                      {simulationData.injuryRisk.length > 0 
                        ? Math.round(simulationData.injuryRisk[simulationData.injuryRisk.length - 1])
                        : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Zap className="w-8 h-8" />
                  <div>
                    <p className="text-sm opacity-90">Team Energy</p>
                    <p className="text-2xl font-bold">
                      {simulationData.fatigue.length > 0 
                        ? Math.round(100 - simulationData.fatigue[simulationData.fatigue.length - 1])
                        : 100}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts and Player Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Real-time Performance Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ height: '300px' }}>
                  <Line data={chartData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>

            {/* Player Individual Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Individual Player Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {Object.values(realTimeStats).map((player, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-lg mb-2">{player.name}</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Performance:</span>
                          <span className="font-bold ml-1">{player.performance}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Heart Rate:</span>
                          <span className="font-bold ml-1">{player.heartRate} bpm</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Distance:</span>
                          <span className="font-bold ml-1">{player.distance}m</span>
                        </div>
                        <div>
                          <span className="text-red-600">Injury Risk:</span>
                          <span className="font-bold ml-1">{player.injuryRisk}%</span>
                        </div>
                        <div>
                          <span className="text-orange-600">Fatigue:</span>
                          <span className="font-bold ml-1">{player.fatigue}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Coach Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {simulationData.insights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-3 p-2 bg-blue-50 rounded-lg">
                    <div className="text-xs text-blue-600 font-mono">{Math.floor(insight.time / 60)}:{(insight.time % 60).toString().padStart(2, '0')}</div>
                    <div className="text-sm text-blue-800">{insight.message}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}