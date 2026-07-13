// ==========================================
// 🚀 GDA FINANCE - REPORT ENGINE (STRICT BUSINESS LOGIC PORFOLIO FIX)
// ==========================================

import { db, auth } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export async function loadReport() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "login.html";
            return;
        }

        // HTML elements mapping
        const totalPortfolio = document.getElementById("totalPortfolio");
        const disbursement = document.getElementById("disbursement");
        const collectionEl = document.getElementById("collection");
        const interestIncome = document.getElementById("interestIncome");
        const totalExpensesEl = document.getElementById("totalExpenses");
        const netProfit = document.getElementById("netProfit");
        const totalDue = document.getElementById("totalDue");
        const newAccounts = document.getElementById("newAccounts");
        const reportDatePicker = document.getElementById("reportDatePicker");

        const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        if (reportDatePicker && !reportDatePicker.value) {
            reportDatePicker.value = todayIST;
        }

        async function renderFilteredData() {
            const targetDate = reportDatePicker ? reportDatePicker.value : todayIST;

            try {
                // 1. Fetch Expenses Sum (Strictly for Net Profit, completely detached from Portfolio)
                let totalExpensesSum = 0;
                try {
                    const expSnapshot = await getDocs(collection(db, "expenses"));
                    expSnapshot.forEach(doc => {
                        const data = doc.data();
                        if (data.date && data.date <= targetDate) {
                            totalExpensesSum += Number(data.amount || 0);
                        }
                    });
                } catch (e) { console.error(e); }

                // 2. Fetch Collections Log up to the selected target date
                let totalCollectionSum = 0;
                try {
                    const collectSnapshot = await getDocs(collection(db, "collections"));
                    collectSnapshot.forEach(doc => {
                        const data = doc.data();
                        if (data.date && data.date <= targetDate) {
                            totalCollectionSum += Number(data.amount || 0);
                        }
                    });
                } catch (e) { console.error(e); }

                // 3. Process Customers Portfolio and Timelines
                const custSnapshot = await getDocs(collection(db, "customers"));
                
                let totalDisbursementSum = 0; 
                let totalInterestSum = 0;     
                let activeAccountsCount = 0;
                let totalOverdueCalculated = 0;

                custSnapshot.forEach(doc => {
                    const cust = doc.data();
                    if (cust.loanDate && cust.loanDate <= targetDate) {
                        const loanAmt = Number(cust.loanAmount || 0);
                        const emi = Number(cust.dailyEmi || cust.emi || 0);
                        const paid = Number(cust.paidAmount || cust.totalCollected || 0);

                        if (cust.status !== "Closed") {
                            activeAccountsCount++;
                        }

                        // Aggregate total baseline business constants
                        totalDisbursementSum += loanAmt;
                        totalInterestSum += (loanAmt * 0.20);

                        // Overdue tracking configuration
                        if (cust.status !== "Closed") {
                            const start = new Date(cust.loanDate);
                            const end = new Date(targetDate);
                            const diffDays = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
                            
                            const expectedTotal = diffDays * emi;
                            const maxPayableLifetime = loanAmt + (loanAmt * 0.20);
                            const runningExpected = Math.min(expectedTotal, maxPayableLifetime);
                            
                            const individualDue = runningExpected - paid;
                            if (individualDue > 0) {
                                totalOverdueCalculated += individualDue;
                            }
                        }
                    }
                });

                // 🧮 BUSINESS RULE LOGIC:
                // Portfolio grows with Disbursement + Interest, and shrinks strictly by Collections ONLY. Expenses have 0% impact here.
                const totalMarketCap = totalDisbursementSum + totalInterestSum;
                const dynamicPortfolioRemaining = Math.max(0, totalMarketCap - totalCollectionSum);
                
                // Net Profit calculation takes the hit from Expenses
                const netProfitSum = totalInterestSum - totalExpensesSum;

                // 📊 DOM Injection
                if (totalPortfolio) totalPortfolio.innerText = `₹${dynamicPortfolioRemaining}`;
                if (disbursement) disbursement.innerText = `₹${totalDisbursementSum}`;
                if (collectionEl) collectionEl.innerText = `₹${totalCollectionSum}`;
                if (interestIncome) interestIncome.innerText = `₹${totalInterestSum}`;
                if (totalExpensesEl) totalExpensesEl.innerText = `₹${totalExpensesSum}`;
                if (netProfit) netProfit.innerText = `₹${netProfitSum}`;
                if (totalDue) totalDue.innerText = `₹${totalOverdueCalculated}`;
                if (newAccounts) newAccounts.innerText = activeAccountsCount;

            } catch (err) {
                console.error("Report System Reload Failure:", err);
            }
        }

        if (reportDatePicker) {
            reportDatePicker.onchange = () => {
                renderFilteredData();
            };
        }

        await renderFilteredData();
    });
}

window.addEventListener('DOMContentLoaded', loadReport);
