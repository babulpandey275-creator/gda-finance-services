// ==========================================================
// 🚀 GDA FINANCE - MASTER DASHBOARD ENGINE
// ==========================================================

import { db, auth } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

export async function loadDashboard() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) { 
            window.location.href = "login.html"; 
            return; 
        }

        // HTML Elements
        const txtTodayCollected = document.getElementById("txtTodayCollected");
        const txtTodayMissed = document.getElementById("txtTodayMissed");
        const txtActiveAccounts = document.getElementById("txtActiveAccounts");
        const txtTodayDemand = document.getElementById("txtTodayDemand");
        const lblDueCount = document.getElementById("lblDueCount");

        const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        try {
            // 1. आज का पेमेंट डेटा फेच करें
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

            // 2. कस्टमर डेटा फेच करें
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
                    
                    // अगर आज पेमेंट नहीं किया है, तो उसे पेंडिंग में गिनें
                    if (!paidTodayIds.includes(doc.id)) {
                        missedCount++; 
                    }
                }
            });

            // 3. UI डेटा अपडेट करें
            const currentTodayOverdue = Math.max(0, totalDemand - todayCollected);

            if (txtTodayCollected) txtTodayCollected.innerText = `₹${todayCollected} / ₹${totalDemand}`;
            if (txtTodayDemand) txtTodayDemand.innerText = `₹${totalDemand}`;
            if (txtTodayMissed) txtTodayMissed.innerText = `₹${currentTodayOverdue}`;
            if (txtActiveAccounts) txtActiveAccounts.innerText = active;
            
            // पेंडिंग कस्टमर की संख्या अपडेट करें
            if (lblDueCount) {
                lblDueCount.innerText = missedCount; 
            }

        } catch (err) { 
            console.error("Dashboard Render Error:", err); 
        }
    });
}

// 🔄 रिफ्रेश फंक्शन
window.refreshApp = () => window.location.reload();

window.addEventListener('DOMContentLoaded', loadDashboard);
