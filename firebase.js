import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDFG2At-wHGTiUg6cc2kjiKmgbK-dSgXKw",
  authDomain: "gda-finance-services.firebaseapp.com",
  projectId: "gda-finance-services",
  storageBucket: "gda-finance-services.firebasestorage.app",
  messagingSenderId: "146207390486",
  appId: "1:146207390486:web:076e980ea1404c665b6e37",
  measurementId: "G-92D8JNBHBF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

console.log("Firebase Connected Successfully");
export { db, auth };
