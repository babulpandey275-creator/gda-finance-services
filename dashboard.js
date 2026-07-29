// ==========================================================
// 🚀 GDA FINANCE - DASHBOARD (FINAL - MOBILE PERFECT)
// ID Match: txtTodayCollected, txtTodayMissed, txtActiveAccounts, txtTodayDemand, lblDueCount
// ==========================================================

import { db, auth } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

export async function loadDashboard() {
    
    const txtTodayCollected = document.getElementById("txtTodayCollected");
    const txtTodayMissed = document.getElementById("txtTodayMissed");
    const txtActiveAccounts = document.getElementById("txtActiveAccounts");
    const txtTodayDemand = document.getElementById("txtTodayDemand");
    const lblDueCount = document.getElementById("lblDueCount");
    const txtCollectedSub = document.getElementById("txtCollectedSub");
    const greetText = document.getElementById("greetText");

    // Greeting Date
    if(greetText){
        const d = new Date();
        greetText.innerText = `Good Morning, Babul • ${d.toLocaleDateString('en-GB',{day:'2-digit', month:'short'})} • Garhwa`;
    }

    // Aaj ki date IST me
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    try {
        // Data parallel me load karo - FAST
        const [collectSnapshot, custSnapshot] = await Promise.all([
            getDocs(collection(db, "collections")),
            getDocs(collection(db, "customers"))
        ]);

        let todayCollected = 0;
        const paidTodayIds = new Set(); 

        collectSnapshot.forEach(doc => {
            const data = doc.data();
            // Aapke DB me date ka naam kabhi 'date' hai kabhi 'collectionDate' hai - dono check
            const cDate = (data.date || data.collectionDate || "").split('T')[0];
            if (cDate === todayIST) {
                todayCollected += Number(data.amount || data.collectionAmount || 0);
                if(data.customerId) paidTodayIds.add(data.customerId);
            }
        });

        let active = 0;
        let totalDemand = 0;
        let missedCount = 0;

        custSnapshot.forEach(doc => {
            const cust = doc.data();
            const emi = Number(cust.dailyEmi || cust.emi || 0);
            if (cust.status !== "Closed" && emi > 0) {
                active++;
                totalDemand += emi;
                if (!paidTodayIds.has(doc.id)) {
                    missedCount++;
                }
            }
        });

        const currentTodayOverdue = Math.max(0, totalDemand - todayCollected);
        const percent = totalDemand > 0 ? Math.round((todayCollected/totalDemand)*100) : 0;

        // UI Update
        if (txtTodayCollected) txtTodayCollected.innerText = `₹${todayCollected.toLocaleString('en-IN')} / ₹${totalDemand.toLocaleString('en-IN')}`;
        if (txtTodayDemand) txtTodayDemand.innerText = `₹${totalDemand.toLocaleString('en-IN')}`;
        if (txtTodayMissed) txtTodayMissed.innerText = `₹${currentTodayOverdue.toLocaleString('en-IN')}`;
        if (txtActiveAccounts) txtActiveAccounts.innerText = active;
        if (lblDueCount) lblDueCount.innerText = missedCount;
        if (txtCollectedSub) txtCollectedSub.innerText = `${percent}% Completed`;

    } catch (err) { 
        console.error("Dashboard Error:", err); 
        if(txtTodayMissed) txtTodayMissed.innerText = "Error";
    }
}

// Auth Check + Load
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        loadDashboard();
    }
});

// Refresh & Logout Global
window.refreshApp = () => window.location.reload();

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById("logoutBtn");
    if(logoutBtn){
        logoutBtn.onclick = async () => {
            await signOut(auth);
            window.location.href = "login.html";
        };
    }
});
