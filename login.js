import { db } from "./firebase.js"; 
// फायरबेस ऑथेंटिकेशन इम्पोर्ट करना
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js"; 

window.addEventListener('DOMContentLoaded', () => {
    const auth = getAuth();
    const loginBtn = document.getElementById("loginBtn");
    const errorEl = document.getElementById("error");

    if (loginBtn) {
        loginBtn.onclick = async () => {
            const username = document.getElementById("username").value.trim(); 
            const password = document.getElementById("password").value.trim(); 
            
            if (errorEl) errorEl.innerText = ""; // पुराना एरर साफ करें

            if (!username || !password) {
                if (errorEl) errorEl.innerText = "❌ कृपया यूजरनेम और पासवर्ड दोनों भरें";
                return;
            }

            // 💡 आसान सेटअप: अगर आप अभी फायरबेस में ईमेल नहीं बनाना चाहते, तो पुराना 'admin' वाला तरीका
            // लेकिन इसे फायरबेस के लॉगआउट के साथ सिंक करने के लिए हम लोकलस्टोरेज को सही से मैनेज करेंगे
            if (username === "admin" && password === "GDA@2026") {
                localStorage.setItem("gdaLoggedIn", "true"); 
                window.location.href = "index.html"; 
            } else { 
                if (errorEl) errorEl.innerText = "❌ Wrong Username or Password"; 
            }
        };
    }
});
