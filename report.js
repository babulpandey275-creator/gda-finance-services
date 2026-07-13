// ==========================================
// 🚀 GDA FINANCE - REPORT ENGINE (STRICT OVERDUE FIX)
// ==========================================

import { db, auth } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export async function loadReport() {
    const txtTotalDue = document.getElementById("txtTotalDue"); // Maps to Total Due Card
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    try {
        const collectSnapshot = await getDocs(collection(db, "collections"));
        let collectionMap = {};

        collectSnapshot.forEach(doc => {
            const data = doc.data();
            const colDate = data.date || "";
            const cId = (data.customerCode || data.customerId || data.customerName || data.name || "").toString().trim().toUpperCase();
            const amount = Number(data.amount || 0);

            if (cId && colDate && colDate <= todayIST) {
                collectionMap[cId] = (collectionMap[cId] || 0) + amount;
            }
        });

        const custSnapshot = await getDocs(collection(db, "customers"));
        let totalOverdue = 0;

        custSnapshot.forEach(doc => {
            const cust = doc.data();
            const emi = Number(cust.dailyEmi || cust.emi || 0);
            const loanAmount = Number(cust.loanAmount || 0);

            if (cust.status !== "Closed") {
                if (cust.loanDate && cust.loanDate <= todayIST) {
                    const start = new Date(cust.loanDate);
                    const end = new Date(todayIST);
                    const diffDays = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
                    
                    const expected = diffDays * emi;
                    const totalPayableLifetime = loanAmount + (loanAmount * 0.20);
                    const runningExpected = Math.min(expected, totalPayableLifetime);

                    const primaryDocId = doc.id.toString().trim().toUpperCase();
                    const customCode = (cust.customerCode || "").toString().trim().toUpperCase();
                    const custName = (cust.name || "").toString().trim().toUpperCase();

                    const paid = collectionMap[customCode] || collectionMap[primaryDocId] || collectionMap[custName] || 0;
                    const accountDue = runningExpected - paid;

                    if (accountDue > 0) {
                        totalOverdue += accountDue;
                    }
                }
            }
        });

        if (txtTotalDue) txtTotalDue.innerText = `₹${totalOverdue}`;

    } catch (err) { console.error("Report Sync Error:", err); }
}
window.addEventListener('DOMContentLoaded', loadReport);
