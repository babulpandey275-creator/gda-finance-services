// ==========================================
// 🚀 GDA FINANCE - FINANCIAL REPORT ENGINE (FIXED ABSOLUTE ZERO BUG)
// ==========================================

import { db, auth } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export async function loadReport() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "login.html";
            return;
        }

        // Target UI Elements mapping
        const txtTotalPortfolio = document.getElementById("txtTotalPortfolio");
        const txtDisbursement = document.getElementById("txtDisbursement");
        const txtCollection = document.getElementById("txtCollection");
        const txtInterestIncome = document.getElementById("txtInterestIncome");
        const txtExpenses = document.getElementById("txtExpenses");
        const txtNetProfit = document.getElementById("txtNetProfit");
        const txtTotalDue = document.getElementById("txtTotalDue");
        const txtNewAccounts = document.getElementById("txtNewAccounts");

        const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        try {
            // 1. Fetch Expenses Sum
            let totalExpenses = 0;
            try {
                const expSnapshot = await getDocs(collection(db, "expenses"));
                expSnapshot.forEach(doc => {
                    const data = doc.data();
                    totalExpenses += Number(data.amount || 0);
                });
            } catch (e) {
                console.error("Expenses sub-fetch bypassed:", e);
            }

            // 2. Process Core Customer Data Stream Directly (Bypassing aggressive string locks)
            const custSnapshot = await getDocs(collection(db, "customers"));
            
            let totalDisbursement = 0; // Total Loan Principal given out
            let totalCollection = 0;   // Total EMI collected back till date
            let totalInterest = 0;     // Total expected interest generated
            let activeAccounts = 0;
            let totalOverdueCalculated = 0;

            custSnapshot.forEach(doc => {
                const cust = doc.data();
                const loanAmt = Number(cust.loanAmount || 0);
                const emi = Number(cust.dailyEmi || cust.emi || 0);
                
                // Read directly from the accurate database fields verified earlier
                const paid = Number(cust.paidAmount || cust.totalCollected || 0);

                if (cust.status !== "Closed") {
                    activeAccounts++;
                }

                // Cumulative dynamic metrics computation
                totalDisbursement += loanAmt;
                totalCollection += paid;
                totalInterest += (loanAmt * 0.20);

                // Safe Real-time Due Estimation Pipeline
                if (cust.status !== "Closed" && cust.loanDate && cust.loanDate <= todayIST) {
                    const start = new Date(cust.loanDate);
                    const end = new Date(todayIST);
                    const diffDays = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
                    
                    const expectedTotalTillToday = diffDays * emi;
                    const maxPayableLifetime = loanAmt + (loanAmt * 0.20);
                    const runningExpected = Math.min(expectedTotalTillToday, maxPayableLifetime);
                    
                    const individualDue = runningExpected - paid;
                    if (individualDue > 0) {
                        totalOverdueCalculated += individualDue;
                    }
                }
            });

            // Master Portfolio calculations
            const totalPortfolioValue = totalDisbursement + totalInterest;
            const netProfitValue = totalInterest - totalExpenses;

            // 📊 Direct UI Content Injection Mapping
            if (txtTotalPortfolio) txtTotalPortfolio.innerText = `₹${totalPortfolioValue}`;
            if (txtDisbursement) txtDisbursement.innerText = `₹${totalDisbursement}`;
            if (txtCollection) txtCollection.innerText = `₹${totalCollection}`;
            if (txtInterestIncome) txtInterestIncome.innerText = `₹${totalInterest}`;
            if (txtExpenses) txtExpenses.innerText = `₹${totalExpenses}`;
            if (txtNetProfit) txtNetProfit.innerText = `₹${netProfitValue}`;
            if (txtTotalDue) txtTotalDue.innerText = `₹${totalOverdueCalculated}`;
            if (txtNewAccounts) txtNewAccounts.innerText = activeAccounts;

        } catch (err) {
            console.error("Report Absolute Master Pipeline Failure:", err);
        }
    });
}

window.addEventListener('DOMContentLoaded', loadReport);
