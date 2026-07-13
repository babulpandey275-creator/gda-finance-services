import { db, auth } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export async function loadReport() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) { window.location.href = "login.html"; return; }

        // Core Layout Mappings
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

        // Tab Buttons
        const btnDaily = document.getElementById("btnDaily");
        const btnMonthly = document.getElementById("btnMonthly");
        const btnQuarterly = document.getElementById("btnQuarterly");
        const btnYearly = document.getElementById("btnYearly");

        let currentMode = "Monthly"; // Default mode selection
        const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        if (reportDatePicker && !reportDatePicker.value) {
            reportDatePicker.value = todayIST;
        }

        // Handle Active states on UI buttons
        function updateTabUI(activeBtn) {
            [btnDaily, btnMonthly, btnQuarterly, btnYearly].forEach(btn => {
                if (btn) btn.classList.remove("active");
            });
            if (activeBtn) activeBtn.classList.add("active");
        }

        async function renderReportPipeline() {
            const targetDate = reportDatePicker ? reportDatePicker.value : todayIST;
            
            // Generate exact date scopes based on filter tabs
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
                // 1. Core Expenses Calculations
                let expensesSum = 0;
                const expSnapshot = await getDocs(collection(db, "expenses"));
                expSnapshot.forEach(doc => {
                    const d = doc.data();
                    if (d.date && d.date >= startDateStr && d.date <= endDateStr) {
                        expensesSum += Number(d.amount || 0);
                    }
                });

                // 2. Cumulative Global Collection up to Target (For absolute Portfolio calculations)
                let lifetimeCollectionUptoTarget = 0;
                let rangeCollectionSum = 0;
                let collectionTracker = {};

                const collectSnapshot = await getDocs(collection(db, "collections"));
                collectSnapshot.forEach(doc => {
                    const d = doc.data();
                    const amt = Number(d.amount || 0);
                    const pDocId = (d.customerId || "").toString().trim();

                    if (d.date && d.date <= targetDate) {
                        lifetimeCollectionUptoTarget += amt;
                        if (pDocId) {
                            collectionTracker[pDocId] = (collectionTracker[pDocId] || 0) + amt;
                        }
                    }
                    if (d.date && d.date >= startDateStr && d.date <= endDateStr) {
                        rangeCollectionSum += amt;
                    }
                });

                // 3. Process Customers Data
                const custSnapshot = await getDocs(collection(db, "customers"));
                
                let lifetimeDisbursementUptoTarget = 0;
                let lifetimeInterestUptoTarget = 0;
                
                let rangeDisbursementSum = 0;
                let rangeInterestSum = 0;
                let rangeAccountsCount = 0;
                let totalOverdueCalculated = 0;

                custSnapshot.forEach(doc => {
                    const cust = doc.data();
                    const loanAmt = Number(cust.loanAmount || 0);
                    const emi = Number(cust.dailyEmi || cust.emi || 0);
                    const pDocId = doc.id.toString().trim();

                    // Lifetime parameters for accurate Remaining Portfolio scaling
                    if (cust.loanDate && cust.loanDate <= targetDate) {
                        lifetimeDisbursementUptoTarget += loanAmt;
                        lifetimeInterestUptoTarget += (loanAmt * 0.20);
                    }

                    // Scoped Range configurations
                    if (cust.loanDate && cust.loanDate >= startDateStr && cust.loanDate <= endDateStr) {
                        rangeDisbursementSum += loanAmt;
                        rangeInterestSum += (loanAmt * 0.20);
                        if (cust.status !== "Closed") rangeAccountsCount++;
                    }

                    // Strict Back-Date/Target Date Defaulter Calculation Logic
                    if (cust.status !== "Closed" && cust.loanDate && cust.loanDate <= targetDate) {
                        const start = new Date(cust.loanDate);
                        const end = new Date(targetDate);
                        const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
                        
                        if (diffDays >= 0) {
                            const expectedTotal = diffDays * emi;
                            const maxPayable = loanAmt + (loanAmt * 0.20);
                            const runningExpected = Math.min(expectedTotal, maxPayable);
                            
                            const paidUptoTarget = collectionTracker[pDocId] || Number(cust.paidAmount || cust.totalCollected || 0);
                            const individualDue = runningExpected - paidUptoTarget;
                            if (individualDue > 0) {
                                totalOverdueCalculated += individualDue;
                            }
                        }
                    }
                });

                // 🧮 BUSINESS COMPUTATIONS
                // Remaining Portfolio = (Lifetime Disbursed + Lifetime Interest) - Lifetime Collected
                const rawTotalMarketCap = lifetimeDisbursementUptoTarget + lifetimeInterestUptoTarget;
                const portfolioRemaining = Math.max(0, rawTotalMarketCap - lifetimeCollectionUptoTarget);
                
                // Net Profit reflects the filtered date range context
                const netProfitSum = rangeInterestSum - expensesSum;

                // DOM rendering updates
                if (totalPortfolio) totalPortfolio.innerText = `₹${portfolioRemaining}`;
                if (disbursement) disbursement.innerText = `₹${rangeDisbursementSum}`;
                if (collectionEl) collectionEl.innerText = `₹${rangeCollectionSum}`;
                if (interestIncome) interestIncome.innerText = `₹${rangeInterestSum}`;
                if (totalExpensesEl) totalExpensesEl.innerText = `₹${expensesSum}`;
                if (netProfit) netProfit.innerText = `₹${netProfitSum}`;
                if (totalDue) totalDue.innerText = `₹${totalOverdueCalculated}`;
                if (newAccounts) newAccounts.innerText = rangeAccountsCount;

            } catch (err) { console.error("Report Refresh Core Error:", err); }
        }

        // Attach Event Triggers to Tabs Controls
        if (btnDaily) btnDaily.onclick = () => { currentMode = "Daily"; updateTabUI(btnDaily); renderReportPipeline(); };
        if (btnMonthly) btnMonthly.onclick = () => { currentMode = "Monthly"; updateTabUI(btnMonthly); renderReportPipeline(); };
        if (btnQuarterly) btnQuarterly.onclick = () => { currentMode = "Quarterly"; updateTabUI(btnQuarterly); renderReportPipeline(); };
        if (btnYearly) btnYearly.onclick = () => { currentMode = "Yearly"; updateTabUI(btnYearly); renderReportPipeline(); };

        if (reportDatePicker) reportDatePicker.onchange = () => renderReportPipeline();

        await renderReportPipeline();
    });
}

window.addEventListener('DOMContentLoaded', loadReport);
