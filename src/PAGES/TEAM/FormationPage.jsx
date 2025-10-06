import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/PROVIDERS/AuthProvider";
import { db } from "@/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { 
  recommendOptimalFormation, 
  analyzeSquad
} from "@/lib/trainingModel";
import { Brain, TrendingUp, Lightbulb } from "lucide-react";

const formationTemplates = [
  {
    name: "2-1-1",
    spots: [
      { label: "GK", x: 50, y: 90 },
      { label: "DEF1", x: 35, y: 65 },
      { label: "DEF2", x: 65, y: 65 },
      { label: "MID", x: 50, y: 45 },
      { label: "FWD", x: 50, y: 25 },
    ],
  },
  {
    name: "1-2-1",
    spots: [
      { label: "GK", x: 50, y: 90 },
      { label: "DEF", x: 50, y: 70 },
      { label: "MID1", x: 35, y: 50 },
      { label: "MID2", x: 65, y: 50 },
      { label: "FWD", x: 50, y: 30 },
    ],
  },
  {
    name: "3-1",
    spots: [
      { label: "GK", x: 50, y: 90 },
      { label: "DEF1", x: 25, y: 65 },
      { label: "DEF2", x: 50, y: 65 },
      { label: "DEF3", x: 75, y: 65 },
      { label: "FWD", x: 50, y: 35 },
    ],
  },
];



export default function ManageFormationPage() {
  const { currentUser } = useAuth();
  const [selectedFormation, setSelectedFormation] = useState(
    formationTemplates[0]
  );
  const [assignments, setAssignments] = useState({}); // spot label => playerId
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [showAI, setShowAI] = useState(false);

  // 🔥 Load saved formation on page load
  useEffect(() => {
    const loadFormation = async () => {
      if (!currentUser) return;

      const docRef = doc(db, "clubs", currentUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const savedFormation = data.formation;


        if (savedFormation) {
          // Find the template that matches the saved formation name
          const template = formationTemplates?.find(
            (f) => f.name === savedFormation.name
          );

          if (template) {
            setSelectedFormation(template);

            // Convert saved player assignments into { spotLabel: playerId }
            const savedAssignments = {};
            savedFormation.spots.forEach((spot) => {
              if (spot.playerId) {
                savedAssignments[spot.label] = spot.playerId;
              }
            });

            setAssignments(savedAssignments);
          }
        }
      }
    };

    loadFormation();
  }, [currentUser]);

  const handleAssign = (playerId) => {
    if (!selectedSpot) return;
    setAssignments((prev) => ({ ...prev, [selectedSpot]: playerId }));
    setSelectedSpot(null);
  };

  const handleSaveFormation = async () => {
    const packedFormation = {
      name: selectedFormation.name,
      spots: selectedFormation.spots.map((spot) => ({
        label: spot.label,
        x: spot.x,
        y: spot.y,
        playerId: assignments[spot.label] || null,
      })),
    };

    console.log("Formation to save:", packedFormation);

    await updateDoc(doc(db, "clubs", currentUser.uid), {
      formation: packedFormation,
    });
    alert("Formation saved successfully!");
  };

  // AI Formation Analysis
  const analyzeWithAI = () => {
    if (!currentUser?.players) return;
    
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
    const squadAnalysis = analyzeSquad(clubData);
    
    setAiRecommendations({
      formations: recommendations.slice(0, 3), // Top 3 recommendations
      analysis: squadAnalysis
    });
    setShowAI(true);
  };


  return (
    <div className="p-4 space-y-4">
      {/* Header with AI Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Formation Manager</h1>
        <Button 
          onClick={analyzeWithAI} 
          className="flex items-center gap-2"
          variant="outline"
        >
          <Brain className="w-4 h-4" />
          AI Formation Analyzer
        </Button>
      </div>

      {/* AI Recommendations Panel */}
      {showAI && aiRecommendations && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />
              AI Formation Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Squad Analysis */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <TrendingUp className="w-4 h-4 mx-auto mb-1 text-green-600" />
                <p className="font-semibold">Team Speed</p>
                <p>{Math.round(aiRecommendations.analysis.teamStats.avgSpeed)}/100</p>
              </div>
              <div className="text-center">
                <TrendingUp className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                <p className="font-semibold">Team Stamina</p>
                <p>{Math.round(aiRecommendations.analysis.teamStats.avgStamina)}/100</p>
              </div>
              <div className="text-center">
                <TrendingUp className="w-4 h-4 mx-auto mb-1 text-purple-600" />
                <p className="font-semibold">Team Fitness</p>
                <p>{Math.round(aiRecommendations.analysis.teamStats.teamFitness)}/100</p>
              </div>
              <div className="text-center">
                <p className="font-semibold">Squad Size</p>
                <p>{aiRecommendations.analysis.teamStats.totalPlayers} players</p>
              </div>
            </div>

            {/* Top 3 Formation Recommendations */}
            <div className="space-y-2">
              <h3 className="font-semibold">Recommended Formations:</h3>
              {aiRecommendations.formations.map((rec, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div>
                    <span className="font-semibold">{rec.formation.name}</span>
                    <span className="ml-2 text-sm text-gray-600">
                      Score: {rec.score} | Style: {rec.formation.style}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      {rec.reasons.join(", ")}
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      // Convert AI formation to our template format
                      const aiTemplate = {
                        name: rec.formation.name,
                        spots: rec.formation.positions.map((pos, idx) => ({
                          label: `${pos.role.substring(0,3).toUpperCase()}${idx+1}`,
                          x: pos.x,
                          y: pos.y
                        }))
                      };
                      
                      setSelectedFormation(aiTemplate);
                      setAssignments({});
                      setShowAI(false);
                    }}
                    disabled={rec.score < 0}
                  >
                    Use Formation
                  </Button>
                </div>
              ))}
            </div>

            <Button variant="outline" onClick={() => setShowAI(false)}>
              Close AI Analysis
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Formation Templates */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Select Formation</h2>
        <div className="flex gap-3">
          {formationTemplates.map((formation) => (
            <Button
              key={formation.name}
              variant={
                selectedFormation.name === formation.name
                  ? "default"
                  : "secondary"
              }
              onClick={() => {
                setSelectedFormation(formation);
                setAssignments({}); // Reset assignments when changing formation
              }}
            >
              {formation.name}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Soccer Field */}
      <div className="relative w-full max-w-3xl h-[500px] mx-auto rounded-lg border border-green-700 bg-green-900 shadow-inner overflow-hidden">
        {/* Field lines */}
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-green-200 opacity-50" />
        <div className="absolute left-1/2 top-1/2 w-28 h-28 border-2 border-green-200 rounded-full opacity-50 transform -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute left-[25%] top-0 w-[50%] h-12 border-2 border-green-200 opacity-50 rounded-b-md" />
        <div className="absolute left-[25%] bottom-0 w-[50%] h-12 border-2 border-green-200 opacity-50 rounded-t-md" />

        {(selectedFormation?.spots || formationTemplates[0].spots).map(
          (spot) => {
            const playerId = assignments[spot.label];
            const player = currentUser?.players?.find((p) => p.id === playerId);

            return (
              <div
                key={spot.label}
                className={`absolute flex flex-col items-center cursor-pointer ${
                  selectedSpot === spot.label ? "ring-2 ring-yellow-400" : ""
                }`}
                style={{
                  left: `${spot.x}%`,
                  top: `${spot.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
                onClick={() => setSelectedSpot(spot.label)}
              >
                <Card
                  className={`p-2 text-center w-[100px] ${
                    player ? "bg-white" : "bg-gray-700"
                  }`}
                >
                  <strong>{spot.label}</strong>
                  <p className="text-sm">
                    {player ? player.name : "Tap to assign"}
                  </p>
                </Card>
              </div>
            );
          }
        )}
      </div>

      {/* Player list */}
      <div className="mt-4 space-y-2">
        <h2 className="text-lg font-semibold">Available Players</h2>
        <div className="flex gap-2 flex-wrap">
          {currentUser?.players?.map((p) => (
            <Button
              key={p.id}
              variant="outline"
              onClick={() => handleAssign(p.id)}
              disabled={Object.values(assignments).includes(p.id)}
            >
              {p.name}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Save */}
      <Button className="w-full" onClick={handleSaveFormation}>
        Save Formation
      </Button>
    </div>
  );
}
