// Firebase SDK Modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js"; 
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

// Firebase Configuration
const firebaseConfig = { 
    apiKey: "AIzaSyDFG2At-wHGTiUg6cc2kjiKmgbK-dSgXKw", 
    authDomain: "gda-finance-services.firebaseapp.com", 
    projectId: "gda-finance-services", 
    storageBucket: "gda-finance-services.firebasestorage.app", 
    messagingSenderId: "146207390486", 
    appId: "1:146207390486:web:076e980ea1404c665b6e37", 
    measurementId: "G-92D8JNBHBF" 
}; 

// Initialize Firebase
const app = initializeApp(firebaseConfig); 
const db = getFirestore(app); 

// Enable Offline Persistence (ऑफलाइन काम करने के लिए क्षमता जोड़ना)
enableIndexedDbPersistence(db)
  .then(() => {
      console.log("Firebase Offline Persistence Enabled Successfully!");
  })
  .catch((err) => {
      if (err.code == 'failed-precondition') {
          // यह तब होता है जब एक से ज्यादा टैब खुले हों
          console.warn("Persistence failed: Multiple tabs open.");
      } else if (err.code == 'unimplemented') {
          // जब ब्राउज़र इसे सपोर्ट नहीं करता
          console.warn("Persistence failed: Browser does not support offline mode.");
      }
  });

console.log("Firebase Connected Successfully"); 

export { db };
