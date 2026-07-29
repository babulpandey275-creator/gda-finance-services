// ==========================================================
// 🚀 GDA FINANCE - APP CORE ENGINE (COMMON UTILITIES)
// ==========================================================

import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Auth Guard - Login nahi hai to login page pe bhejo (Report page fix)
    onAuthStateChanged(auth, (user) => {
        if (!user && !window.location.pathname.includes("login.html")) {
            // console.log("Not logged in");
            // window.location.href = "login.html"; // Isko chaho to on kar sakte ho
        }
    });

    // 2. लॉगआउट हैंडलर
    const logoutBtn = document.getElementById("logoutBtn");
    
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            
            const confirmLogout = confirm("क्या आप सच में लॉगआउट करना चाहते हैं?");
            if (confirmLogout) {
                try {
                    await signOut(auth);
                    window.location.href = "login.html";
                } catch (err) {
                    console.error("Logout Error:", err);
                    alert("लॉगआउट करने में समस्या आई।");
                }
            }
        });
    }
});
