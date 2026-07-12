// ==========================================
// 🚀 GDA FINANCE - REAL OUTSTANDING PORTFOLIO & CUMULATIVE DUE SCRIPT (v12)
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

    // 📅 तारीख अवधि फ़िल्टर मैच करने का फंक्शन
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

    // 📊 लाइव रिपोर्ट गणना करने का मास्टर फ़ंक्शन
    async function calculateFinanceReport() {
        const filterDate = datePicker.value;
        if (!filterDate) return;

        try {
            // 1. कलेक्शन टेबल से पूरा डेटा रीड करना
            const collectSnapshot = await getDocs(collection(db, "collections"));
            let periodCollectionSum = 0;
            let collectionUpToFilterDate = {}; // फिल्टर तारीख तक का संचयी कलेक्शन
            let absoluteLifetimeCollection = {}; // आज की तारीख तक का कुल लाइफटाइम कलेक्शन

            if (!collectSnapshot.empty) {
                collectSnapshot.forEach((doc) => {
                    const data = doc.data();
                    const cDate = data.date;
                    const cId = data.customerId;
                    const amount = Number(data.amount) || 0;

                    if (cId && cDate) {
                        // बटन फ़िल्टर मोड (Daily/Monthly) के अनुसार कलेक्शन
                        if (isDateInPeriod(cDate, filterDate, currentMode)) {
                            periodCollectionSum += amount;
                        }
                        // चुनी गई फिल्टर तारीख तक का संचयी कलेक्शन (तारीख-वाइज ड्यू निकालने के लिए)
                        if (cDate <= filterDate) {
                            collectionUpToFilterDate[cId] = (collectionUpToFilterDate[cId] || 0) + amount;
                        }
                        // वर्तमान समय तक का कुल लाइफटाइम कलेक्शन (स्थिर पोर्टफोलियो के लिए)
                        absoluteLifetimeCollection[cId] = (absoluteLifetimeCollection[cId] || 0) + amount;
                    }
                });
            }

            // 2. ग्राहकों का मास्टर डेटा रीड करना
            const custSnapshot = await getDocs(collection(db, "customers"));
            
            let totalDisbursement = 0; 
            let totalCumulativeDueOnFilterDate = 0; 
            let totalAccounts = 0;
            let periodInterestIncome = 0;
            
            // 🎯 पोर्टफोलियो वेरिएबल्स (जो हमेशा आज की करंट स्थिति पर फिक्स रहेंगे)
            let absoluteCurrentOutstanding = 0; 

            if (!custSnapshot.empty) {
                custSnapshot.forEach((doc) => {
                    const data = doc.data();
                    const cId = doc.id;
                    const loanAmount = Number(data.loanAmount) || 0;
                    const emi = Number(data.dailyEmi || data.emi || 0);

                    // A. वितरित लोन और खाता काउंट (अवधि के अनुसार)
                    if (isDateInPeriod(data.loanDate, filterDate, currentMode)) {
                        totalDisbursement += loanAmount;
                        totalAccounts++;
                        periodInterestIncome += (loanAmount * 0.20);
                    }

                    // B. 🎯 [पोर्टफोलियो नियम] आज तक मार्केट में फंसा हुआ कुल वास्तविक पैसा (स्थिर रहेगा)
                    if (data.status !== "Closed") {
                        const totalPayableLifetime = loanAmount + (loanAmount * 0.20);
                        const totalCollectedLifetime = absoluteLifetimeCollection[cId] || 0;
                        const clientOutstanding = totalPayableWithInterest - totalCollectedLifetime; // (मूलधन + ब्याज) - जो आ चुका है
                        
                        const remainingLifetimeDue = totalPayableLifetime - totalCollectedLifetime;
                        if (remainingLifetimeDue > 0) {
                            absoluteCurrentOutstanding += remainingLifetimeDue;
                        }
                    }

                    // C. 💸 [दैनिक संचयी बकाया नियम] चुनी गई फिल्टर तारीख तक का कुल पेंडिंग रुका हुआ पैसा
                    if (data.status !== "Closed" && data.loanDate && data.loanDate <= filterDate) {
                        const d1 = new Date(filterDate);
                        const d2 = new Date(data.loanDate);
                        const diffTime = d1 - d2;
                        // लोन शुरू होने से फिल्टर तारीख तक बीते हुए कुल दिन
                        const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

                        if (daysPassed > 0) {
                            // उस तारीख तक कुल आनी चाहिए थी इतनी किस्तें (Demand)
                            const totalDemandUpToDate = daysPassed * emi;
                            // उस तारीख तक असल में ग्राहक ने दी इतनी किस्तें
                            const actualPaidUpToDate = collectionUpToFilterDate[cId] || 0;
                            
                            // बकाया = जो आना चाहिए था - जो आया
                            const clientDueOnThatDate = totalDemandUpToDate - actualPaidUpToDate;
                            
                            if (clientDueOnThatDate > 0) {
                                totalCumulativeDueOnFilterDate += clientDueOnThatDate;
                            }
                        }
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

            // 4. बिज़नेस आंकड़े असाइन करना
            // 🎯 कुल पोर्टफोलियो = हमेशा आज की डेट का कुल शुद्ध आउटस्टैंडिंग (स्थिर)
            const finalPortfolioValue = absoluteCurrentOutstanding; 
            const netProfit = periodInterestIncome - periodExpensesSum;

            // 5. स्क्रीन UI अपडेट करना
            if(totalPortfolioEl) totalPortfolioEl.innerText = `₹${Math.round(finalPortfolioValue)}`;
            if(disbursementEl) disbursementEl.innerText = `₹${Math.round(totalDisbursement)}`;
            if(collectionEl) collectionEl.innerText = `₹${Math.round(periodCollectionSum)}`;
            if(interestIncomeEl) interestIncomeEl.innerText = `₹${Math.round(periodInterestIncome)}`;
            if(totalExpensesEl) totalExpensesEl.innerText = `₹${Math.round(periodExpensesSum)}`;
            if(netProfitEl) netProfitEl.innerText = `₹${Math.round(netProfit)}`;
            if(totalDueEl) totalDueEl.innerText = `₹${Math.round(totalCumulativeDueOnFilterDate)}`;
            if(newAccountsEl) newAccountsEl.innerText = totalAccounts;

        } catch (error) {
            console.error("कैलकुलेशन एरर:", error);
        }
    }

    // मोड स्विचिंग लिसनर्स
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
