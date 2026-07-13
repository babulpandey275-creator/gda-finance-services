// ==========================================================
// 🚀 GDA FINANCE - MASTER DASHBOARD ENGINE (FIXED LOGIC)
// ==========================================================

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
            // 1. आज का कलेक्शन और उन ग्राहकों की लिस्ट जिन्होंने आज पैसा दिया
            const collectSnapshot = await getDocs(collection(db, "collections"));
            let todayCollected = 0;
            const paidTodayIds = []; // उन ग्राहकों की ID जिन्होंने आज पेमेंट कर दिया

            collectSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.date === todayIST) {
                    todayCollected += Number(data.amount || 0);
                    paidTodayIds.push(data.customerId); // पेमेंट करने वाले का ID यहाँ जोड़ें
                }
            });

            // 2. एक्टिव ग्राहकों और पेंडिंग ड्यू की गणना
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
                    
                    // सिर्फ उनका काउंट बढ़ाएं जिन्होंने आज पेमेंट नहीं किया है
                    if (!paidTodayIds.includes(doc.id)) {
                        missedCount++; 
                    }
                }
            });

            // 3. UI डेटा अपडेट करना
            const currentTodayOverdue = Math.max(0, totalDemand - todayCollected);

            if (txtTodayCollected) txtTodayCollected.innerText = `₹${todayCollected} / ₹${totalDemand}`;
            if (txtTodayDemand) txtTodayDemand.innerText = `₹${totalDemand}`;
            if (txtTodayMissed) txtTodayMissed.innerText = `₹${currentTodayOverdue}`;
            if (txtActiveAccounts) txtActiveAccounts.innerText = active;
            
            // यहाँ अब सही संख्या (4) दिखेगी
            if (lblDueCount) {
                lblDueCount.innerText = missedCount; 
            }

        } catch (err) { 
            console.error("Dashboard Render Error:", err); 
        }
    });
}

// 🔄 रिफ्रेश और पासवर्ड लिंक का काम
window.refreshApp = () => window.location.reload();

window.addEventListener('load', () => {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn && !document.getElementById("dashboardDirectPassLink")) {
        const passItem = document.createElement("a");
        passItem.id = "dashboardDirectPassLink";
        passItem.href = "change-password.html";
        passItem.className = "nav-item";
        passItem.style.color = "#1565C0";
        passItem.innerHTML = `<span class="material-symbols-outlined">lock_reset</span>Password`;
        logoutBtn.parentNode.insertBefore(passItem, logoutBtn);
    }
});

window.addEventListener('DOMContentLoaded', loadDashboard);
