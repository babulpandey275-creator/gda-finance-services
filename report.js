// ==========================================
// 🚀 GDA FINANCE - PERFECT TIME-BASED DUE REPORT SCRIPT (v12)
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

    // 🇮🇳 भारतीय समय (IST) के अनुसार आज की तारीख डिफ़ॉल्ट सेट करना
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const todayParts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date());
    const todayIST = `${todayParts.find(p => p.type === 'year').value}-${todayParts.find(p => p.type === 'month').value}-${todayParts.find(p => p.type === 'day').value}`;
    
    if (datePicker) {
        datePicker.value = todayIST;
    }

    function isDateInPeriod(targetDate, filterDate, mode) {
        if (!targetDate) return false;
        const tDate = new Date(targetDate);
        const fDate = new Date(filterDate);
        
        if (mode === "Daily") return targetDate === filterDate;
        if (mode === "Monthly") return tDate.getFullYear() === fDate.getFullYear() && tDate.getMonth() === fDate.getMonth();
        if (mode === "Yearly") return tDate.getFullYear() === fDate.getFullYear();
        if (mode === "Quarterly") {
            const tQ = Math.floor(tDate.getMonth() / 3);
            const fQ = Math.floor(fDate.getMonth() / 3);
            return tDate.getFullYear() === fDate.getFullYear() && tQ === fQ;
        }
        return false;
    }

    async function calculateFinanceReport() {
        const filterDate = datePicker.value;
        if (!filterDate) return;

        try {
            // 1. कलेक्शन टेबल से चुनिंदा तारीख/अवधि का कुल कैश कलेक्शन निकालना
            const collectSnapshot = await getDocs(collection(db, "collections"));
            let periodCollectionSum = 0;
            let collectionUpToFilterDate = {}; 

            if (!collectSnapshot.empty) {
                collectSnapshot.forEach((doc) => {
                    const data = doc.data();
                    const cDate = data.date;
                    const cId = data.customerId;

                    if (cId && cDate) {
                        if (isDateInPeriod(cDate, filterDate, currentMode)) {
                            periodCollectionSum += Number(data.amount) || 0;
                        }
                        if (cDate <= filterDate) {
                            collectionUpToFilterDate[cId] = (collectionUpToFilterDate[cId] || 0) + (Number(data.amount) || 0);
                        }
                    }
                });
            }

            // 2. ग्राहकों का मास्टर डेटा और डेट-वाइज बकाया (Due) निकालना
            const custSnapshot = await getDocs(collection(db, "customers"));
            
            let totalDisbursement = 0; 
            let totalDue = 0; 
            let totalAccounts = 0;
            let totalInterestIncome = 0;

            if (!custSnapshot.empty) {
                custSnapshot.forEach((doc) => {
                    const data = doc.data();
                    const cId = doc.id;

                    if (isDateInPeriod(data.loanDate, filterDate, currentMode)) {
                        totalDisbursement += Number(data.loanAmount) || 0;
                        totalAccounts++;
                    }

                    if (data.status !== "Closed" && data.loanDate && data.loanDate <= filterDate) {
                        const loanAmount = Number(data.loanAmount) || 0;
                        const emi = Number(data.dailyEmi || data.emi || 0);
                        
                        const d1 = new Date(filterDate);
                        const d2 = new Date(data.loanDate);
                        const diffTime = d1 - d2;
                        const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

                        if (daysPassed > 0) {
                            const totalDemandUpToDate = daysPassed * emi;
                            const actualPaidUpToDate = collectionUpToFilterDate[cId] || 0;
                            const clientDueOnThatDate = totalDemandUpToDate - actualPaidUpToDate;
                            
                            if (clientDueOnThatDate > 0) {
                                totalDue += clientDueOnThatDate;
                            }
                        }
                        totalInterestIncome += (loanAmount * 0.20);
                    }
                });
            }

            // 3. एक्सपेंस टेबल से खर्चे निकालना
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

            // Final Calculations
            const realPortfolio = totalDue; 
            const netProfit = totalInterestIncome - periodExpensesSum;

            // UI Screen Rendering
            if(totalPortfolioEl) totalPortfolioEl.innerText = `₹${Math.round(realPortfolio)}`;
            if(disbursementEl) disbursementEl.innerText = `₹${Math.round(totalDisbursement)}`;
            if(collectionEl) collectionEl.innerText = `₹${Math.round(periodCollectionSum)}`;
            if(interestIncomeEl) interestIncomeEl.innerText = `₹${Math.round(totalInterestIncome)}`;
            if(totalExpensesEl) totalExpensesEl.innerText = `₹${Math.round(periodExpensesSum)}`;
            if(netProfitEl) netProfitEl.innerText = `₹${Math.round(netProfit)}`;
            if(totalDueEl) totalDueEl.innerText = `₹${Math.round(totalDue)}`;
            if(newAccountsEl) newAccountsEl.innerText = totalAccounts;

        } catch (error) {
            console.error("कैलकुलेशन एरर:", error);
        }
    }

    function switchMode(mode, activeBtn) {
        currentMode = mode;
        [btnDaily, btnMonthly, btnQuarterly, btnYearly].forEach(b => b.classList.remove("active"));
        activeBtn.classList.add("active");
        
        if (mode === "Daily") dateLabel.innerText = "तारीख के अनुसार दैनिक लाइव रिपोर्ट चुनें:";
        else if (mode === "Monthly") dateLabel.innerText = "महीने के अनुसार रिपोर्ट देखें (कोई भी तारीख चुनें):";
        else if (mode === "Quarterly") dateLabel.innerText = "तिमाही के अनुसार रिपोर्ट देखें (कोई भी तारीख चुनें):";
        else if (mode === "Yearly") dateLabel.innerText = "साल के अनुसार रिपोर्ट देखें (कोई भी तारीख चुनें):";
        
        calculateFinanceReport();
    }

    if(btnDaily) btnDaily.onclick = (e) => switchMode("Daily", e.target);
    if(btnMonthly) btnMonthly.onclick = (e) => switchMode("Monthly", e.target);
    if(btnQuarterly) btnQuarterly.onclick = (e) => switchMode("Quarterly", e.target);
    if(btnYearly) btnYearly.onclick = (e) => switchMode("Yearly", e.target);
    if(datePicker) datePicker.onchange = () => calculateFinanceReport();

    calculateFinanceReport();
});
