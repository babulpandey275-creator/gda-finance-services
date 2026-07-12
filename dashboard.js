// ==========================================
// 🚀 GDA FINANCE - SECURE REAL-TIME DASHBOARD CORE (v12)
// ==========================================

import { db, auth } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', () => {
    
    // 🛡️ Security Gate: Monitor User Authentication State
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            console.log("Unauthorized access! Redirecting to login panel...");
            window.location.href = "login.html";
            return; 
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
            // 1. Fetch data from 'customers' table & Calculate Target Demand
            const custSnapshot = await getDocs(collection(db, "customers"));
            let activeCount = 0;
            let totalDemand = 0;
            let activeCustomers = [];

            custSnapshot.forEach(docSnap => {
                const cust = docSnap.data();
                if ((cust.status || "Active") === "Active") {
                    activeCount++;
                    totalDemand += Number(cust.dailyEmi || cust.emi || 0);
                    activeCustomers.push({ id: docSnap.id, ...cust });
                }
            });

            // 2. Fetch data from 'collections' table for Today's Real Recovery
            const collectSnapshot = await getDocs(collection(db, "collections"));
            let todayCollectedSum = 0;
            let paidCustomerIds = new Set();

            collectSnapshot.forEach(docSnap => {
                const col = docSnap.data();
                const colDate = col.date || "";
                
                if (colDate === todayIST || colDate.includes(todayIST)) {
                    todayCollectedSum += Number(col.amount || col.emiPaid || 0);
                    const cId = col.customerId || col.id;
                    if (cId) paidCustomerIds.add(cId);
                }
            });

            // 3. Calculate Defaulters count using Date-wise Milliseconds Logic
            let missedCustCount = 0;
            activeCustomers.forEach(cust => {
                if (cust.loanDate && cust.status !== "Closed") {
                    if (cust.loanDate >= todayIST) {
                        return; // Exclude if loan starts in the future or today
                    }

                    const date1 = new Date(todayIST);
                    const date2 = new Date(cust.loanDate);
                    const diffTime = Math.abs(date1 - date2);
                    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    
                    const paidDays = Number(cust.paidDays || 0);
                    const dueDays = totalDays - paidDays;

                    if (dueDays > 0) {
                        missedCustCount++;
                    }
                }
            });

            // 🧮 Pure Business Logic mapping
            let finalCollected = todayCollectedSum;
            let rawDue = totalDemand - finalCollected;
            let finalDue = rawDue > 0 ? rawDue : 0; 

            // 🖥️ Injecting values safely into English UI Dashboard Cards
            if (txtTodayCollected) {
                txtTodayCollected.innerText = `₹${finalCollected} / ₹${totalDemand}`;
            }
            if (txtTodayDemand) {
                txtTodayDemand.innerText = `₹${totalDemand}`;
            }
            if (txtTodayMissed) {
                txtTodayMissed.innerText = `₹${finalDue}`;
            }
            if (txtActiveAccounts) {
                txtActiveAccounts.innerText = activeCount;
            }
            if (lblDueCount) {
                lblDueCount.innerText = missedCustCount;
            }

        } catch (err) {
            console.error("Dashboard Engine Load Error:", err);
        }
    });

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
