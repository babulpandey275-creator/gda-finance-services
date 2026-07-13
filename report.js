// ==========================================
// 🚀 GDA FINANCE - REPORT ENGINE (TOTAL OVERDUE ACCUMULATION FIX)
// ==========================================

import { db, auth } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export async function loadReport() {
    const txtTotalDue = document.getElementById("txtTotalDue"); 
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    try {
        const collectSnapshot = await getDocs(collection(db, "collections"));
        let allCollections = [];

        collectSnapshot.forEach(doc => {
            const data = doc.data();
            const colDate = data.date || "";
            const amount = Number(data.amount || 0);

            const rawCustId = (data.customerId || "").toString().trim();
            const rawCustCode = (data.customerCode || "").toString().trim();
            const rawCustName = (data.customerName || data.name || "").toString().trim();

            if (colDate && colDate <= todayIST) {
                allCollections.push({
                    custId: rawCustId,
                    custCode: rawCustCode,
                    custName: rawCustName,
                    amount: amount
                });
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

                    const pDocId = doc.id.toString().trim();
                    const cCode = (cust.customerCode || "").toString().trim();
                    const cName = (cust.name || "").toString().trim();

                    let totalPaidForThisCustomer = 0;
                    allCollections.forEach(col => {
                        if (
                            (col.custId && col.custId === pDocId) || 
                            (col.custCode && col.custCode === cCode) || 
                            (col.custName && col.custName === cName)
                        ) {
                            totalPaidForThisCustomer += col.amount;
                        }
                    });

                    const accountDue = runningExpected - totalPaidForThisCustomer;

                    if (accountDue > 0) {
                        totalOverdue += accountDue;
                    }
                }
            }
        });

        if (txtTotalDue) txtTotalDue.innerText = `₹${totalOverdue}`;

    } catch (err) { 
        console.error("Report Sync Error:", err); 
    }
}
window.addEventListener('DOMContentLoaded', loadReport);
