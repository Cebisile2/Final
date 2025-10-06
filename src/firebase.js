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
  apiKey: "AIzaSyDPrcYnBDz3CK8a1QByXIGGCxh59fEaKoM",
  authDomain: "myrealworld-1.firebaseapp.com",
  projectId: "myrealworld-1",
  storageBucket: "myrealworld-1.appspot.com",
  messagingSenderId: "991368400501",
  appId: "1:991368400501:web:4fa635a6329432fd38f23c",
  measurementId: "G-F77198LPT4",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);


export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

