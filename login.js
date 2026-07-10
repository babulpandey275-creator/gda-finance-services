// firebase.js से db और auth दोनों को इम्पोर्ट किया
import { db, auth } from "./firebase.js"; 
// फायरबेस का लॉगिन फंक्शन इम्पोर्ट किया
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js"; 

window.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById("loginBtn");
    const errorEl = document.getElementById("error");

    if (loginBtn) {
        loginBtn.onclick = async () => {
            const username = document.getElementById("username").value.trim(); // यहाँ अपनी ईमेल आईडी डालें
            const password = document.getElementById("password").value.trim(); // यहाँ अपना पासवर्ड डालें

            if (errorEl) errorEl.innerText = ""; // पुराना एरर साफ करें

            if (!username || !password) {
                if (errorEl) errorEl.innerText = "❌ कृपया ईमेल और पासवर्ड दोनों भरें";
                return;
            }

            // लोडिंग दिखाने के लिए बटन को डिसेबल करें
            loginBtn.disabled = true;
            if (errorEl) errorEl.innerText = "⏳ लॉग इन हो रहा है, कृपया प्रतीक्षा करें...";

            try {
                // 🔐 असली फ़ायरबेस लॉगिन: यह डेटाबेस को अनलॉक कर देगा
                const userCredential = await signInWithEmailAndPassword(auth, username, password);
                
                // लॉगिन सफल होने पर लोकलस्टोरेज सेट करें और होम पेज पर जाएं
                localStorage.setItem("gdaLoggedIn", "true");
                window.location.href = "index.html";
                
            } catch (error) {
                console.error("Login Error: ", error);
                loginBtn.disabled = false;
                
                // गलत आईडी या पासवर्ड होने पर एरर मैसेज दिखाएं
                if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                    if (errorEl) errorEl.innerText = "❌ गलत ईमेल आईडी या पासवर्ड!";
                } else {
                    if (errorEl) errorEl.innerText = "❌ लॉगिन में समस्या: " + error.message;
                }
            }
        };
    }
});
