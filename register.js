// ==========================================
// 🚀 GDA FINANCE - ACCURATE FINANCIAL REPORT ENGINE (v12.5)
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

    let currentMode = "Daily"; 

    // 🇮🇳 Timezone Fix (IST) Setup
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const todayParts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date());
    const todayIST = `${todayParts.find(p => p.type === 'year').value}-${todayParts.find(p => p.type === 'month').value}-${todayParts.find(p => p.type === 'day').value}`;
    
    if (datePicker) {
        datePicker.value = todayIST;
    }

    // 🆔 SMART FUNCTION: Automatically recycle deleted Customer IDs
    async function generateNextGdaId() {
        try {
            const querySnapshot = await getDocs(collection(db, "customers"));
            let existingNumbers = [];
            if (!querySnapshot.empty) {
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.member_no !== undefined) {
                        existingNumbers.push(parseInt(data.member_no, 10));
                    }
                });
            }
            existingNumbers.sort((a, b) => a - b);
            let nextNumber = 1;
            for (let i = 1; i <= existingNumbers.length + 1; i++) {
                if (!existingNumbers.includes(i)) {
                    nextNumber = i;
                    break;
                }
            }
            const formattedNumber = String(nextNumber).padStart(3, '0');
            return { member_id: `GDA${formattedNumber}`, member_no: nextNumber };
        } catch (error) {
            console.error("ID Generation Error:", error);
            return { member_id: "GDA001", member_no: 1 };
        }
    }
    window.generateNextGdaId = generateNextGdaId;

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

                    // 🧮 FIXED SYNC LOGIC: Calculate strict cumulative overdue matching dashboard parameters
                    if (data.status !== "Closed" && data.loanDate && data.loanDate < filterDate) {
                        const d1 = new Date(filterDate);
                        const d2 = new Date(data.loanDate);
                        const diffTime = Math.abs(d1 - d2);
                        const totalDaysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                        if (totalDaysPassed > 0) {
                            const expectedCollectionUpToDate = totalDaysPassed * emi;
                            const actualPaidUpToDate = collectionUpToFilterDate[cId] || 0;
                            const clientDueOnThatDate = expectedCollectionUpToDate - actualPaidUpToDate;
                            
                            if (clientDueOnThatDate > 0) {
                                totalCumulativeDueOnFilterDate += clientDueOnThatDate;
                            }
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
                    if (isDateInPeriod(data.date, filterDate, currentMode)) {
                        periodExpensesSum += Number(data.amount) || 0;
                    }
                });
            }

            // 4. Mathematical Mapping Equations
            const finalPortfolioValue = absoluteCurrentOutstanding; 
            const netProfit = periodInterestIncome - periodExpensesSum;

            // 5. Inject values safely into the UI Elements
            if(totalPortfolioEl) totalPortfolioEl.innerText = `₹${Math.round(finalPortfolioValue)}`;
            if(disbursementEl) disbursementEl.innerText = `₹${Math.round(totalDisbursement)}`;
            if(collectionEl) collectionEl.innerText = `₹${Math.round(periodCollectionSum)}`;
            if(interestIncomeEl) interestIncomeEl.innerText = `₹${Math.round(periodInterestIncome)}`;
            if(totalExpensesEl) totalExpensesEl.innerText = `₹${Math.round(periodExpensesSum)}`;
            if(netProfitEl) netProfitEl.innerText = `₹${Math.round(netProfit)}`;
            if(totalDueEl) totalDueEl.innerText = `₹${Math.round(totalCumulativeDueOnFilterDate)}`;
            if(newAccountsEl) newAccountsEl.innerText = totalAccounts;

        } catch (error) {
            console.error("Calculation Engine Error: ", error);
        }
    }

    // Toggle Button Event Triggers
    function switchMode(mode, activeBtn) {
        currentMode = mode;
        [btnDaily, btnMonthly, btnQuarterly, btnYearly].forEach(b => b.classList.remove("active"));
        activeBtn.classList.add("active");
        
        if (mode === "Daily") dateLabel.innerText = "Select Date for Daily Live Report:";
        else if (mode === "Monthly") dateLabel.innerText = "Select Any Date for Monthly Report:";
        else if (mode === "Quarterly") dateLabel.innerText = "Select Any Date for Quarterly Report:";
        else if (mode === "Yearly") dateLabel.innerText = "Select Any Date for Yearly Report:";
        
        calculateFinanceReport();
    }

    if(btnDaily) btnDaily.onclick = (e) => switchMode("Daily", e.target);
    if(btnMonthly) btnMonthly.onclick = (e) => switchMode("Monthly", e.target);
    if(btnQuarterly) btnQuarterly.onclick = (e) => switchMode("Quarterly", e.target);
    if(btnYearly) btnYearly.onclick = (e) => switchMode("Yearly", e.target);
    if(datePicker) datePicker.onchange = () => calculateFinanceReport();

    calculateFinanceReport();
});
