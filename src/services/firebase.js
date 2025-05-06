import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Substitua os valores abaixo pelos dados do seu projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCeg_fBLjo4OH4zBhB0PEngBoPLT_JV5kk",
  authDomain: "emprestimos-app-ebecc.firebaseapp.com",
  projectId: "emprestimos-app-ebecc",
  storageBucket: "emprestimos-app-ebecc.firebasestorage.app",
  messagingSenderId: "1053959812195",
  appId: "1:1053959812195:web:0c74220404702748f23456"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
