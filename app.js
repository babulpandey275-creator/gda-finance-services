// ==========================================================
// 🚀 GDA FINANCE - APP CORE ENGINE (COMMON UTILITIES)
// ==========================================================

import { auth } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. लॉगआउट हैंडलर (जो आपके इंडेक्स पेज के 'Logout' बटन के लिए है)
    const logoutBtn = document.getElementById("logoutBtn");
    
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault(); // लिंक को तुरंत रिलोड होने से रोकता है
            
            const confirmLogout = confirm("क्या आप सच में लॉगआउट करना चाहते हैं?");
            if (confirmLogout) {
                try {
                    await signOut(auth);
                    window.location.href = "login.html"; // वापस लॉगिन पेज पर भेज देगा
                } catch (err) {
                    console.error("Logout Error:", err);
                    alert("लॉगआउट करने में समस्या आई।");
                }
            }
        });
    }

    // आप भविष्य में यहाँ कोई भी अन्य कॉमन फंक्शन (जैसे साइडबार टॉगल) जोड़ सकते हैं।
});
