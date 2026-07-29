// ==========================================
// 🚀 GDA FINANCE - REPORT ENGINE (FIXED OVERDUE)
// ==========================================

import { db, auth } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export async function loadReport() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) { window.location.href = "login.html"; return; }

        const totalPortfolio = document.getElementById("totalPortfolio");
        const disbursement = document.getElementById("disbursement");
        const collectionEl = document.getElementById("collection");
        const interestIncome = document.getElementById("interestIncome");
        const totalExpensesEl = document.getElementById("totalExpenses");
        const netProfit = document.getElementById("netProfit");
        const totalDue = document.getElementById("totalDue");
        const newAccounts = document.getElementById("newAccounts");
        
        const reportDatePicker = document.getElementById("reportDatePicker");
        const dateLabel = document.getElementById("dateLabel");

        const btnDaily = document.getElementById("btnDaily");
        const btnMonthly = document.getElementById("btnMonthly");
        const btnQuarterly = document.getElementById("btnQuarterly");
        const btnYearly = document.getElementById("btnYearly");

        let currentMode = "Monthly";
        const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        if (reportDatePicker && !reportDatePicker.value) {
            reportDatePicker.value = todayIST;
        }

        function updateTabUI(activeBtn) {
            [btnDaily, btnMonthly, btnQuarterly, btnYearly].forEach(btn => {
                if (btn) btn.classList.remove("active");
            });
            if (activeBtn) activeBtn.classList.add("active");
        }

        // 🔥 नया फंक्शन – Overdue Calculation (बिल्कुल Dashboard जैसा)
        function calculateTotalOverdue(customers, targetDateStr) {
            const targetDate = new Date(targetDateStr);
            let totalDue = 0;
            customers.forEach(cust => {
                if (cust.status === "Closed") return;
                const dailyEmi = Number(cust.dailyEmi || cust.emi || 0);
                if (dailyEmi <= 0) return;

                const loanDate = new Date(cust.loanDate || cust.startDate || targetDateStr);
                let diffDays = Math.floor((targetDate - loanDate) / (1000 * 60 * 60 * 24));
                let daysElapsed = Math.max(0, diffDays) + 1;
                const planDur = Number(cust.planDuration || cust.duration || 60);
                if (daysElapsed > planDur) daysElapsed = planDur;

                const expectedAmt = daysElapsed * dailyEmi;
                const totalPaid = Number(cust.totalCollected || 0);
                const currentDue = Math.max(0, expectedAmt - totalPaid);
                totalDue += currentDue;
            });
            return totalDue;
        }

        async function renderReportPipeline() {
            const targetDate = reportDatePicker ? reportDatePicker.value : todayIST;
            
            let startDateStr = "0000-00-00";
            let endDateStr = targetDate;

            const parsedDate = new Date(targetDate);
            const yyyy = parsedDate.getFullYear();
            const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');

            if (currentMode === "Daily") {
                startDateStr = targetDate;
                if (dateLabel) dateLabel.innerText = "Daily Report for:";
            } else if (currentMode === "Monthly") {
                startDateStr = `${yyyy}-${mm}-01`;
                const lastDay = new Date(yyyy, parsedDate.getMonth() + 1, 0).getDate();
                endDateStr = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
                if (dateLabel) dateLabel.innerText = "Monthly Report for:";
            } else if (currentMode === "Yearly") {
                startDateStr = `${yyyy}-01-01`;
                endDateStr = `${yyyy}-12-31`;
                if (dateLabel) dateLabel.innerText = "Yearly Report for:";
            }

            try {
                // 1. Expenses
                let expensesSum = 0;
                const expSnapshot = await getDocs(collection(db, "expenses"));
                expSnapshot.forEach(doc => {
                    const d = doc.data();
                    if (d.date && d.date >= startDateStr && d.date <= endDateStr) {
                        expensesSum += Number(d.amount || 0);
                    }
                });

                // 2. Collections
                let lifetimeCollectionUptoTarget = 0;
                let rangeCollectionSum = 0;

                const collectSnapshot = await getDocs(collection(db, "collections"));
                collectSnapshot.forEach(doc => {
                    const d = doc.data();
                    const amt = Number(d.amount || 0);

                    if (d.date && d.date <= targetDate) {
                        lifetimeCollectionUptoTarget += amt;
                    }
                    if (d.date && d.date >= startDateStr && d.date <= endDateStr) {
                        rangeCollectionSum += amt;
                    }
                });

                // 3. Customers
                const custSnapshot = await getDocs(collection(db, "customers"));
                
                let lifetimeDisbursementUptoTarget = 0;
                let lifetimeInterestUptoTarget = 0;
                
                let rangeDisbursementSum = 0;
                let rangeInterestSum = 0;
                let rangeAccountsCount = 0;

                const allCustomers = [];

                custSnapshot.forEach(doc => {
                    const cust = doc.data();
                    const loanAmt = Number(cust.loanAmount || 0);
                    const emi = Number(cust.dailyEmi || cust.emi || 0);

                    // Store for overdue calculation
                    allCustomers.push({ ...cust, id: doc.id });

                    if (cust.loanDate && cust.loanDate <= targetDate) {
                        lifetimeDisbursementUptoTarget += loanAmt;
                        lifetimeInterestUptoTarget += (loanAmt * 0.20);
                    }

                    if (cust.loanDate && cust.loanDate >= startDateStr && cust.loanDate <= endDateStr) {
                        rangeDisbursementSum += loanAmt;
                        rangeInterestSum += (loanAmt * 0.20);
                        if (cust.status !== "Closed") rangeAccountsCount++;
                    }
                });

                // 🔥 Overdue Calculation – Dashboard Style
                const totalOverdue = calculateTotalOverdue(allCustomers, targetDate);

                // Portfolio & Profit
                const rawTotalMarketCap = lifetimeDisbursementUptoTarget + lifetimeInterestUptoTarget;
                const portfolioRemaining = Math.max(0, rawTotalMarketCap - lifetimeCollectionUptoTarget);
                const netProfitSum = rangeInterestSum - expensesSum;

                // Render UI
                if (totalPortfolio) totalPortfolio.innerText = `₹${Math.round(portfolioRemaining).toLocaleString('en-IN')}`;
                if (disbursement) disbursement.innerText = `₹${Math.round(rangeDisbursementSum).toLocaleString('en-IN')}`;
                if (collectionEl) collectionEl.innerText = `₹${Math.round(rangeCollectionSum).toLocaleString('en-IN')}`;
                if (interestIncome) interestIncome.innerText = `₹${Math.round(rangeInterestSum).toLocaleString('en-IN')}`;
                if (totalExpensesEl) totalExpensesEl.innerText = `₹${Math.round(expensesSum).toLocaleString('en-IN')}`;
                if (netProfit) netProfit.innerText = `₹${Math.round(netProfitSum).toLocaleString('en-IN')}`;
                if (totalDue) totalDue.innerText = `₹${Math.round(totalOverdue).toLocaleString('en-IN')}`;  // ✅ अब Dashboard जैसा
                if (newAccounts) newAccounts.innerText = rangeAccountsCount;

            } catch (err) { console.error("Report System Reload Failure:", err); }
        }

        // Event Listeners
        if (btnDaily) btnDaily.onclick = () => { currentMode = "Daily"; updateTabUI(btnDaily); renderReportPipeline(); };
        if (btnMonthly) btnMonthly.onclick = () => { currentMode = "Monthly"; updateTabUI(btnMonthly); renderReportPipeline(); };
        if (btnQuarterly) btnQuarterly.onclick = () => { currentMode = "Quarterly"; updateTabUI(btnQuarterly); renderReportPipeline(); };
        if (btnYearly) btnYearly.onclick = () => { currentMode = "Yearly"; updateTabUI(btnYearly); renderReportPipeline(); };

        if (reportDatePicker) reportDatePicker.onchange = () => renderReportPipeline();

        await renderReportPipeline();
    });
}

window.addEventListener('DOMContentLoaded', loadReport);
