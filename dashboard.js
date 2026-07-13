import { db, auth } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

export async function loadDashboard() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) { window.location.href = "login.html"; return; }

        const txtTodayCollected = document.getElementById("txtTodayCollected");
        const txtTodayMissed = document.getElementById("txtTodayMissed");
        const txtActiveAccounts = document.getElementById("txtActiveAccounts");
        const txtTodayDemand = document.getElementById("txtTodayDemand");
        const lblDueCount = document.getElementById("lblDueCount");

        const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        try {
            const collectSnapshot = await getDocs(collection(db, "collections"));
            let todayCollected = 0;
            let collectionMap = {}; 

            collectSnapshot.forEach(doc => {
                const data = doc.data();
                const colDate = data.date || "";
                const amount = Number(data.amount || 0);
                const pDocId = (data.customerId || "").toString().trim();

                if (colDate === todayIST) todayCollected += amount;
                if (colDate <= todayIST && pDocId) {
                    collectionMap[pDocId] = (collectionMap[pDocId] || 0) + amount;
                }
            });

            const custSnapshot = await getDocs(collection(db, "customers"));
            let active = 0, totalDemand = 0, missedCount = 0, totalOverdue = 0;

            custSnapshot.forEach(doc => {
                const cust = doc.data();
                const emi = Number(cust.dailyEmi || cust.emi || 0);
                const loanAmount = Number(cust.loanAmount || 0);
                const pDocId = doc.id.toString().trim();

                if (cust.status !== "Closed") {
                    active++;
                    totalDemand += emi;

                    if (cust.loanDate && cust.loanDate <= todayIST) {
                        const start = new Date(cust.loanDate);
                        const end = new Date(todayIST);
                        
                        // INCLUDES TODAY: आज का दिन भी शामिल है, सुबह होते ही EMI देय बन जाती है
                        const diffTime = end - start;
                        let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; 
                        if (diffDays < 0) diffDays = 0;
                        
                        const expected = diffDays * emi;
                        const maxPayable = loanAmount + (loanAmount * 0.20);
                        const runningExpected = Math.min(expected, maxPayable);

                        const paid = collectionMap[pDocId] || Number(cust.paidAmount || cust.totalCollected || 0);
                        const accountDue = runningExpected - paid;
                        
                        if (accountDue > 0) {
                            missedCount++;
                            totalOverdue += accountDue;
                        }
                    }
                }
            });

            if (txtTodayCollected) txtTodayCollected.innerText = `₹${todayCollected} / ₹${totalDemand}`;
            if (txtTodayDemand) txtTodayDemand.innerText = `₹${totalDemand}`;
            if (txtTodayMissed) txtTodayMissed.innerText = `₹${totalOverdue}`;
            if (txtActiveAccounts) txtActiveAccounts.innerText = active;
            if (lblDueCount) lblDueCount.innerText = missedCount;

        } catch (err) { console.error("Dashboard Engine Load Error: ", err); }
    });
}

// Refresh Engine & Password Router Connectors
window.addEventListener('load', () => {
    const refreshBtn = document.getElementById("refreshBtn") || document.querySelector(".btn-refresh") || document.querySelector(".refresh-btn");
    if (refreshBtn) refreshBtn.onclick = () => window.location.reload();
    const upperRightBtn = document.querySelector("button"); 
    if (upperRightBtn && upperRightBtn.innerText.includes("Refresh")) {
        upperRightBtn.onclick = () => window.location.reload();
    }
    const bottomChangePassBtn = document.querySelector("a[href*='Password']") || document.getElementById("changePasswordBtn");
    if (bottomChangePassBtn) bottomChangePassBtn.onclick = () => { window.location.href = "change-password.html"; };
});

window.addEventListener('DOMContentLoaded', loadDashboard);
