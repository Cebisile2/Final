import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, RefreshCcw, Sparkles, Brain, Shield, Target, AlertTriangle, CheckCircle, Clock, Zap } from "lucide-react";
import { useAuth } from "@/PROVIDERS/AuthProvider";
import {
  normalizeClub,
  generateTrainingPlan,
  assessInjuryRisk,
  generateTeamInjuryReport
} from "@/lib/trainingModel";
import InjuryPredictionForm from "@/components/InjuryPredictionForm";

export default function TrainingPage() {
  const { currentUser } = useAuth();
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showTrainingPlan, setShowTrainingPlan] = useState(false);
  const [showInjuryReport, setShowInjuryReport] = useState(false);
  const [activeTab, setActiveTab] = useState("players");
  
  const club = useMemo(() => normalizeClub(currentUser), [currentUser]);

  if (!club || !club.players || club.players.length === 0) {
    return (
      <div className="p-6 bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">🏃 AI Training Center</h1>
          <p className="text-gray-600">Add players to access AI training recommendations and injury prevention</p>
          <Link to="/players">
            <Button className="mt-4 bg-gradient-to-r from-blue-500 to-purple-600">
              Add Players
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const teamInjuryReport = generateTeamInjuryReport(club);

  const showPlayerTraining = (player) => {
    setSelectedPlayer(player);
    setShowTrainingPlan(true);
  };

  const showTeamInjuryReport = () => {
    setShowInjuryReport(true);
  };

  const renderTrainingModal = () => {
    if (!selectedPlayer || !showTrainingPlan) return null;

    const trainingPlan = generateTrainingPlan(selectedPlayer);
    const injuryRisk = assessInjuryRisk(selectedPlayer);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-white via-blue-50 to-purple-50 rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              🎯 {selectedPlayer.name} - AI Training Plan
            </h2>
            <Button 
              className="bg-gradient-to-r from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white rounded-xl"
              onClick={() => setShowTrainingPlan(false)}
            >
              ✕ Close
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Injury Risk Assessment */}
            <Card className={`bg-gradient-to-br ${injuryRisk.color.replace('from-', 'from-').replace('to-', 'to-')}/10 border-2 shadow-lg`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-6 h-6" />
                  🩺 Injury Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className={`inline-block px-4 py-2 rounded-full text-white font-bold bg-gradient-to-r ${injuryRisk.color}`}>
                    {injuryRisk.riskLevel} RISK ({injuryRisk.riskScore}%)
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Risk Factors:</h4>
                  {injuryRisk.riskFactors.map((factor, idx) => (
                    <p key={idx} className="text-sm text-gray-600">• {factor}</p>
                  ))}
                </div>
                <div className="mt-4">
                  <h4 className="font-semibold">Recommendations:</h4>
                  <div className="space-y-1 mt-2">
                    {injuryRisk.recommendations.map((rec, idx) => (
                      <p key={idx} className="text-sm bg-white/50 p-2 rounded">• {rec}</p>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Training Plan */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <Brain className="w-6 h-6" />
                  🧠 AI Training Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trainingPlan.map((plan, idx) => (
                    <div key={idx} className={`p-4 rounded-xl bg-gradient-to-r ${plan.color}/10 border border-current/20`}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-sm">{plan.category}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          plan.priority === 'High' ? 'bg-red-100 text-red-800' :
                          plan.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {plan.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{plan.reason}</p>
                      <div className="text-xs text-gray-500 mb-2">Frequency: {plan.frequency}</div>
                      <div className="space-y-1">
                        {plan.drills.map((drill, drillIdx) => (
                          <div key={drillIdx} className="bg-white/50 p-2 rounded text-xs">
                            <div className="font-semibold">{drill.name}</div>
                            <div className="text-gray-600">{drill.description}</div>
                            <div className="flex gap-2 mt-1">
                              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{drill.difficulty}</span>
                              <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded">{drill.duration}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">🏃 AI Training Center</h1>
        <p className="text-gray-600 mb-4">Advanced training recommendations and injury prevention</p>
        <div className="flex justify-center gap-4">
          <Button 
            onClick={showTeamInjuryReport}
            className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white"
          >
            <Shield className="w-4 h-4 mr-2" />
            🩺 Team Injury Report
          </Button>
          <Link to="/simulations">
            <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">
              <Zap className="w-4 h-4 mr-2" />
              ⚡ Open Simulations
            </Button>
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-6">
        <div className="bg-white rounded-lg shadow-lg p-1 inline-flex">
          <button
            onClick={() => setActiveTab("players")}
            className={`px-6 py-2 rounded-md transition-all duration-300 ${
              activeTab === "players" 
                ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg" 
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            👥 Player Training Plans
          </button>
          <button
            onClick={() => setActiveTab("prediction")}
            className={`px-6 py-2 rounded-md transition-all duration-300 ${
              activeTab === "prediction" 
                ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg" 
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            🤖 AI Injury Predictor
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "players" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {club.players.map((player) => {
          const injuryRisk = assessInjuryRisk(player);
          const trainingPlan = generateTrainingPlan(player);
          
          return (
            <Card 
              key={player.id} 
              className="bg-gradient-to-br from-white to-gray-50 border-2 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105"
              onClick={() => showPlayerTraining(player)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={player.image}
                    alt={player.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                  />
                  <div>
                    <CardTitle className="text-lg">{player.name}</CardTitle>
                    <p className="text-sm text-gray-600">{player.position}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Attributes */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="text-xs text-blue-600 font-semibold">⚡ Speed</div>
                    <div className="text-lg font-bold text-blue-800">{player.speed}</div>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <div className="text-xs text-green-600 font-semibold">💪 Stamina</div>
                    <div className="text-lg font-bold text-green-800">{player.stamina}</div>
                  </div>
                </div>

                {/* Injury Risk */}
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold">Injury Risk</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold text-white bg-gradient-to-r ${injuryRisk.color}`}>
                      {injuryRisk.riskLevel}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full bg-gradient-to-r ${injuryRisk.color}`}
                      style={{ width: `${injuryRisk.riskScore}%` }}
                    />
                  </div>
                </div>

                {/* Training Priority */}
                <div className="mb-3">
                  <span className="text-xs font-semibold">Training Focus</span>
                  <div className="mt-1">
                    {trainingPlan.slice(0, 2).map((plan, idx) => (
                      <div key={idx} className={`text-xs px-2 py-1 rounded mr-1 mb-1 inline-block bg-gradient-to-r ${plan.color}/20 text-gray-700`}>
                        {plan.category}
                      </div>
                    ))}
                  </div>
                </div>

                <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                  <Target className="w-4 h-4 mr-2" />
                  View AI Training Plan
                </Button>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {activeTab === "prediction" && (
        <InjuryPredictionForm />
      )}

      {/* Team Injury Report Modal */}
      {showInjuryReport && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-white via-red-50 to-orange-50 rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                🩺 Team Injury Prevention Report
              </h2>
              <Button 
                className="bg-gradient-to-r from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white rounded-xl"
                onClick={() => setShowInjuryReport(false)}
              >
                ✕ Close
              </Button>
            </div>

            {/* Team Overview */}
            <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Team Risk Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-red-600">{teamInjuryReport.highRiskPlayers.length}</div>
                    <div className="text-sm text-gray-600">High Risk</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{teamInjuryReport.mediumRiskPlayers.length}</div>
                    <div className="text-sm text-gray-600">Medium Risk</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{teamInjuryReport.lowRiskPlayers.length}</div>
                    <div className="text-sm text-gray-600">Low Risk</div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-semibold mb-2">Team Recommendations:</div>
                  {teamInjuryReport.teamRecommendations.map((rec, idx) => (
                    <div key={idx} className="text-sm bg-white/50 p-2 rounded mb-1">• {rec}</div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* High Risk Players */}
            {teamInjuryReport.highRiskPlayers.length > 0 && (
              <Card className="mb-4 bg-red-50 border-2 border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-800">🚨 High Risk Players</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {teamInjuryReport.highRiskPlayers.map((playerData) => (
                      <div key={playerData.id} className="bg-white p-3 rounded border-l-4 border-red-500">
                        <div className="font-semibold">{playerData.name}</div>
                        <div className="text-sm text-gray-600">{playerData.position}</div>
                        <div className="text-xs mt-2">
                          Risk Score: {playerData.riskAssessment.riskScore}%
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Medium Risk Players */}
            {teamInjuryReport.mediumRiskPlayers.length > 0 && (
              <Card className="bg-yellow-50 border-2 border-yellow-200">
                <CardHeader>
                  <CardTitle className="text-yellow-800">⚠️ Medium Risk Players</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {teamInjuryReport.mediumRiskPlayers.map((playerData) => (
                      <div key={playerData.id} className="bg-white p-3 rounded border-l-4 border-yellow-500">
                        <div className="font-semibold">{playerData.name}</div>
                        <div className="text-sm text-gray-600">{playerData.position}</div>
                        <div className="text-xs mt-2">
                          Risk Score: {playerData.riskAssessment.riskScore}%
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {renderTrainingModal()}
    </div>
  );
}

