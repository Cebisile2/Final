import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/PROVIDERS/AuthProvider";
import { Link, Navigate } from "react-router-dom";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/firebase"; // Make sure you have this
import { ImageIcon } from "lucide-react";

export default function SignUpPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { handleSignUp, currentUser } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    clubIcon: "",
  });

  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState("");

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    const fileRef = ref(storage, `clubIcons/${Date.now()}_${file.name}`);
    setUploading(true);

    try {
      await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(fileRef);
      setFormData({ ...formData, clubIcon: downloadUrl });
    } catch (err) {
      setError("Failed to upload image");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const validateInputs = () => {
    const { email, password, confirmPassword, name } = formData;

    // Empty check
    if (!email || !password || !confirmPassword || !name) {
      return "Please fill in all fields.";
    }

    // Name validation: no numbers, min 3 characters
    const nameRegex = /^[A-Za-z\s]{3,}$/;
    if (!nameRegex.test(name)) {
      return "Club name must be at least 3 letters and contain no numbers.";
    }

    // Password validation
    if (password.length < 6) {
      return "Password must be at least 6 characters long.";
    }

    const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
    if (!passwordStrengthRegex.test(password)) {
      return "Password must contain at least one uppercase letter, one lowercase letter, and one number.";
    }

    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }

    return null; // All good
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    handleSignUp(e, formData, setError, setLoading);
  };

  return (
    <div className="flex justify-center items-center h-screen bg-[#0f0e2c] px-2">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader>
          <CardTitle className="text-4xl text-center font-bold text-green-500">
            PlaySmart
          </CardTitle>
          <CardTitle className="text-sm text-center">
            Register Your Club
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Club Icon Upload */}
            <div className="flex flex-col items-center space-y-2">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Club Icon Preview"
                  className="w-24 h-24 rounded-full border object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border flex items-center justify-center bg-gray-100 text-gray-500">
                  <ImageIcon className="w-32 h-32" />
                </div>
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={uploading}
              />
              {uploading && (
                <p className="text-xs text-muted-foreground">
                  Uploading icon...
                </p>
              )}
            </div>

            <Input
              type="text"
              placeholder="Club Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
            <Input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
            <Input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
            <Input
              type="password"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
            />

            {error && <p className="text-destructive text-sm">{error}</p>}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || uploading}
            >
              {loading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>
          <h1 className="mt-2 text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/signin"
              className="text-green-500 font-semibold hover:underline"
            >
              Sign in
            </Link>
          </h1>
        </CardContent>
      </Card>
    </div>
  );
}
