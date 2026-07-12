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

        // IST Date Format
        const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        try {
            const collectSnapshot = await getDocs(collection(db, "collections"));
            let todayCollected = 0;
            let collectionMap = {}; 

            collectSnapshot.forEach(doc => {
                const data = doc.data();
                if(data.date === todayIST) todayCollected += Number(data.amount || 0);
                collectionMap[data.customerId] = (collectionMap[data.customerId] || 0) + Number(data.amount || 0);
            });

            const custSnapshot = await getDocs(collection(db, "customers"));
            let active = 0, totalDemand = 0, missedCount = 0, totalOverdue = 0;

            custSnapshot.forEach(doc => {
                const cust = doc.data();
                const emi = Number(cust.dailyEmi || cust.emi || 0);
                
                if (cust.status !== "Closed") {
                    active++;
                    totalDemand += emi;

                    // STRICT LOGIC: Due only if past days missed
                    const start = new Date(cust.loanDate);
                    const end = new Date(todayIST);
                    const diffDays = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
                    
                    const expected = diffDays * emi;
                    const paid = collectionMap[doc.id] || 0;
                    
                    if (paid < expected) {
                        missedCount++;
                        totalOverdue += (expected - paid);
                    }
                }
            });

            if (txtTodayCollected) txtTodayCollected.innerText = `₹${todayCollected} / ₹${totalDemand}`;
            if (txtTodayDemand) txtTodayDemand.innerText = `₹${totalDemand}`;
            if (txtTodayMissed) txtTodayMissed.innerText = `₹${totalOverdue}`;
            if (txtActiveAccounts) txtActiveAccounts.innerText = active;
            if (lblDueCount) lblDueCount.innerText = missedCount;
        } catch (err) { console.error("Dashboard Load Error:", err); }
    });
}
window.addEventListener('DOMContentLoaded', loadDashboard);
