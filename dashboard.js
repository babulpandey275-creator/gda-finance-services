// ==========================================
// 🚀 GDA FINANCE - SECURE REAL-TIME DASHBOARD CORE (FIXED)
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

        // Precise IST Date Format Configuration (YYYY-MM-DD)
        const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        try {
            const collectSnapshot = await getDocs(collection(db, "collections"));
            let todayCollected = 0;
            let collectionMap = {}; 

            collectSnapshot.forEach(doc => {
                const data = doc.data();
                const colDate = data.date || "";
                const cId = data.customerId || doc.id;
                const amount = Number(data.amount || 0);

                if (cId && colDate) {
                    if (colDate === todayIST) {
                        todayCollected += amount;
                    }
                    if (colDate <= todayIST) {
                        collectionMap[cId] = (collectionMap[cId] || 0) + amount;
                    }
                }
            });

            const custSnapshot = await getDocs(collection(db, "customers"));
            let active = 0;
            let totalDemand = 0;
            let missedCount = 0;
            let totalOverdue = 0;

            custSnapshot.forEach(doc => {
                const cust = doc.data();
                const emi = Number(cust.dailyEmi || cust.emi || 0);
                const loanAmount = Number(cust.loanAmount || 0);

                if (cust.status !== "Closed") {
                    active++;
                    totalDemand += emi;

                    // STRICT LOGIC: Customer marked overdue only if they missed past days
                    if (cust.loanDate && cust.loanDate <= todayIST) {
                        const start = new Date(cust.loanDate);
                        const end = new Date(todayIST);
                        
                        const diffTime = end - start;
                        // Math.floor applied properly to count strictly past completed days
                        let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays < 0) diffDays = 0;
                        
                        const expected = diffDays * emi;
                        const paid = collectionMap[doc.id] || 0;
                        const totalPayableLifetime = loanAmount + (loanAmount * 0.20);
                        
                        const runningExpected = Math.min(expected, totalPayableLifetime);
                        const accountDue = runningExpected - paid;
                        
                        if (accountDue > 0) {
                            missedCount++;
                            totalOverdue += accountDue;
                        }
                    }
                }
            });

            // UI Render Mapping (Fixed Backticks and Data Binding Syntax)
            if (txtTodayCollected) txtTodayCollected.innerText = `₹${todayCollected} / ₹${totalDemand}`;
            if (txtTodayDemand) txtTodayDemand.innerText = `₹${totalDemand}`;
            if (txtTodayMissed) txtTodayMissed.innerText = `₹${totalOverdue}`;
            if (txtActiveAccounts) txtActiveAccounts.innerText = active;
            if (lblDueCount) lblDueCount.innerText = missedCount;

        } catch (err) { 
            console.error("Dashboard Load Error:", err); 
        }
    });
}

window.addEventListener('DOMContentLoaded', loadDashboard);
