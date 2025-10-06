import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, TrendingUp, RotateCcw, Brain } from "lucide-react";
import AddPlayer from "./addPlayer";
import AddMultiplePlayers from "@/components/AddMultiplePlayers";
import { useAuth } from "@/PROVIDERS/AuthProvider";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { 
  predictPlayerDevelopment, 
  analyzePositionChange, 
  generateDevelopmentAdvice 
} from "@/lib/trainingModel";

export default function AllPlayersPage() {
  const {currentUser} = useAuth()
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showDevelopment, setShowDevelopment] = useState(false);

  const handleDeletePlayer = async (playerId) => {
    if (!window.confirm("Are you sure you want to delete this player?")) {
      return;
    }

    try {
      const updatedPlayers = currentUser.players.filter(p => p.id !== playerId);
      const clubRef = doc(db, "clubs", currentUser.uid);
      
      await updateDoc(clubRef, {
        players: updatedPlayers
      });
      
      // The AuthProvider will automatically update the currentUser state
      alert("Player deleted successfully!");
    } catch (error) {
      console.error("Error deleting player:", error);
      alert("Failed to delete player. Please try again.");
    }
  };

  // Get colorful background based on player position
  const getPlayerCardStyle = (position) => {
    const styles = {
      Goalkeeper: "bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500",
      Defender: "bg-gradient-to-br from-blue-400 via-blue-600 to-indigo-700", 
      Midfielder: "bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600",
      Forward: "bg-gradient-to-br from-purple-400 via-pink-500 to-red-500",
      Striker: "bg-gradient-to-br from-purple-400 via-pink-500 to-red-500"
    };
    return styles[position] || "bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600";
  };

  const showPlayerDevelopment = (player) => {
    setSelectedPlayer(player);
    setShowDevelopment(true);
  };

  const renderDevelopmentModal = () => {
    if (!selectedPlayer || !showDevelopment) return null;

    const development = predictPlayerDevelopment(selectedPlayer);
    const positionChanges = analyzePositionChange(selectedPlayer);
    const advice = generateDevelopmentAdvice(selectedPlayer);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-white via-blue-50 to-purple-50 rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-white/50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              🚀 {selectedPlayer.name} - Development Analysis
            </h2>
            <Button 
              className="bg-gradient-to-r from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white rounded-xl"
              onClick={() => setShowDevelopment(false)}
            >
              ✕ Close
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Development Prediction Chart */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                  📈 3-Year Development Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    Current Age: {development.currentAge} | Peak Year: Year {development.peakYear}
                  </div>
                  
                  {development.predictions.map((pred, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="font-semibold">Year {pred.year} (Age {pred.age})</span>
                      <div className="flex gap-4 text-sm">
                        <span>Speed: {pred.speed}</span>
                        <span>Stamina: {pred.stamina}</span>
                        <span className="font-semibold">Overall: {pred.overall}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Position Change Recommendations */}
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 border-2 border-blue-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <RotateCcw className="w-6 h-6 text-blue-600" />
                  🔄 Position Change Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {positionChanges.length > 0 ? (
                  <div className="space-y-3">
                    {positionChanges.map((change, idx) => (
                      <div key={idx} className="p-3 border rounded">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold">
                            {change.currentPosition} → {change.newPosition}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            change.feasibility === 'High' ? 'bg-green-100 text-green-800' :
                            change.feasibility === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {change.feasibility}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{change.description}</p>
                        <div className="text-xs text-gray-500">
                          {change.reasons.join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No position changes recommended at this time.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Development Advice */}
          <Card className="mt-6 bg-gradient-to-br from-purple-50 to-pink-100 border-2 border-purple-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800">
                <Brain className="w-6 h-6 text-purple-600" />
                🤖 AI Development Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {advice.map((tip, idx) => (
                  <div key={idx} className="p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl border-l-4 border-purple-400 shadow-sm">
                    <p className="text-sm font-medium text-purple-900">{tip}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 min-h-screen">
      {/* Header Section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">🌟 Team Players</h1>
        <p className="text-gray-600 mb-4">Manage your squad with colorful player profiles</p>
        <div className="flex justify-center gap-4 flex-wrap">
          <AddPlayer user={currentUser} />
          <AddMultiplePlayers user={currentUser} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {(currentUser?.players || []).map((player, index) => (
          <div
            key={player.id || index}
            className={`relative ${getPlayerCardStyle(player.position)} rounded-2xl shadow-2xl p-4 flex flex-col items-center text-center transform hover:scale-105 transition-all duration-300 border-2 border-white/20`}
          >
            {/* Action Buttons */}
            <div className="absolute top-3 right-3 flex gap-1">
              <Button
                size="sm"
                className="w-9 h-9 p-0 bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 shadow-lg backdrop-blur-sm"
                onClick={() => showPlayerDevelopment(player)}
              >
                <TrendingUp className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                className="w-9 h-9 p-0 bg-red-500/90 hover:bg-red-600 text-white shadow-lg backdrop-blur-sm"
                onClick={() => handleDeletePlayer(player.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Player image */}
            <div className="mb-4">
              <img
                src={player.image}
                alt={player.name}
                className="w-32 h-32 rounded-full border-4 border-white shadow-2xl object-cover ring-4 ring-white/30"
              />
            </div>

            {/* Player name & position */}
            <div className="mb-3">
              <h2 className="font-bold text-xl text-white drop-shadow-lg">{player.name}</h2>
              <p className="text-white/90 font-medium bg-black/20 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                {player.position}
              </p>
            </div>

            {/* Stats */}
            <div className="mt-auto space-y-2 text-sm w-full">
              <div className="flex justify-between items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                <span className="font-semibold text-white">⚡ Speed:</span>
                <span className="font-bold text-white bg-black/30 px-2 py-1 rounded">{player.speed}</span>
              </div>
              <div className="flex justify-between items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                <span className="font-semibold text-white">💪 Stamina:</span>
                <span className="font-bold text-white bg-black/30 px-2 py-1 rounded">{player.stamina}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {renderDevelopmentModal()}
    </div>
  );
}
