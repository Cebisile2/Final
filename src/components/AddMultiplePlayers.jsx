import { useState } from "react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { db } from "@/firebase";

export default function AddMultiplePlayers({ user }) {
  const [adding, setAdding] = useState(false);

  const addMissingPlayers = async () => {
    if (!user?.uid) return;

    setAdding(true);

    try {
      const currentPlayerCount = user?.players?.length || 0;
      const playersToAdd = [];

      // Define positions for a balanced team
      const positions = [
        "Goalkeeper",    // Player 3
        "Defender",      // Player 4
        "Defender",      // Player 5
        "Defender",      // Player 6
        "Defender",      // Player 7
        "Midfielder",    // Player 8
        "Midfielder",    // Player 9
        "Midfielder",    // Player 10
        "Forward"        // Player 11
      ];

      // Add players from current count + 1 to 11
      for (let i = currentPlayerCount; i < 11; i++) {
        const playerNumber = i + 1;
        const position = positions[i - 2] || "Midfielder"; // Start from index 0 for player 3

        const playerData = {
          firstName: `Player`,
          lastName: `${playerNumber}`,
          name: `Player ${playerNumber}`,
          age: 20 + Math.floor(Math.random() * 10), // Age 20-29
          height: 170 + Math.floor(Math.random() * 20), // Height 170-189cm
          weight: 65 + Math.floor(Math.random() * 20), // Weight 65-84kg
          position: position,
          bmi: "22.5", // Average BMI
          image: `https://api.dicebear.com/7.x/personas/svg?seed=Player${playerNumber}`,
          id: uuidv4(),
          // Give them reasonable stats for simulation
          speed: 30 + Math.floor(Math.random() * 40), // Speed 30-69
          stamina: 40 + Math.floor(Math.random() * 30), // Stamina 40-69
          strength: 35 + Math.floor(Math.random() * 30), // Strength 35-64
          technique: 25 + Math.floor(Math.random() * 40), // Technique 25-64
          matchHistory: [],
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };

        playersToAdd.push(playerData);
      }

      if (playersToAdd.length > 0) {
        const clubsRef = doc(db, "clubs", user.uid);

        // Add all players at once
        await updateDoc(clubsRef, {
          players: arrayUnion(...playersToAdd)
        });

        alert(`Successfully added ${playersToAdd.length} players! You now have a full team of 11 players.`);
      } else {
        alert("You already have 11 or more players!");
      }

    } catch (error) {
      console.error("Error adding players:", error);
      alert("Failed to add players. Please try again.");
    }

    setAdding(false);
  };

  const currentPlayerCount = user?.players?.length || 0;
  const playersNeeded = Math.max(0, 11 - currentPlayerCount);

  if (playersNeeded === 0) {
    return null; // Don't show button if already have 11+ players
  }

  return (
    <Button
      onClick={addMissingPlayers}
      disabled={adding}
      className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
    >
      <Users className="w-5 h-5 mr-2" />
      {adding ? "Adding Players..." : `🚀 Add ${playersNeeded} Players for Full Team`}
    </Button>
  );
}