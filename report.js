// ==========================================
// 🚀 GDA FINANCE - MASTER FINANCIAL REPORT ENGINE (v13.0 - FIX OD BUG)
// ==========================================

import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    
    // UI Elements Selection
    const totalPortfolioEl = document.getElementById("totalPortfolio");
    const disbursementEl = document.getElementById("disbursement");
    const collectionEl = document.getElementById("collection");
    const interestIncomeEl = document.getElementById("interestIncome");
    const totalExpensesEl = document.getElementById("totalExpenses");
    const netProfitEl = document.getElementById("netProfit");
    const totalDueEl = document.getElementById("totalDue");
    const newAccountsEl = document.getElementById("newAccounts");
    
    const datePicker = document.getElementById("reportDatePicker");
    const dateLabel = document.getElementById("dateLabel");
    
    const btnDaily = document.getElementById("btnDaily");
    const btnMonthly = document.getElementById("btnMonthly");
    const btnQuarterly = document.getElementById("btnQuarterly");
    const btnYearly = document.getElementById("btnYearly");

    let currentMode = "Monthly"; // डिफ़ॉल्ट रूप से Monthly मोड सेट है

    // 🇮🇳 Timezone Fix (IST) Setup
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const todayParts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date());
    const todayIST = `${todayParts.find(p => p.type === 'year').value}-${todayParts.find(p => p.type === 'month').value}-${todayParts.find(p => p.type === 'day').value}`;
    
    if (datePicker) {
        datePicker.value = todayIST;
    }

    // 📅 Date comparison helper function for periodic filters
    function isDateInPeriod(targetDate, filterDate, mode) {
        if (!targetDate || !filterDate) return false;
        
        const tParts = targetDate.split('-');
        const fParts = filterDate.split('-');
        if (tParts.length < 3 || fParts.length < 3) return false;

        const tYear = parseInt(tParts[0], 10);
        const tMonth = parseInt(tParts[1], 10);
        const fYear = parseInt(fParts[0], 10);
        const fMonth = parseInt(fParts[1], 10);

        if (mode === "Daily") return targetDate === filterDate;
        if (mode === "Monthly") return tYear === fYear && tMonth === fMonth;
        if (mode === "Yearly") return tYear === fYear;
        if (mode === "Quarterly") {
            const tQ = Math.floor((tMonth - 1) / 3);
            const fQ = Math.floor((fMonth - 1) / 3);
            return tYear === fYear && tQ === fQ;
        }
        return false;
    }

    // 📊 MASTER FUNCTION: Financial Report Calculations Engine
    async function calculateFinanceReport() {
        const filterDate = datePicker.value;
        if (!filterDate) return;

        try {
            // 1. Fetch data from 'collections' table
            const collectSnapshot = await getDocs(collection(db, "collections"));
            let periodCollectionSum = 0;
            let collectionUpToFilterDate = {}; 
            let absoluteLifetimeCollection = {}; 

            if (!collectSnapshot.empty) {
                collectSnapshot.forEach((doc) => {
                    const data = doc.data();
                    const cDate = data.date;
                    const cId = data.customerId;
                    const amount = Number(data.amount) || 0;

                    if (cId && cDate) {
                        if (isDateInPeriod(cDate, filterDate, currentMode)) {
                            periodCollectionSum += amount;
                        }
                        if (cDate <= filterDate) {
                            collectionUpToFilterDate[cId] = (collectionUpToFilterDate[cId] || 0) + amount;
                        }
                        absoluteLifetimeCollection[cId] = (absoluteLifetimeCollection[cId] || 0) + amount;
                    }
                });
            }

            // 2. Fetch data from 'customers' table
            const custSnapshot = await getDocs(collection(db, "customers"));
            
            let totalDisbursement = 0; 
            let totalCumulativeDueOnFilterDate = 0; 
            let totalAccounts = 0;
            let periodInterestIncome = 0;
            let absoluteCurrentOutstanding = 0; 

            if (!custSnapshot.empty) {
                custSnapshot.forEach((doc) => {
                    const data = doc.data();
                    const cId = doc.id;
                    const loanAmount = Number(data.loanAmount) || 0;
                    const emi = Number(data.dailyEmi || data.emi || 0);

                    if (isDateInPeriod(data.loanDate, filterDate, currentMode)) {
                        totalDisbursement += loanAmount;
                        totalAccounts++;
                        periodInterestIncome += (loanAmount * 0.20);
                    }

                    // Portfolio Logic: Real active outstanding balance remaining in market
                    if (data.status !== "Closed") {
                        const totalPayableLifetime = loanAmount + (loanAmount * 0.20);
                        const totalCollectedLifetime = absoluteLifetimeCollection[cId] || 0;
                        const remainingLifetimeDue = totalPayableLifetime - totalCollectedLifetime;
                        if (remainingLifetimeDue > 0) {
                            absoluteCurrentOutstanding += remainingLifetimeDue;
                        }
                    }

                    // 🧮 FIX OD BUG: Strict dashboard synchronization logic
                    if (data.status !== "Closed" && data.loanDate && data.loanDate <= filterDate) {
                        // 1. लोन की तारीख से फ़िल्टर डेट तक बीते कुल दिनों की गणना करें
                        const start = new Date(data.loanDate);
                        const end = new Date(filterDate);
                        
                        // टाइम डिफ्रेंस निकालें
                        const diffTime = Math.abs(end - start);
                        // टाइम को दिनों में बदलें (+1 करने से शुरुआती दिन भी जुड़ जाता है)
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 

                        // 2. फ़िल्टर डेट तक कितना कलेक्शन होना चाहिए था (Expected)
                        const expectedCollectionUpToDate = diffDays * emi;

                        // 3. फ़िल्टर डेट तक वास्तव में कितना कलेक्शन हुआ (Actual)
                        const actualCollectionUpToDate = collectionUpToFilterDate[cId] || 0;

                        // 4. इस विशिष्ट खाते के लिए कुल देय (Total Payable Lifetime)
                        const totalPayableLifetime = loanAmount + (loanAmount * 0.20);
                        
                        // यह सुनिश्चित करें कि एक्सपेक्टेड अमाउंट कुल देय राशि से ज्यादा न हो
                        const runningExpected = Math.min(expectedCollectionUpToDate, totalPayableLifetime);
                        
                        // ओवरड्यू (Due) अमाउंट निकालें
                        const accountDue = runningExpected - actualCollectionUpToDate;

                        if (accountDue > 0) {
                            totalCumulativeDueOnFilterDate += accountDue;
                        }
                    }
                });
            }

            // 3. Fetch data from 'expenses' table
            const expenseSnapshot = await getDocs(collection(db, "expenses"));
            let periodExpensesSum = 0;

            if (!expenseSnapshot.empty) {
                expenseSnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.date && isDateInPeriod(data.date, filterDate, currentMode)) {
                        periodExpensesSum += Number(data.amount) || 0;
                    }
                });
            }

            // 📊 4. UI Rendering Engine (Dashboard Update)
            if (totalPortfolioEl) totalPortfolioEl.innerText = `₹${absoluteCurrentOutstanding.toFixed(2)}`;
            if (disbursementEl) disbursementEl.innerText = `₹${totalDisbursement.toFixed(2)}`;
            if (collectionEl) collectionEl.innerText = `₹${periodCollectionSum.toFixed(2)}`;
            if (interestIncomeEl) interestIncomeEl.innerText = `₹${periodInterestIncome.toFixed(2)}`;
            if (totalExpensesEl) totalExpensesEl.innerText = `₹${periodExpensesSum.toFixed(2)}`;
            if (totalDueEl) totalDueEl.innerText = `₹${totalCumulativeDueOnFilterDate.toFixed(2)}`;
            if (newAccountsEl) newAccountsEl.innerText = totalAccounts;

            // Net Profit Calculation: Interest Income - Expenses
            const netProfit = periodInterestIncome - periodExpensesSum;
            if (netProfitEl) {
                netProfitEl.innerText = `₹${netProfit.toFixed(2)}`;
                netProfitEl.style.color = netProfit >= 0 ? "green" : "red";
            }

        } catch (error) {
            console.error("Error calculating financial report: ", error);
        }
    }

    // 🔄 Event Listeners for Date and Mode Changes
    if (datePicker) {
        datePicker.addEventListener("change", calculateFinanceReport);
    }

    const updateMode = (mode, activeBtn) => {
        currentMode = mode;
        if (dateLabel) dateLabel.innerText = `${mode} Report for:`;
        
        // Active Button Class Toggle
        [btnDaily, btnMonthly, btnQuarterly, btnYearly].forEach(btn => {
            if (btn) btn.classList.remove("active");
        });
        if (activeBtn) activeBtn.classList.add("active");

        calculateFinanceReport();
    };

    if (btnDaily) btnDaily.addEventListener("click", () => updateMode("Daily", btnDaily));
    if (btnMonthly) btnMonthly.addEventListener("click", () => updateMode("Monthly", btnMonthly));
    if (btnQuarterly) btnQuarterly.addEventListener("click", () => updateMode("Quarterly", btnQuarterly));
    if (btnYearly) btnYearly.addEventListener("click", () => updateMode("Yearly", btnYearly));

    // Initial Trigger on Load
    calculateFinanceReport();
});
