// ==========================================================
// 🚀 GDA FINANCE - DASHBOARD (ONLY STATS - CLEAN & FAST)
// ==========================================================

import { db, auth } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export async function loadDashboard() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) { 
            window.location.href = "login.html"; 
            return; 
        }

        // 💡 ये सारे IDs (txtTodayCollected आदि) आपके index.html में मौजूद हैं
        const txtTodayCollected = document.getElementById("txtTodayCollected");
        const txtTodayMissed = document.getElementById("txtTodayMissed");
        const txtActiveAccounts = document.getElementById("txtActiveAccounts");
        const txtTodayDemand = document.getElementById("txtTodayDemand");
        const lblDueCount = document.getElementById("lblDueCount");

        // आज की तारीख (IST फॉर्मेट में)
        const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        try {
            // 1. कलेक्शन (Collections) डेटा लोड करें
            const collectSnapshot = await getDocs(collection(db, "collections"));
            let todayCollected = 0;
            const paidTodayIds = []; 

            collectSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.date === todayIST) {
                    todayCollected += Number(data.amount || 0);
                    paidTodayIds.push(data.customerId); 
                }
            });

            // 2. कस्टमर (Customers) डेटा लोड करें
            const custSnapshot = await getDocs(collection(db, "customers"));
            let active = 0;
            let totalDemand = 0;
            let missedCount = 0;

            custSnapshot.forEach(doc => {
                const cust = doc.data();
                const emi = Number(cust.dailyEmi || cust.emi || 0);

                // 'Closed' (बंद) अकाउंट को छोड़ें
                if (cust.status !== "Closed") {
                    active++; // एक्टिव अकाउंट गिनें
                    totalDemand += emi; // आज की कुल डिमांड (Target)
                    
                    // अगर आज पेमेंट नहीं किया है, तो मिस्ड काउंट बढ़ाएं
                    if (!paidTodayIds.includes(doc.id)) {
                        missedCount++; 
                    }
                }
            });

            // 3. आज का कुल बकाया (Overdue) निकालें (डिमांड - कलेक्शन)
            const currentTodayOverdue = Math.max(0, totalDemand - todayCollected);

            // 4. UI (यूजर इंटरफेस) अपडेट करें
            if (txtTodayCollected) txtTodayCollected.innerText = `₹${todayCollected} / ₹${totalDemand}`;
            if (txtTodayDemand) txtTodayDemand.innerText = `₹${totalDemand}`;
            if (txtTodayMissed) txtTodayMissed.innerText = `₹${currentTodayOverdue}`;
            if (txtActiveAccounts) txtActiveAccounts.innerText = active;
            if (lblDueCount) lblDueCount.innerText = missedCount; 

        } catch (err) { 
            console.error("Dashboard Render Error:", err); 
        }
    });
}

// 🔄 रिफ्रेश (Refresh) बटन के लिए ग्लोबल फंक्शन
window.refreshApp = () => window.location.reload();

// 🚀 जैसे ही पेज (Page) लोड हो, डैशबोर्ड (Dashboard) लोड करें
window.addEventListener('DOMContentLoaded', loadDashboard);
