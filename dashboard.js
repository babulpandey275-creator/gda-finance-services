// ==========================================
// 🚀 GDA FINANCE - DASHBOARD ENGINE (TOTAL OVERDUE ACCUMULATION FIX)
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
            // 1. Fetch All Collections into a Raw Array for Perfect Matching
            const collectSnapshot = await getDocs(collection(db, "collections"));
            let todayCollected = 0;
            let allCollections = [];

            collectSnapshot.forEach(doc => {
                const data = doc.data();
                const colDate = data.date || "";
                const amount = Number(data.amount || data.emiPaid || 0);
                
                const rawCustId = (data.customerId || "").toString().trim();
                const rawCustCode = (data.customerCode || "").toString().trim();
                const rawCustName = (data.customerName || data.name || "").toString().trim();

                if (colDate === todayIST) {
                    todayCollected += amount;
                }

                if (colDate <= todayIST) {
                    allCollections.push({
                        custId: rawCustId,
                        custCode: rawCustCode,
                        custName: rawCustName,
                        amount: amount
                    });
                }
            });

            // 2. Fetch Active Customers and SUM all matching records cleanly
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

                        // Master keys for this specific customer
                        const pDocId = doc.id.toString().trim();
                        const cCode = (cust.customerCode || "").toString().trim();
                        const cName = (cust.name || "").toString().trim();

                        // 🔍 SUMMING ALL TRANSACTIONS (No overrides, strictly adding them together)
                        let totalPaidForThisCustomer = 0;
                        allCollections.forEach(col => {
                            if (
                                (col.custId && col.custId === pDocId) || 
                                (col.custCode && col.custCode === cCode) || 
                                (col.custName && col.custName === cName)
                            ) {
                                totalPaidForThisCustomer += col.amount;
                            }
                        });

                        const accountDue = runningExpected - totalPaidForThisCustomer;
                        
                        if (accountDue > 0) {
                            missedCount++;
                            totalOverdue += accountDue;
                        }
                    }
                }
            });

            // UI Rendering
            if (txtTodayCollected) txtTodayCollected.innerText = `₹${todayCollected} / ₹${totalDemand}`;
            if (txtTodayDemand) txtTodayDemand.innerText = `₹${totalDemand}`;
            if (txtTodayMissed) txtTodayMissed.innerText = `₹${totalOverdue}`;
            if (txtActiveAccounts) txtActiveAccounts.innerText = active;
            if (lblDueCount) lblDueCount.innerText = missedCount;

        } catch (err) { 
            console.error("Dashboard Load Failure:", err); 
        }
    });
}
window.addEventListener('DOMContentLoaded', loadDashboard);
