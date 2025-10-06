import { useState } from "react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/PROVIDERS/AuthProvider";
import { Link } from "react-router";

export default function FormationPreview() {
  const { currentUser } = useAuth();
  const formation = currentUser?.formation || formationTemplates[0];
  const players = currentUser?.players || [];

  const [hoveredSpot, setHoveredSpot] = useState(null);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-semibold text-base">
          Formation: {formation?.name}
        </h2>
        <Link to="/formations">
          <button className="text-xs text-blue-600 underline">Change</button>
        </Link>
      </div>

      {/* Layout: Field left, List right */}
      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* Field */}
        <div className="relative w-full max-w-[220px] aspect-[2/3] bg-green-600 rounded-md border border-green-800 overflow-hidden flex-shrink-0">
          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-green-200 opacity-50" />
          <div className="absolute left-1/2 top-1/2 w-14 h-14 border-2 border-green-200 rounded-full opacity-50 transform -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute left-[25%] top-0 w-[50%] h-10 border-2 border-green-200 opacity-50 rounded-b-md" />
          <div className="absolute left-[25%] bottom-0 w-[50%] h-10 border-2 border-green-200 opacity-50 rounded-t-md" />

          {formation?.spots?.map((spot, index) => {
            const player = currentUser?.players?.find(
              (p) => p.id === spot.playerId
            );
            return (
              <div
                key={index}
                onMouseEnter={() => setHoveredSpot(spot.label)}
                onMouseLeave={() => setHoveredSpot(null)}
                className={`absolute w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow ${
                  player ? "bg-blue-500 text-white" : "bg-gray-300 text-black"
                }`}
                style={{
                  left: `${spot.x}%`,
                  top: `${spot.y}%`,
                  transform: "translate(-50%, -50%)",
                  cursor: "pointer",
                }}
              >
                {player ? player.name.charAt(0) : spot.label.charAt(0)}
              </div>
            );
          })}
        </div>

        {/* Player List */}
        <div className="flex-1 space-y-1 text-sm">
          {formation?.spots?.map((spot, index) => {
            const player = currentUser?.players?.find(
              (p) => p.id === spot.playerId
            );
            return (
              <div
                key={index}
                className={`flex justify-between border-b pb-1 rounded ${
                  hoveredSpot === spot.label ? "bg-yellow-100" : ""
                }`}
              >
                <span>{spot.label}</span>
                <span className="text-muted-foreground">
                  {player ? player.name : "Unassigned"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// --- Formation templates for 5-a-side ---
const formationTemplates = [
  {
    name: "2-2",
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