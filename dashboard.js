// ==========================================
// 🚀 GDA FINANCE - DASHBOARD ENGINE (FINAL FIXED)
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

        const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        try {
            // 1. आज का टोटल कलेक्शन और उन कस्टमर्स की लिस्ट जिन्होंने पेमेंट किया है
            const collectSnapshot = await getDocs(collection(db, "collections"));
            let todayCollected = 0;
            const paidTodayIds = []; // उन कस्टमर्स की लिस्ट जिन्होंने आज पैसा दिया

            collectSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.date === todayIST) {
                    todayCollected += Number(data.amount || 0);
                    paidTodayIds.push(data.customerId); // ID सेव की
                }
            });

            // 2. कस्टमर्स का डेटा प्रोसेस करें
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
                    
                    // अगर इस कस्टमर की ID 'paidTodayIds' में नहीं है, तो पेंडिंग है
                    if (!paidTodayIds.includes(doc.id)) {
                        missedCount++; 
                    }
                }
            });

            // 🧮 Calculations
            const currentTodayOverdue = Math.max(0, totalDemand - todayCollected);

            // 3. UI Updates
            if (txtTodayCollected) txtTodayCollected.innerText = `₹${todayCollected} / ₹${totalDemand}`;
            if (txtTodayDemand) txtTodayDemand.innerText = `₹${totalDemand}`;
            if (txtTodayMissed) txtTodayMissed.innerText = `₹${currentTodayOverdue}`;
            if (txtActiveAccounts) txtActiveAccounts.innerText = active;
            
            if (lblDueCount) {
                lblDueCount.innerText = missedCount; // अब यहाँ सिर्फ पेंडिंग वाले दिखेंगे
            }

        } catch (err) { 
            console.error("Dashboard Safe Render Failure:", err); 
        }
    });
}

// 🔄 REFRESH & NAVIGATION
window.addEventListener('load', () => {
    const refreshBtn = document.getElementById("refreshBtn") || document.querySelector(".btn-refresh") || document.querySelector(".refresh-btn");
    if (refreshBtn) refreshBtn.onclick = () => window.location.reload();
    
    const bottomChangePassBtn = document.querySelector("a[href*='Password']") || document.getElementById("changePasswordBtn");
    if (bottomChangePassBtn) bottomChangePassBtn.onclick = () => { window.location.href = "change-password.html"; };
});

window.addEventListener('DOMContentLoaded', loadDashboard);
