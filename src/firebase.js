// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCe0bcXJ2mGT_CCnLVe7NyQuAdlyIO_8Tk",
  authDomain: "academiatrack-7f5af.firebaseapp.com",
  projectId: "academiatrack-7f5af",
  storageBucket: "academiatrack-7f5af.appspot.com",
  messagingSenderId: "771911203416",
  appId: "1:771911203416:web:f60b946280a136aaa2e82d",
  measurementId: "G-D8FRB7RY2Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);


export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

