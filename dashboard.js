// ==========================================
// 🚀 GDA FINANCE - SECURE REAL-TIME DASHBOARD CORE (v12)
// ==========================================

import { db, auth } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

export async function loadDashboard() {
    return new Promise((resolve, reject) => {
        // Monitor User Authentication State
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                console.log("Unauthorized access! Redirecting to login panel...");
                window.location.href = "login.html";
                return reject("Unauthorized"); 
            }

            console.log("Authenticated User Session Active:", user.email);

            // UI Target Elements Selection
            const txtTodayCollected = document.getElementById("txtTodayCollected");
            const txtTodayMissed = document.getElementById("txtTodayMissed");
            const txtActiveAccounts = document.getElementById("txtActiveAccounts");
            const txtTodayDemand = document.getElementById("txtTodayDemand");
            const lblDueCount = document.getElementById("lblDueCount");

            // 🇮🇳 Timezone Synchronizer (IST) - Format: YYYY-MM-DD
            const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
            const todayParts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date());
            const yyyy = todayParts.find(p => p.type === 'year').value;
            const mm = todayParts.find(p => p.type === 'month').value;
            const dd = todayParts.find(p => p.type === 'day').value;
            const todayIST = `${yyyy}-${mm}-${dd}`;

            try {
                // 1. Fetch data from 'collections' table for Real Recovery Mapping
                const collectSnapshot = await getDocs(collection(db, "collections"));
                let todayCollectedSum = 0;
                let collectionUpToToday = {};

                if (!collectSnapshot.empty) {
                    collectSnapshot.forEach(docSnap => {
                        const col = docSnap.data();
                        const colDate = col.date || "";
                        const cId = col.customerId || col.id;
                        const amount = Number(col.amount || col.emiPaid || 0);
                        
                        if (cId && colDate) {
                            if (colDate === todayIST) {
                                todayCollectedSum += amount;
                            }
                            if (colDate <= todayIST) {
                                collectionUpToToday[cId] = (collectionUpToToday[cId] || 0) + amount;
                            }
                        }
                    });
                }

                // 2. Fetch data from 'customers' table & Calculate Live Demand/Overdue
                const custSnapshot = await getDocs(collection(db, "customers"));
                let activeCount = 0;
                let totalDemandToday = 0;
                let missedCustCount = 0;
                let totalCumulativeOverdue = 0;

                if (!custSnapshot.empty) {
                    custSnapshot.forEach(docSnap => {
                        const cust = docSnap.data();
                        const cId = docSnap.id;
                        const emi = Number(cust.dailyEmi || cust.emi || 0);
                        const loanAmount = Number(cust.loanAmount || 0);

                        if ((cust.status || "Active") === "Active") {
                            activeCount++;
                            totalDemandToday += emi;

                            // 🧮 FIXED LIVE OVERDUE CALCULATION ENGINE
                            if (cust.loanDate && cust.loanDate <= todayIST) {
                                const start = new Date(cust.loanDate);
                                const end = new Date(todayIST);
                                
                                const diffTime = end - start;
                                let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                                if (diffDays < 0) diffDays = 0;

                                const expectedCollection = diffDays * emi;
                                const actualCollection = collectionUpToToday[cId] || 0;
                                const totalPayableLifetime = loanAmount + (loanAmount * 0.20);
                                
                                const runningExpected = Math.min(expectedCollection, totalPayableLifetime);
                                const accountDue = runningExpected - actualCollection;

                                if (accountDue > 0) {
                                    totalCumulativeOverdue += accountDue;
                                    missedCustCount++;
                                }
                            }
                        }
                    });
                }

                // 🖥️ Injecting values safely into English UI Dashboard Cards
                if (txtTodayCollected) {
                    txtTodayCollected.innerText = `₹${todayCollectedSum} / ₹${totalDemandToday}`;
                }
                if (txtTodayDemand) {
                    txtTodayDemand.innerText = `₹${totalDemandToday}`;
                }
                if (txtTodayMissed) {
                    txtTodayMissed.innerText = `₹${totalCumulativeOverdue}`;
                }
                if (txtActiveAccounts) {
                    txtActiveAccounts.innerText = activeCount;
                }
                if (lblDueCount) {
                    lblDueCount.innerText = missedCustCount;
                }

                resolve();
            } catch (err) {
                console.error("Dashboard Engine Load Error:", err);
                reject(err);
            }
        });
    });
}

// Global initialization window trigger
window.addEventListener('DOMContentLoaded', () => {
    loadDashboard().catch(err => console.error("Initial load failed", err));

    // ==========================================
    // 🚪 Secure Authentication Logout Action Handler
    // ==========================================
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            if (confirm("Are you sure you want to log out from GDA Finance systems?")) {
                auth.signOut().then(() => {
                    localStorage.removeItem("gdaLoggedIn");
                    console.log("User session cleared successfully.");
                    window.location.href = "login.html";
                }).catch((error) => {
                    console.error("Logout Process Error:", error);
                    alert("Logout failed! Please try again.");
                });
            }
        };
    }
});
