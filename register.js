// ==========================================
// 🚀 GDA FINANCE - ADVANCED & DIAGNOSTIC REPORT SCRIPT
// ==========================================

import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    
    // 📱 HTML UI Elements Selection
    const totalPortfolioEl = document.getElementById("totalPortfolio");
    const disbursementEl = document.getElementById("disbursement");
    const collectionEl = document.getElementById("collection");
    const interestIncomeEl = document.getElementById("interestIncome");
    const totalExpensesEl = document.getElementById("totalExpenses");
    const netProfitEl = document.getElementById("netProfit");
    const totalDueEl = document.getElementById("totalDue");
    const newAccountsEl = document.getElementById("newAccounts");

    // 🆔 डिलीटेड कस्टमर आईडी को री-साइकिल करने वाला स्मार्ट फंक्शन
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
            console.error("ID जेनरेट करने में समस्या:", error);
            return { member_id: "GDA001", member_no: 1 };
        }
    }

    // 📊 लाइव वित्तीय रिपोर्ट कैलकुलेट और लोड करने का मुख्य फंक्शन
    async function fetchRealtimeReport() {
        try {
            const querySnapshot = await getDocs(collection(db, "customers"));
            
            let totalDisbursement = 0; 
            let totalInterestIncome = 0; 
            let totalCollection = 0; 
            let totalDue = 0; 
            let totalAccounts = 0; 

            if (!querySnapshot.empty) {
                totalAccounts = querySnapshot.size; 

                querySnapshot.forEach((doc) => {
                    const data = doc.data();

                    const loanAmount = Number(data.loanAmount) || 0;
                    const fullCollectionAmount = Number(data.remainingAmount) || (loanAmount + (loanAmount * 0.20));
                    const interest = fullCollectionAmount - loanAmount;
                    const paidAmount = Number(data.paidAmount) || 0; 
                    const dueAmount = fullCollectionAmount - paidAmount;

                    totalDisbursement += loanAmount;
                    totalInterestIncome += interest;
                    totalCollection += paidAmount;
                    totalDue += dueAmount;
                });
            }

            // 2. Expenses (खर्चों) का लाइव डेटा लाना
            const expenseSnapshot = await getDocs(collection(db, "expenses"));
            let totalExpenses = 0;

            if (!expenseSnapshot.empty) {
                expenseSnapshot.forEach((doc) => {
                    const data = doc.data();
                    totalExpenses += Number(data.amount) || 0;
                });
            }

            // 3. फाइनल मैथ कैलकुलेशन
            const netProfit = totalInterestIncome - totalExpenses;
            const totalPortfolio = totalDisbursement + totalDue;

            // 4. UI स्क्रीन को अपडेट करना
            if(totalPortfolioEl) totalPortfolioEl.innerText = `₹${totalPortfolio}`;
            if(disbursementEl) disbursementEl.innerText = `₹${totalDisbursement}`;
            if(collectionEl) collectionEl.innerText = `₹${totalCollection}`;
            if(interestIncomeEl) interestIncomeEl.innerText = `₹${totalInterestIncome}`;
            if(totalExpensesEl) totalExpensesEl.innerText = `₹${totalExpenses}`;
            if(netProfitEl) netProfitEl.innerText = `₹${netProfit}`;
            if(totalDueEl) totalDueEl.innerText = `₹${totalDue}`;
            if(newAccountsEl) newAccountsEl.innerText = totalAccounts;

        } catch (error) {
            console.error("लाइव वित्तीय रिपोर्ट लोड करने में गड़बड़ हुई:", error);
            // 💡 यहाँ असली एरर पता चलेगा कि क्यों डेटा नहीं आ रहा
            alert("⚠️ फायरबेस एरर: " + error.message);
        }
    }

    // लोड होते ही रन करें
    fetchRealtimeReport();
});
