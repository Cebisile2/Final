import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/PROVIDERS/AuthProvider";
import { signOut, updatePassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "@/firebase";



export default function ClubPage() {
  const {currentUser:club} = useAuth()

  const navigate = useNavigate();

  const handleLogOut = () => {
    console.log("Logging out...");
    signOut(auth)
      .then(() => {
        navigate("/signin");
      })
      .catch((error) => {
        console.error("Error signing out: ", error);
      });
  };



  return (
    <div className="p-6 flex flex-col items-center gap-4">
      <Card className="w-full max-w-xl text-center shadow-md">
        <CardHeader>
          <div className="flex flex-col items-center gap-3">
            <img
              src={club.clubIcon}
              alt="Club Logo"
              className="w-32 h-32 rounded-full border-4 border-[var(--primary)] shadow"
            />
            <CardTitle className="text-3xl">{club.name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
        </CardContent>
      </Card>
      <div>
        <Button
          onClick={handleLogOut}
        >
          Log Out
        </Button>
      </div>
    </div>
  );
}


