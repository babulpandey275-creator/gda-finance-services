// ==========================================
// 🚀 GDA FINANCE - FINANCIAL REPORT ENGINE (EXACT ID MATCHED)
// ==========================================

import { db, auth } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export async function loadReport() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "login.html";
            return;
        }

        // 🎯 EXACT DYNAMIC HTML MAPPING MATCHED BY YOUR HTML FILE IDs
        const totalPortfolio = document.getElementById("totalPortfolio");
        const disbursement = document.getElementById("disbursement");
        const collectionEl = document.getElementById("collection");
        const interestIncome = document.getElementById("interestIncome");
        const totalExpensesEl = document.getElementById("totalExpenses");
        const netProfit = document.getElementById("netProfit");
        const totalDue = document.getElementById("totalDue");
        const newAccounts = document.getElementById("newAccounts");

        // Input Date Field configuration setup
        const reportDatePicker = document.getElementById("reportDatePicker");
        const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        if (reportDatePicker && !reportDatePicker.value) {
            reportDatePicker.value = todayIST;
        }

        try {
            // 1. Fetch Expenses Collection sum total
            let totalExpensesSum = 0;
            try {
                const expSnapshot = await getDocs(collection(db, "expenses"));
                expSnapshot.forEach(doc => {
                    totalExpensesSum += Number(doc.data().amount || 0);
                });
            } catch (e) {
                console.error("Expenses sub-fetch bypassed:", e);
            }

            // 2. Fetch Live Customers Master Pipeline
            const custSnapshot = await getDocs(collection(db, "customers"));
            
            let totalDisbursementSum = 0; 
            let totalCollectionSum = 0;   
            let totalInterestSum = 0;     
            let activeAccountsCount = 0;
            let totalOverdueCalculated = 0;

            custSnapshot.forEach(doc => {
                const cust = doc.data();
                const loanAmt = Number(cust.loanAmount || 0);
                const emi = Number(cust.dailyEmi || cust.emi || 0);
                
                // Directly mapped field synchronizers verified from Firestore console logs
                const paid = Number(cust.paidAmount || cust.totalCollected || 0);

                if (cust.status !== "Closed") {
                    activeAccountsCount++;
                }

                totalDisbursementSum += loanAmt;
                totalCollectionSum += paid;
                totalInterestSum += (loanAmt * 0.20);

                // Precise Calendar timeline tracking defaulter logic calculation
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

            // Standard Matrix Formulations
            const portfolioTotal = totalDisbursementSum + totalInterestSum;
            const netProfitSum = totalInterestSum - totalExpensesSum;

            // 📊 DOM RENDER ENGINE INJECTIONS
            if (totalPortfolio) totalPortfolio.innerText = `₹${portfolioTotal}`;
            if (disbursement) disbursement.innerText = `₹${totalDisbursementSum}`;
            if (collectionEl) collectionEl.innerText = `₹${totalCollectionSum}`;
            if (interestIncome) interestIncome.innerText = `₹${totalInterestSum}`;
            if (totalExpensesEl) totalExpensesEl.innerText = `₹${totalExpensesSum}`;
            if (netProfit) netProfit.innerText = `₹${netProfitSum}`;
            if (totalDue) totalDue.innerText = `₹${totalOverdueCalculated}`;
            if (newAccounts) newAccounts.innerText = activeAccountsCount;

        } catch (err) {
            console.error("Report Absolute Master Pipeline Failure:", err);
        }
    });
}

window.addEventListener('DOMContentLoaded', loadReport);
