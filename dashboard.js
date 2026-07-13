// ==========================================
// 🚀 GDA FINANCE - DASHBOARD MASTER ENGINE (ALL IN ONE FIX)
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
            // 1. Calculate Today's Live Collection from Payments Table
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

            // 2. Process Customers using Correct Database Fields
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

                        // Direct alignment with your exact database field 'paidAmount'
                        const totalPaid = Number(cust.paidAmount || cust.totalCollected || 0);
                        
                        const accountDue = runningExpected - totalPaid;
                        
                        if (accountDue > 0) {
                            missedCount++;
                            totalOverdue += accountDue;
                        }
                    }
                }
            });

            // UI Rendering Control Block
            if (txtTodayCollected) txtTodayCollected.innerText = `₹${todayCollected} / ₹${totalDemand}`;
            if (txtTodayDemand) txtTodayDemand.innerText = `₹${totalDemand}`;
            if (txtTodayMissed) txtTodayMissed.innerText = `₹${totalOverdue}`;
            if (txtActiveAccounts) txtActiveAccounts.innerText = active;
            if (lblDueCount) lblDueCount.innerText = missedCount;

        } catch (err) { 
            console.error("Dashboard Load Error: ", err); 
        }
    });
}

// 🔄 1. REFRESH BUTTON ACTION
// स्क्रीन पर दिख रहे Refresh बटन को पूरी तरह एक्टिवेट करना
window.addEventListener('load', () => {
    const refreshBtn = document.querySelector(".btn-refresh") || document.getElementById("refreshBtn") || document.querySelector(".refresh-btn");
    if (refreshBtn) {
        refreshBtn.style.cursor = "pointer";
        refreshBtn.onclick = (e) => {
            e.preventDefault();
            window.location.reload();
        };
    }
    
    // Header generic button fallback (Top Right Corner)
    const allButtons = document.querySelectorAll("button");
    allButtons.forEach(btn => {
        if (btn.innerText.includes("Refresh")) {
            btn.style.cursor = "pointer";
            btn.onclick = () => window.location.reload();
        }
    });
});

// 🔑 2. PASSWORD LINK ROUTING CONTROLLER (BOTH LOCATIONS ACTIVATED)
window.addEventListener('load', () => {
    // A. बॉटम नेविगेशन वाले चेंज पासवर्ड बटन को चालू करना
    const bottomChangePassBtn = document.querySelector("a[href*='Password']") || 
                                 document.getElementById("changePasswordBtn") || 
                                 Array.from(document.querySelectorAll('a, div, span, p')).find(el => el.textContent.includes('Change Password'));
    
    if (bottomChangePassBtn) {
        bottomChangePassBtn.style.cursor = "pointer";
        bottomChangePassBtn.onclick = (e) => {
            e.preventDefault();
            window.location.href = "change-password.html";
        };
    }

    // B. Collection History कार्ड के ठीक नीचे नया शॉर्टकट बटन जोड़ना
    const collectionHistoryCard = document.querySelector("a[href='collection-history.html']") || 
                                   document.querySelector("div[onclick*='history']") || 
                                   Array.from(document.querySelectorAll('div, a')).find(el => el.textContent.includes('Collection History'));
    
    if (collectionHistoryCard && !document.getElementById("dashboardDirectPassLink")) {
        const passContainer = document.createElement("div");
        passContainer.id = "dashboardDirectPassLink";
        passContainer.style.cssText = "max-width: 450px; margin: 15px auto; padding: 12px; background: #fff; border-radius: 12px; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.05); cursor: pointer; border-left: 5px solid #1565c0;";
        
        passContainer.innerHTML = `<span style="font-weight: bold; color: #1565c0; font-size: 15px;">🔑 Security: Change Account Password ➔</span>`;
        
        passContainer.onclick = () => {
            window.location.href = "change-password.html";
        };
        
        // Insert right below Collection History Card safely
        collectionHistoryCard.parentNode.insertBefore(passContainer, collectionHistoryCard.nextSibling);
    }
});

window.addEventListener('DOMContentLoaded', loadDashboard);
