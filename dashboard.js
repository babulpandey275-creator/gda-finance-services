// ==========================================
// 🚀 GDA FINANCE - SECURE REAL-TIME DASHBOARD CORE (STRICT FIELD FIX)
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
            // 1. Fetch All Collections and Aggregate by clean keys
            const collectSnapshot = await getDocs(collection(db, "collections"));
            let todayCollected = 0;
            let collectionMap = {}; 

            collectSnapshot.forEach(doc => {
                const data = doc.data();
                const colDate = data.date || "";
                
                // Pure direct matching without aggressive numeric truncation
                const cId = (data.customerCode || data.customerId || data.customerName || data.name || "").toString().trim().toUpperCase();
                const amount = Number(data.amount || data.emiPaid || 0);

                if (cId && colDate) {
                    if (colDate === todayIST) {
                        todayCollected += amount;
                    }
                    if (colDate <= todayIST) {
                        collectionMap[cId] = (collectionMap[cId] || 0) + amount;
                    }
                }
            });

            // 2. Fetch Active Customers and map against literal string constraints
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

                    if (cust.loanDate && cust.loanDate <= todayIST) {
                        const start = new Date(cust.loanDate);
                        const end = new Date(todayIST);
                        
                        const diffTime = end - start;
                        let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays < 0) diffDays = 0;
                        
                        const expected = diffDays * emi;
                        const totalPayableLifetime = loanAmount + (loanAmount * 0.20);
                        const runningExpected = Math.min(expected, totalPayableLifetime);

                        const primaryDocId = doc.id.toString().trim().toUpperCase();
                        const customCode = (cust.customerCode || "").toString().trim().toUpperCase();
                        const custName = (cust.name || "").toString().trim().toUpperCase();

                        // Exact direct mapping check across all three raw variants
                        const paid = collectionMap[customCode] || collectionMap[primaryDocId] || collectionMap[custName] || 0;
                        
                        const accountDue = runningExpected - paid;
                        
                        if (accountDue > 0) {
                            missedCount++;
                            totalOverdue += accountDue;
                        }
                    }
                }
            });

            // Safe UI Render update bounds
            if (txtTodayCollected) txtTodayCollected.innerText = `₹${todayCollected} / ₹${totalDemand}`;
            if (txtTodayDemand) txtTodayDemand.innerText = `₹${totalDemand}`;
            if (txtTodayMissed) txtTodayMissed.innerText = `₹${totalOverdue}`;
            if (txtActiveAccounts) txtActiveAccounts.innerText = active;
            if (lblDueCount) lblDueCount.innerText = missedCount;

        } catch (err) { 
            console.error("Dashboard Render Pipeline Crash:", err); 
        }
    });
}

window.addEventListener('DOMContentLoaded', loadDashboard);
