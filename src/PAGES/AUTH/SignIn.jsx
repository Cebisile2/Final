import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/PROVIDERS/AuthProvider";

export default function SignInPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { handleSignIn, currentUser } = useAuth();

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { email, password } = formData;
    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    handleSignIn(e, formData, setError, setLoading);
  };
  return (
    <div className="flex justify-center items-center bg-[#0f0e2c] h-screen px-2">
      <Card className="w-full max-w-sm shadow-lg border-0 rounded-xl">
        <CardHeader>
          <div className="text-center space-y-1">
            <CardTitle className="text-xl text-foreground">
              {" "}
              <h1 className="text-3xl font-bold text-green-500">PlaySmart</h1>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
            <div className="space-y-1">
              <Input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
              <div className="flex justify-end">
                <Link
                  to="/forgotpass"
                  className="text-green-500 font-semibold hover:underline text-xs"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
          <h1 className="mt-2 text-sm text-center text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              to="/signup"
              className="text-green-500 font-semibold hover:underline"
            >
              Sign up
            </Link>
          </h1>
        </CardContent>
      </Card>
    </div>
  );
}
