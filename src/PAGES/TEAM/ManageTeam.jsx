import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Eye, Users, Trophy, Zap, Shield, TrendingUp, Star } from "lucide-react";
import FormationPreview from "./FormationComponent";
import { Link } from "react-router";
import AddPlayer from "../PLAYERS/addPlayer";
import { useAuth } from "@/PROVIDERS/AuthProvider";

export default function ManageTeam() {
  const { currentUser } = useAuth();

  const playersToShow = currentUser?.players
    ? [...currentUser.players].sort(() => 0.5 - Math.random()).slice(0, 6)
    : [];

  const getPositionGradient = (position) => {
    switch (position?.toLowerCase()) {
      case 'goalkeeper': return 'from-yellow-400 via-orange-500 to-red-500';
      case 'defender': return 'from-blue-400 via-blue-600 to-indigo-700';
      case 'midfielder': return 'from-green-400 via-emerald-500 to-teal-600';
      case 'forward': return 'from-purple-400 via-pink-500 to-red-500';
      default: return 'from-gray-400 via-gray-500 to-gray-600';
    }
  };

  const getPositionIcon = (position) => {
    switch (position?.toLowerCase()) {
      case 'goalkeeper': return '🥅';
      case 'defender': return '🛡️';
      case 'midfielder': return '⚽';
      case 'forward': return '⚡';
      default: return '👤';
    }
  };

  const totalPlayers = currentUser?.players?.length || 0;
  const avgSpeed = totalPlayers > 0 ? Math.round(currentUser.players.reduce((sum, p) => sum + (p.speed || 0), 0) / totalPlayers) : 0;
  const avgStamina = totalPlayers > 0 ? Math.round(currentUser.players.reduce((sum, p) => sum + (p.stamina || 0), 0) / totalPlayers) : 0;

  return (
    <div className="p-6 space-y-8 bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
      {/* Beautiful Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
          🏆 Team Management
        </h1>
        <p className="text-xl text-gray-600 mb-6">Build and manage your dream team</p>
        <div className="flex justify-center space-x-1 mb-6">
          <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
          <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
          <div className="w-3 h-3 bg-pink-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-green-500 to-emerald-700 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-white text-lg">
              <Users className="w-6 h-6" /> Squad Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalPlayers}</div>
            <p className="text-green-100 text-sm">Total Players</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-white text-lg">
              <Zap className="w-6 h-6" /> Team Speed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgSpeed}</div>
            <p className="text-yellow-100 text-sm">Average Speed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-white text-lg">
              <Shield className="w-6 h-6" /> Team Stamina
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgStamina}</div>
            <p className="text-purple-100 text-sm">Average Stamina</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        <AddPlayer user={currentUser} />
        <Link to="/players">
          <Button className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white shadow-lg transform hover:scale-105 transition-all duration-300">
            <Eye className="w-4 h-4 mr-2" /> 👥 View All Players
          </Button>
        </Link>
        <Link to="/formations">
          <Button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg transform hover:scale-105 transition-all duration-300">
            <Trophy className="w-4 h-4 mr-2" /> 🧠 AI Formation Optimizer
          </Button>
        </Link>
      </div>

      {/* Featured Players */}
      {totalPlayers > 0 ? (
        <Card className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800 text-2xl">
              <Star className="w-8 h-8" /> ⭐ Featured Players
            </CardTitle>
            <p className="text-blue-600">Your top squad members</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {playersToShow.map((player, index) => (
                <Card
                  key={index}
                  className={`bg-gradient-to-br ${getPositionGradient(player.position)} text-white shadow-xl transform hover:scale-105 transition-all duration-300 overflow-hidden`}
                >
                  <div className="relative">
                    <div className="h-48 w-full overflow-hidden">
                      <img
                        src={player.image}
                        alt={player.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full p-2">
                      <span className="text-2xl">{getPositionIcon(player.position)}</span>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <h3 className="text-xl font-bold mb-1">{player.name}</h3>
                    <p className="text-white/80 text-sm mb-3 font-medium">{player.position}</p>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 text-center">
                        <div className="text-lg font-bold">{player.speed}</div>
                        <div className="text-white/80 text-xs">Speed</div>
                      </div>
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 text-center">
                        <div className="text-lg font-bold">{player.stamina}</div>
                        <div className="text-white/80 text-xs">Stamina</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 shadow-xl">
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">⚽</div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">No Players Yet!</h3>
            <p className="text-gray-500 mb-6">Start building your dream team by adding your first player</p>
            <AddPlayer user={currentUser} />
          </CardContent>
        </Card>
      )}

      {/* Formation Preview */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800 text-2xl">
            <Trophy className="w-8 h-8" /> 🔄 Current Formation
          </CardTitle>
          <p className="text-green-600">Your team setup and tactics</p>
        </CardHeader>
        <CardContent>
          <FormationPreview formation={currentUser?.formation} />
        </CardContent>
      </Card>
    </div>
  );
}
