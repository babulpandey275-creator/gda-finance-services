// ==========================================
// 🚀 GDA FINANCE - DASHBOARD ENGINE (REFRESH, PASSWORD & OVERDUE TOTAL FIX)
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

// 🔄 1. REFRESH BUTTON ACTION (FIXED)
// स्क्रीन पर दिख रहे Refresh बटन की कार्यक्षमता को वापस चालू करना
const refreshBtn = document.querySelector(".btn-refresh") || document.getElementById("refreshBtn") || document.querySelector("button[onclick*='refresh']");
if (refreshBtn || document.querySelector(".refresh-btn")) {
    const targetBtn = refreshBtn || document.querySelector(".refresh-btn");
    targetBtn.onclick = (e) => {
        e.preventDefault();
        window.location.reload();
    };
} else {
    // Fallback: If it's a generic upper right corner button as shown in your header
    const upperRightBtn = document.querySelector("button"); 
    if (upperRightBtn && upperRightBtn.innerText.includes("Refresh")) {
        upperRightBtn.onclick = () => window.location.reload();
    }
}

// 🔐 2. CHANGE PASSWORD REDIRECTION FALLBACK
// अगर आपके HTML में पासवर्ड बदलने का लिंक मिसिंग है, तो उसे नेविगेशन बार में सुरक्षित तरीके से जोड़ना
window.addEventListener('load', () => {
    const logoutBtn = document.getElementById("logoutBtn") || document.querySelector("a[href='logout.html']");
    if (logoutBtn && !document.getElementById("changePasswordLink")) {
        const changePass = document.createElement("a");
        changePass.id = "changePasswordLink";
        changePass.href = "change-password.html";
        changePass.innerText = "🔑 Change Password";
        changePass.style.cssText = "display: block; text-align: center; margin-top: 10px; color: #1565c0; font-weight: bold; font-size: 14px; text-decoration: none;";
        logoutBtn.parentNode.insertBefore(changePass, logoutBtn);
    }
});

window.addEventListener('DOMContentLoaded', loadDashboard);
