// ==========================================================
// 🚀 GDA FINANCE - MASTER DASHBOARD ENGINE (FULL: STATS + MISSED DATES)
// ==========================================================

import { db, auth } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// =========================================================
// 1️⃣ MAIN DASHBOARD LOAD (आपका पुराना स्टैट्स वाला कोड)
// =========================================================
export async function loadDashboard() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) { 
            window.location.href = "login.html"; 
            return; 
        }

        // UI एलिमेंट्स
        const txtTodayCollected = document.getElementById("txtTodayCollected");
        const txtTodayMissed = document.getElementById("txtTodayMissed");
        const txtActiveAccounts = document.getElementById("txtActiveAccounts");
        const txtTodayDemand = document.getElementById("txtTodayDemand");
        const lblDueCount = document.getElementById("lblDueCount");

        // आज की तारीख (IST)
        const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        try {
            // 1. Collections (पेमेंट) डेटा
            const collectSnapshot = await getDocs(collection(db, "collections"));
            let todayCollected = 0;
            const paidTodayIds = []; 

            collectSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.date === todayIST) {
                    todayCollected += Number(data.amount || 0);
                    paidTodayIds.push(data.customerId); 
                }
            });

            // 2. Customers (कस्टमर) डेटा
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
                    
                    // अगर आज पेमेंट नहीं किया है, तो मिस्ड काउंट बढ़ाएं
                    if (!paidTodayIds.includes(doc.id)) {
                        missedCount++; 
                    }
                }
            });

            // 3. UI अपडेट करें
            const currentTodayOverdue = Math.max(0, totalDemand - todayCollected);

            if (txtTodayCollected) txtTodayCollected.innerText = `₹${todayCollected} / ₹${totalDemand}`;
            if (txtTodayDemand) txtTodayDemand.innerText = `₹${totalDemand}`;
            if (txtTodayMissed) txtTodayMissed.innerText = `₹${currentTodayOverdue}`;
            if (txtActiveAccounts) txtActiveAccounts.innerText = active;
            if (lblDueCount) lblDueCount.innerText = missedCount; 

        } catch (err) { 
            console.error("Dashboard Render Error:", err); 
        }
    });
}

// =========================================================
// 2️⃣ 🔥 NEW FEATURE: MISSED DATES SUMMARY (जैसा आप चाहते हैं)
// =========================================================
async function loadMissedDatesSummary() {
    const listEl = document.getElementById("missedList");
    const loadingEl = document.getElementById("missedLoading");
    
    // अगर HTML में ये एलिमेंट नहीं हैं (पुराना वर्जन), तो चुपचाप बाहर निकल जाएं
    if (!listEl || !loadingEl) return;

    try {
        // सारे कस्टमर और कलेक्शन एक साथ लोड करें (ताकि जल्दी हो)
        const [custSnapshot, colSnapshot] = await Promise.all([
            getDocs(collection(db, "customers")),
            getDocs(collection(db, "collections"))
        ]);

        // 1. Map बनाएं: customerId -> Set of Paid Dates
        const paidMap = new Map();
        colSnapshot.forEach(doc => {
            const data = doc.data();
            const cId = data.customerId;
            if (cId) {
                if (!paidMap.has(cId)) paidMap.set(cId, new Set());
                paidMap.get(cId).add(data.date); // date format: YYYY-MM-DD
            }
        });

        let html = "";
        let totalMissedCustomers = 0;

        // 2. हर कस्टमर के लिए Missed Dates निकालें
        custSnapshot.forEach(doc => {
            const cust = doc.data();
            const id = doc.id;
            
            // अगर अकाउंट बंद है तो छोड़ें
            if (cust.status === "Closed") return;

            const loanDate = new Date(cust.loanDate);
            const today = new Date();
            
            // कितने दिन हुए (diffDays)
            let diffDays = Math.floor((today - loanDate) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) diffDays = 0;
            
            // 🔥 FIX: आज के दिन का EMI भी गिना जाएगा (ताकि आज लोन देने पर भी Due दिखे)
            let daysElapsed = Math.max(0, diffDays) + 1; 

            const paidSet = paidMap.get(id) || new Set();
            const missedDates = [];

            // लोन डेट से लेकर आज तक की सारी तारीखों पर लूप करें
            for (let i = 0; i < daysElapsed; i++) {
                const d = new Date(loanDate);
                d.setDate(d.getDate() + i);
                const dateStr = d.toISOString().split('T')[0];
                
                // अगर इस तारीख को पेमेंट नहीं किया तो इसे Missed में डालें
                if (!paidSet.has(dateStr)) {
                    missedDates.push(dateStr);
                }
            }

            // अगर कोई Missed Date है तो ही लिस्ट में दिखाएं
            if (missedDates.length > 0) {
                totalMissedCustomers++;
                // डेट्स को कॉमा से जोड़कर एक स्ट्रिंग बनाएं (Alert में दिखाने के लिए)
                const missedStr = missedDates.join(', ');

                html += `
                    <div class="missed-item" onclick="showMissedDetails('${cust.name}', '${missedStr}')">
                        <div>
                            <span class="name">${cust.name}</span>
                            <span style="font-size: 12px; color: var(--text-muted); margin-left: 10px;">📅 Missed: ${missedDates.length} days</span>
                        </div>
                        <span class="badge">View</span>
                    </div>
                `;
            }
        });

        // 3. UI अपडेट करें
        if (totalMissedCustomers === 0) {
            loadingEl.innerText = "✅ सभी ने समय पर पेमेंट किया है!";
            listEl.innerHTML = "";
        } else {
            loadingEl.innerText = `📌 ${totalMissedCustomers} कस्टमर की मिस्ड डेट्स हैं:`;
            listEl.innerHTML = html;
        }

        // ✅ ग्लोबल फंक्शन डिफाइन करें (Alert दिखाने के लिए)
        window.showMissedDetails = (name, dates) => {
            // dates कॉमा सेपरेटेड स्ट्रिंग है, हम उसे अलग-अलग लाइनों में बदलते हैं
            const dateArray = dates.split(', ');
            const dateList = dateArray.join('\n  • ');
            alert(`📋 ${name} की Missed तारीखें:\n\n  • ${dateList}`);
        };

    } catch (err) {
        console.error("Missed Dates Error:", err);
        loadingEl.innerText = "❌ डेटा लोड नहीं हुआ: " + err.message;
        listEl.innerHTML = "";
    }
}

// =========================================================
// 3️⃣ ऐप लोड होने पर सब कुछ रन करें
// =========================================================
window.refreshApp = () => window.location.reload();

window.addEventListener('DOMContentLoaded', () => {
    loadDashboard(); // पुराना स्टैट्स
    // थोड़ी देर बाद Missed Summary लोड करें (ताकि मुख्य डैशबोर्ड पहले दिखे)
    setTimeout(() => loadMissedDatesSummary(), 500);
});
