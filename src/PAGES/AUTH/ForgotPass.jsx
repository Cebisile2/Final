import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, Navigate } from "react-router-dom";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { useAuth } from "@/PROVIDERS/AuthProvider";

export default function ForgotPassPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const { currentUser, forgotPassword } = useAuth();

   if (currentUser) {
     return <Navigate to="/" replace />;
   }



  const onSubmit = (e) => {
    setLoading(true);
    e.preventDefault();
    setError("");
    setMessage("");
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    forgotPassword(email, setError, setLoading, setMessage);
  };

  return (
    <div className="flex justify-center items-center bg-[#0f0e2c] h-screen px-2">
      <Card className="w-full max-w-sm shadow-lg border-0 rounded-xl">
        <CardHeader>
          <div className="text-center space-y-1">
            <CardTitle className="text-xl text-foreground">
              <h1 className="text-3xl font-bold text-green-500">PlaySmart</h1>
            </CardTitle>
            <p className="text-muted-foreground text-sm">Reset your password</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {error && <p className="text-destructive text-sm">{error}</p>}
            {message && <p className="text-green-500 text-sm">{message}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending reset email..." : "Send Reset Email"}
            </Button>
          </form>

          <h1 className="mt-4 text-sm text-center text-muted-foreground">
            Remembered your password?{" "}
            <Link
              to="/signin"
              className="text-green-500 font-semibold hover:underline"
            >
              Go back to Login
            </Link>
          </h1>
        </CardContent>
      </Card>
    </div>
  );
}
