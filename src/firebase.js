import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyDb2KMSmdPwJqDiDEMtiE9qSvljZvuf9zI",
  authDomain: "office-todo-b55f8.firebaseapp.com",
  projectId: "office-todo-b55f8",
  storageBucket: "office-todo-b55f8.firebasestorage.app",
  messagingSenderId: "586831347498",
  appId: "1:586831347498:web:ed27ae2373fe59e088e853",
  measurementId: "G-YTTCXC0ND3"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);