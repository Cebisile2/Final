import React, { createContext, useContext, useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from "firebase/auth";

import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/firebase";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (userAuth) => {
      if (userAuth) {
        const userRef = doc(db, "clubs", userAuth.uid);

        // ✅ Keep loading = true until Firestore responds
        const unsubscribeUser = onSnapshot(
          userRef,
          (snapshot) => {
            if (snapshot.exists()) {
              setCurrentUser({
                uid: userAuth.uid,
                email: userAuth.email,
                ...snapshot.data(),
              });
            } else {
              setCurrentUser(null);
            }
            setLoading(false); // ✅ ONLY set loading false when Firestore replies
          },
          (error) => {
            console.error("Error fetching user data:", error.message);
            setCurrentUser(null);
            setLoading(false);
          }
        );

        return () => unsubscribeUser(); // Clean up Firestore listener
      } else {
        setCurrentUser(null);
        setLoading(false); // ✅ Auth said user is not logged in
      }
    });

    return () => unsubscribeAuth(); // Clean up auth listener
  }, []);

  const navigate = useNavigate();

  const handleSignUp = async (e, formData, setError, setLoading) => {
    e.preventDefault();
    setLoading(true);

    const { name, email, password, clubIcon } = formData;

    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const userId = userCredential.user.uid;
        const userRef = doc(db, "clubs", userId);
        return setDoc(userRef, {
          name,
          email,
          password,
          clubIcon,
        });
      })
      .then(() => {
        setLoading(false);
        setError("User signed up successfully!");
        navigate("/signin"); // Moved navigate after setting loading and error
      })
      .catch((error) => {
        setLoading(false);
        if (error.code === "auth/email-already-in-use") {
          setError(
            "This email is already in use. Please try a different email."
          );
        } else if (error.code === "auth/weak-password") {
          setError("Your password is too weak.");
        } else {
          setError("Error signing up: " + error.message); // Use error.message for better readability
        }
      });
  };

  const handleSignIn = (e, formData, setError, setLoading) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { email, password } = formData;
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const userId = userCredential.user.uid;
        setError("User signed up successfully!");
        setLoading(false);
        navigate("/");
      })
      .catch((error) => {
        if (error.code === "auth/email-already-in") {
          setError("Invalid Email or Password");
        } else {
          setError("Error signing up: " + error.message);
        }
        setLoading(false);
      });
    setLoading(false);
  };

  function forgotPassword(email, setError, setLoading, setMessage) {
    setError("");
    sendPasswordResetEmail(auth, email)
      .then(() => {
        setMessage("Password reset email sent!");
        setLoading(false);
      })
      .catch((error) => {
        setError("Error sending password reset email: " + error.message);
        setLoading(false);
      });
  }

  const authValues = {
    currentUser,
    loading,
    handleSignUp,
    handleSignIn,
    forgotPassword,
  };

  return (
    <AuthContext.Provider value={authValues}>{children}</AuthContext.Provider>
  );
};
