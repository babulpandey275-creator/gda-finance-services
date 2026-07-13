// ==========================================
// 🚀 GDA FINANCE - REPORT ENGINE (STRICT BUSINESS SYSTEM FIXED)
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

        let currentMode = "Monthly"; // Default mode set to Monthly
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
                // 1. Filtered Expenses
                let expensesSum = 0;
                const expSnapshot = await getDocs(collection(db, "expenses"));
                expSnapshot.forEach(doc => {
                    const d = doc.data();
                    if (d.date && d.date >= startDateStr && d.date <= endDateStr) {
                        expensesSum += Number(d.amount || 0);
                    }
                });

                // 2. Collections Data Stream
                let lifetimeCollectionUptoTarget = 0;
                let rangeCollectionSum = 0;
                let todayCollectedForOverdue = 0;

                const collectSnapshot = await getDocs(collection(db, "collections"));
                collectSnapshot.forEach(doc => {
                    const d = doc.data();
                    const amt = Number(d.amount || 0);

                    if (d.date && d.date <= targetDate) {
                        lifetimeCollectionUptoTarget += amt;
                    }
                    if (d.date && d.date === targetDate) {
                        todayCollectedForOverdue += amt;
                    }
                    if (d.date && d.date >= startDateStr && d.date <= endDateStr) {
                        rangeCollectionSum += amt;
                    }
                });

                // 3. Customers Data Processing
                const custSnapshot = await getDocs(collection(db, "customers"));
                
                let lifetimeDisbursementUptoTarget = 0;
                let lifetimeInterestUptoTarget = 0;
                
                let rangeDisbursementSum = 0;
                let rangeInterestSum = 0;
                let rangeAccountsCount = 0;
                let totalTodayDemandCalculated = 0;

                custSnapshot.forEach(doc => {
                    const cust = doc.data();
                    const loanAmt = Number(cust.loanAmount || 0);
                    const emi = Number(cust.dailyEmi || cust.emi || 0);

                    if (cust.loanDate && cust.loanDate <= targetDate) {
                        lifetimeDisbursementUptoTarget += loanAmt;
                        lifetimeInterestUptoTarget += (loanAmt * 0.20);
                    }

                    if (cust.loanDate && cust.loanDate >= startDateStr && cust.loanDate <= endDateStr) {
                        rangeDisbursementSum += loanAmt;
                        rangeInterestSum += (loanAmt * 0.20);
                        if (cust.status !== "Closed") rangeAccountsCount++;
                    }

                    if (cust.status !== "Closed") {
                        totalTodayDemandCalculated += emi;
                    }
                });

                // 🧮 STRICT TARGET OVERDUE LOGIC BASED ON SELECTED MODE:
                let dynamicTotalOverdue = 0;
                if (currentMode === "Daily") {
                    // Daily me subah target ₹2200 dikhega, collection aane par minus hoga
                    dynamicTotalOverdue = Math.max(0, totalTodayDemandCalculated - todayCollectedForOverdue);
                } else if (currentMode === "Monthly") {
                    // Monthly me agar aaj ka live collection target ke barabar ya jyada ho gaya hai to 0 dikhayega
                    dynamicTotalOverdue = todayCollectedForOverdue >= totalTodayDemandCalculated ? 0 : Math.max(0, totalTodayDemandCalculated - todayCollectedForOverdue);
                } else {
                    dynamicTotalOverdue = Math.max(0, totalTodayDemandCalculated);
                }

                // Portfolio formulas (Kal tak ka collection perfectly minus hoga market cap se)
                const rawTotalMarketCap = lifetimeDisbursementUptoTarget + lifetimeInterestUptoTarget;
                const portfolioRemaining = Math.max(0, rawTotalMarketCap - lifetimeCollectionUptoTarget);
                const netProfitSum = rangeInterestSum - expensesSum;

                // Render metrics to UI elements
                if (totalPortfolio) totalPortfolio.innerText = `₹${portfolioRemaining}`;
                if (disbursement) disbursement.innerText = `₹${rangeDisbursementSum}`;
                if (collectionEl) collectionEl.innerText = `₹${rangeCollectionSum}`;
                if (interestIncome) interestIncome.innerText = `₹${rangeInterestSum}`;
                if (totalExpensesEl) totalExpensesEl.innerText = `₹${expensesSum}`;
                if (netProfit) netProfit.innerText = `₹${netProfitSum}`;
                if (totalDue) totalDue.innerText = `₹${dynamicTotalOverdue}`;
                if (newAccounts) newAccounts.innerText = rangeAccountsCount;

            } catch (err) { console.error("Report System Reload Failure:", err); }
        }

        if (btnDaily) btnDaily.onclick = () => { currentMode = "Daily"; updateTabUI(btnDaily); renderReportPipeline(); };
        if (btnMonthly) btnMonthly.onclick = () => { currentMode = "Monthly"; updateTabUI(btnMonthly); renderReportPipeline(); };
        if (btnQuarterly) btnQuarterly.onclick = () => { currentMode = "Quarterly"; updateTabUI(btnQuarterly); renderReportPipeline(); };
        if (btnYearly) btnYearly.onclick = () => { currentMode = "Yearly"; updateTabUI(btnYearly); renderReportPipeline(); };

        if (reportDatePicker) reportDatePicker.onchange = () => renderReportPipeline();

        await renderReportPipeline();
    });
}

window.addEventListener('DOMContentLoaded', loadReport);
