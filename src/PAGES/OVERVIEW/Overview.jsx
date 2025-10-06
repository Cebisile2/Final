import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, RefreshCcw, BarChart3, Lightbulb, Brain, TrendingUp, Shield, Target, Zap } from "lucide-react"
import { useAuth } from "@/PROVIDERS/AuthProvider"
import { recommendOptimalFormation, analyzeSquad } from "@/lib/trainingModel"
import { Link } from "react-router-dom"
import { InjuryRiskChart, WorkloadChart, TeamOverviewChart, PositionAnalysisChart, PerformanceTrendChart } from "@/components/Charts"

export default function Overview() {
  const { currentUser } = useAuth();
  const [aiInsight, setAiInsight] = useState("");
  const [teamStats, setTeamStats] = useState(null);

  useEffect(() => {
    if (currentUser?.players && currentUser.players.length > 0) {
      const clubData = {
        players: currentUser.players.map(p => ({
          id: p.id,
          name: p.name,
          role: p.role || "Midfielder", 
          speed: p.speed || 50,
          stamina: p.stamina || 50
        }))
      };
      
      const recommendations = recommendOptimalFormation(clubData);
      const analysis = analyzeSquad(clubData);
      
      setTeamStats(analysis);
      
      if (recommendations.length > 0) {
        const topRec = recommendations[0];
        setAiInsight(`Try ${topRec.formation.name} formation - ${topRec.reasons[0] || 'good fit for your squad!'}`);
      }
    }
  }, [currentUser]);

  const totalPlayers = currentUser?.players?.length || 0;

  return (
    <div className="p-6 space-y-8 bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
      {/* Beautiful Welcome Header */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
          🏆 Welcome, Coach!
        </h1>
        <p className="text-xl text-gray-600 mb-6">Your AI-powered team management dashboard</p>
        <div className="flex justify-center space-x-1 mb-6">
          <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
          <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
          <div className="w-3 h-3 bg-pink-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
        </div>
      </div>

      {/* Colorful Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-2xl transform hover:scale-105 transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-white">
              <Users className="w-8 h-8" /> 
              <div>
                <div className="text-sm opacity-90">Total Players</div>
                <div className="text-3xl font-bold">{totalPlayers}</div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-100 text-sm">Your squad size</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500 to-emerald-700 text-white shadow-2xl transform hover:scale-105 transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-white">
              <TrendingUp className="w-8 h-8" /> 
              <div>
                <div className="text-sm opacity-90">Team Fitness</div>
                <div className="text-3xl font-bold">{teamStats ? Math.round(teamStats.teamStats.teamFitness) : '0'}</div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-100 text-sm">Average team fitness</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white shadow-2xl transform hover:scale-105 transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-white">
              <Zap className="w-8 h-8" /> 
              <div>
                <div className="text-sm opacity-90">Team Speed</div>
                <div className="text-3xl font-bold">{teamStats ? Math.round(teamStats.teamStats.avgSpeed) : '0'}</div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-100 text-sm">Average team speed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-2xl transform hover:scale-105 transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-white">
              <Shield className="w-8 h-8" /> 
              <div>
                <div className="text-sm opacity-90">Team Stamina</div>
                <div className="text-3xl font-bold">{teamStats ? Math.round(teamStats.teamStats.avgStamina) : '0'}</div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-purple-100 text-sm">Average team stamina</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-100 border-2 border-indigo-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-800">
              <Target className="w-6 h-6" /> ⚡ Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/players">
              <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white mb-2">
                <Users className="w-4 h-4 mr-2" />
                👥 Manage Players
              </Button>
            </Link>
            <Link to="/formations">
              <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white mb-2">
                <Brain className="w-4 h-4 mr-2" />
                🧠 AI Formation Optimizer  
              </Button>
            </Link>
            <Link to="/training">
              <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white">
                <Shield className="w-4 h-4 mr-2" />
                🎯 AI Training Plans
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 border-2 border-blue-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Brain className="w-6 h-6" /> 🤖 AI Coach Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalPlayers > 0 ? (
              <div className="space-y-4">
                <div className="bg-white/60 p-4 rounded-lg">
                  <p className="font-semibold text-blue-900 mb-2">Formation Tip:</p>
                  <p className="text-sm text-blue-800">{aiInsight}</p>
                </div>
                <div className="text-xs text-blue-600 space-y-1">
                  <p>• Check injury risk in Training page</p>
                  <p>• View player development predictions</p>
                  <p>• Get personalized training plans</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-blue-700 mb-4">Add players to get AI recommendations!</p>
                <Link to="/players">
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                    ✨ Add Your First Player
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Analytics Dashboard */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            🤖 AI-Powered Analytics Dashboard
          </h2>
          <p className="text-gray-600">Professional-grade data insights for your team</p>
        </div>

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InjuryRiskChart />
          <TeamOverviewChart />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WorkloadChart />
          <PositionAnalysisChart />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <PerformanceTrendChart />
        </div>
      </div>

      {/* Team Activity Feed */}
      {totalPlayers > 0 && (
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <BarChart3 className="w-6 h-6" /> 📊 Team Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Players added to squad: <strong>{totalPlayers}</strong></span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm">AI recommendations ready: <strong>Formation analysis</strong></span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm">Training plans available: <strong>Personalized drills</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

   </div>
  )
}