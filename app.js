// ==========================================
// 🚀 GDA FINANCE - MASTER DASHBOARD ENGINE (REAL-TIME SAFE app.js)
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
            // 1. आज का लाइव कलेक्शन कैलकुलेट करना
            const collectSnapshot = await getDocs(collection(db, "collections"));
            let todayCollected = 0;

            collectSnapshot.forEach(doc => {
                const data = doc.data();
                const colDate = data.date || "";
                const amount = Number(data.amount || 0);

                if (colDate === todayIST) {
                    todayCollected += amount;
                }
            });

            // 2. एक्टिव ग्राहकों और आज के टारगेट की गणना करना
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
                    missedCount++; 
                }
            });

            // 🧮 100% सटीक बिज़नेस नियम:
            // सुबह होते ही टुडेज़ ओवरड्यू पूरा ₹2200 रहेगा। जैसे-जैसे कलेक्शन आएगा, ओडी घटता जाएगा।
            const currentTodayOverdue = Math.max(0, totalDemand - todayCollected);

            // 📊 स्क्रीन पर डेटा रेंडर करना
            if (txtTodayCollected) txtTodayCollected.innerText = `₹${todayCollected} / ₹${totalDemand}`;
            if (txtTodayDemand) txtTodayDemand.innerText = `₹${totalDemand}`;
            if (txtTodayMissed) txtTodayMissed.innerText = `₹${currentTodayOverdue}`;
            if (txtActiveAccounts) txtActiveAccounts.innerText = active;
            
            if (lblDueCount) {
                lblDueCount.innerText = todayCollected >= totalDemand ? 0 : missedCount;
            }

        } catch (err) { 
            console.error("Dashboard Safe Render Failure:", err); 
        }
    });
}

// 🔄 रिफ्रेश बटन और पासवर्ड चेंज को एक्टिवेट करना
window.refreshApp = function() {
    window.location.reload();
};

window.addEventListener('load', () => {
    // 🔑 बॉटम नेविगेशन के ठीक ऊपर 'Change Password' का सुंदर लिंक जोड़ना
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn && !document.getElementById("dashboardDirectPassLink")) {
        const passItem = document.createElement("a");
        passItem.id = "dashboardDirectPassLink";
        passItem.href = "change-password.html";
        passItem.className = "nav-item";
        passItem.style.color = "#1565C0";
        passItem.innerHTML = `<span class="material-symbols-outlined">lock_reset</span>Password`;
        
        // लॉगआउट बटन के ठीक पहले इसे फिट करना
        logoutBtn.parentNode.insertBefore(passItem, logoutBtn);
    }
});

window.addEventListener('DOMContentLoaded', loadDashboard);
