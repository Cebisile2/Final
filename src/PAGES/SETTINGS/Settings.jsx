import React from "react";
import { signOut, updatePassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { auth } from "@/firebase";

export default function Settings() {
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
    <div>
      <h1 className="text-2xl font-bold text-center mt-10">Settings</h1>
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
