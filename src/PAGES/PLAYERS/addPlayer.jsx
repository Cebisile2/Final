import { useState } from "react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { db, storage } from "@/firebase";

export default function AddPlayer({ user }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    height: "",
    weight: "",
    position: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Calculate BMI automatically
  const calculateBMI = () => {
    const height = parseFloat(formData.height);
    const weight = parseFloat(formData.weight);
    if (height && weight && height > 0) {
      const heightInMeters = height / 100;
      return (weight / (heightInMeters * heightInMeters)).toFixed(1);
    }
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.age ||
      !formData.height ||
      !formData.weight ||
      !formData.position
    )
      return;

    setUploading(true);

    let imageUrl = "";

    // If an image was selected → upload to storage
    if (imageFile) {
      const imageRef = ref(
        storage,
        `clubs/${user?.uid}/players/${formData.firstName}_${formData.lastName}-${Date.now()}`
      );

      await uploadBytes(imageRef, imageFile);
      imageUrl = await getDownloadURL(imageRef);
    }

    const playerData = {
      ...formData,
      name: `${formData.firstName} ${formData.lastName}`,
      bmi: calculateBMI(),
      age: parseInt(formData.age),
      height: parseFloat(formData.height),
      weight: parseFloat(formData.weight),
      image:
        imageUrl ||
        `https://api.dicebear.com/7.x/personas/svg?seed=${formData.firstName}`,
      id: uuidv4(),
      // Start with unknown performance - will be discovered through matches
      speed: 0,           // Unknown until they play
      stamina: 0,         // Unknown until they play
      strength: 0,        // Unknown until they play
      technique: 0,       // Unknown until they play
      // Initialize match history for development tracking
      matchHistory: [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };



    const clubsRef = doc(db, "clubs", user.uid);

    await updateDoc(clubsRef, {
      players: arrayUnion(playerData),
    });

    setFormData({ 
      firstName: "", 
      lastName: "", 
      age: "", 
      height: "", 
      weight: "", 
      position: "" 
    });
    setImageFile(null);
    setImagePreview(null);
    setOpen(false);
    setUploading(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file)); // 👈 Preview before uploading
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200">
          <PlusCircle className="w-5 h-5 mr-2" /> ✨ Add New Player
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Player</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <Input
              placeholder="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <Input
              placeholder="Age"
              type="number"
              min="16"
              max="40"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              required
            />
            <Input
              placeholder="Height (cm)"
              type="number"
              min="150"
              max="210"
              value={formData.height}
              onChange={(e) => setFormData({ ...formData, height: e.target.value })}
              required
            />
            <Input
              placeholder="Weight (kg)"
              type="number"
              min="50"
              max="120"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              required
            />
          </div>

          {/* BMI Display */}
          {calculateBMI() && (
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <p className="text-sm font-medium text-blue-800">
                Calculated BMI: <span className="text-lg font-bold">{calculateBMI()}</span>
              </p>
              <p className="text-xs text-blue-600">
                {parseFloat(calculateBMI()) < 18.5 ? "Underweight" :
                 parseFloat(calculateBMI()) < 25 ? "Normal" :
                 parseFloat(calculateBMI()) < 30 ? "Overweight" : "Obese"}
              </p>
            </div>
          )}

          <Select
            value={formData.position}
            onValueChange={(value) =>
              setFormData({ ...formData, position: value })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Forward">Forward</SelectItem>
              <SelectItem value="Midfielder">Midfielder</SelectItem>
              <SelectItem value="Defender">Defender</SelectItem>
              <SelectItem value="Goalkeeper">Goalkeeper</SelectItem>
            </SelectContent>
          </Select>

          <Input type="file" accept="image/*" onChange={handleImageChange} />
          {/* Image preview */}
          {imagePreview && (
            <div className="flex justify-center">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-24 h-24 rounded-full border-2 border-[var(--primary)] object-cover"
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={uploading}>
            {uploading ? "Uploading..." : "Save Player"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
