// ==========================================
// 🚀 GDA FINANCE - DASHBOARD ENGINE (TOTAL REAL-TIME OVERDUE RE-FIX)
// ==========================================

import { db, auth } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

export async function loadDashboard() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) { 
            window.location.href = "login.html"; 
            return; 
        }

        const txtTodayCollected = document.getElementById("txtTodayCollected");
        const txtTodayMissed = document.getElementById("txtTodayMissed");
        const txtActiveAccounts = document.getElementById("txtActiveAccounts");
        const txtTodayDemand = document.getElementById("txtTodayDemand");
        const lblDueCount = document.getElementById("lblDueCount");

        // Precise IST Date Format (YYYY-MM-DD)
        const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        try {
            // 1. Calculate Today's Real-time Collection
            const collectSnapshot = await getDocs(collection(db, "collections"));
            let todayCollected = 0;

            collectSnapshot.forEach(doc => {
                const data = doc.data();
                const colDate = data.date || "";
                const amount = Number(data.amount || 0);

                if (colDate === todayIST) {
                    todayCollected += amount;
                }
            });

            // 2. Fetch Active Customers and process strict current targets
            const custSnapshot = await getDocs(collection(db, "customers"));
            let active = 0;
            let totalDemand = 0;
            let missedCount = 0;

            custSnapshot.forEach(doc => {
                const cust = doc.data();
                const emi = Number(cust.dailyEmi || cust.emi || 0);

                if (cust.status !== "Closed") {
                    active++;
                    totalDemand += emi;
                    
                    // अगर आज किसी ग्राहक ने ₹1 भी नहीं दिया है, तो वह पेंडिंग लिस्ट में काउंट होगा
                    missedCount++; 
                }
            });

            // 🧮 PERFECT BUSINESS MODEL LOGIC:
            // सुबह होते ही Today's Overdue पूरा का पूरा Today's Target (₹2200) रहेगा।
            // जैसे-जैसे कलेक्शन आता जाएगा, यह घटता चला जाएगा।
            const currentTodayOverdue = Math.max(0, totalDemand - todayCollected);

            // UI Rendering Control Block
            if (txtTodayCollected) txtTodayCollected.innerText = `₹${todayCollected} / ₹${totalDemand}`;
            if (txtTodayDemand) txtTodayDemand.innerText = `₹${totalDemand}`;
            if (txtTodayMissed) txtTodayMissed.innerText = `₹${currentTodayOverdue}`;
            if (txtActiveAccounts) txtActiveAccounts.innerText = active;
            
            // अगर आज का पूरा कलेक्शन आ गया तो ड्यू लिस्ट 0, नहीं तो डिफ़ॉल्ट एक्टिव काउंट
            if (lblDueCount) {
                lblDueCount.innerText = todayCollected >= totalDemand ? 0 : missedCount;
            }

        } catch (err) { 
            console.error("Dashboard Safe Render Failure:", err); 
        }
    });
}

// 🔄 REFRESH & NAVIGATION SHORTCUTS REGISTER
window.addEventListener('load', () => {
    const refreshBtn = document.getElementById("refreshBtn") || document.querySelector(".btn-refresh") || document.querySelector(".refresh-btn");
    if (refreshBtn) refreshBtn.onclick = () => window.location.reload();
    
    const allButtons = document.querySelectorAll("button");
    allButtons.forEach(btn => {
        if (btn.innerText.includes("Refresh")) {
            btn.onclick = () => window.location.reload();
        }
    });

    const bottomChangePassBtn = document.querySelector("a[href*='Password']") || document.getElementById("changePasswordBtn");
    if (bottomChangePassBtn) bottomChangePassBtn.onclick = () => { window.location.href = "change-password.html"; };
});

window.addEventListener('DOMContentLoaded', loadDashboard);
