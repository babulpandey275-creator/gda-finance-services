// ==========================================
// 🚀 GDA FINANCE - FINAL & CORRECTED REPORT SCRIPT (v12)
// ==========================================

import { db } from "./firebase.js"; 
// ⚡ वर्ज़न को 12.0.0 कर दिया गया है ताकि firebase.js से पूरी तरह सिंक रहे
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

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
            // 1. Customers कलेक्शन से डेटा रीड करना
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

                    // केवल उन्हीं कस्टमर्स का हिसाब जोड़ें जिनका खाता बंद (Closed) नहीं है
                    if (data.status !== "Closed") {
                        const loanAmount = Number(data.loanAmount) || 0;
                        
                        // 🛠️ आपकी collection.js के अनुसार फ़ील्ड का नाम totalCollected है
                        const collectedAmount = Number(data.totalCollected || 0);
                        
                        // कुल कलेक्शन राशि = मूलधन + 20% ब्याज
                        const totalPayableWithInterest = loanAmount + (loanAmount * 0.20);
                        
                        // 20% के हिसाब से ब्याज की शुद्ध कमाई
                        const interest = totalPayableWithInterest - loanAmount;
                        
                        // मार्केट बकाया राशि (कुल पेएबल - जो पैसा जमा हो चुका है)
                        const dueAmount = totalPayableWithInterest - collectedAmount;

                        // सभी का टोटल सम (Total Sum) करना
                        totalDisbursement += loanAmount;
                        totalInterestIncome += interest;
                        totalCollection += collectedAmount;
                        totalDue += dueAmount >= 0 ? dueAmount : 0;
                    }
                });
            }

            // 2. Expenses कलेक्शन से खर्चों का लाइव डेटा सम (Sum) करना
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
            
            // कुल पोर्टफोलियो = वितरित लोन + मार्केट बकाया
            const totalPortfolio = totalDisbursement + totalDue;

            // 4. बिना किसी रुकावट के स्क्रीन (UI) को अपडेट करना
            if(totalPortfolioEl) totalPortfolioEl.innerText = `₹${Math.round(totalPortfolio)}`;
            if(disbursementEl) disbursementEl.innerText = `₹${Math.round(totalDisbursement)}`;
            if(collectionEl) collectionEl.innerText = `₹${Math.round(totalCollection)}`;
            if(interestIncomeEl) interestIncomeEl.innerText = `₹${Math.round(interestIncome)}`;
            if(totalExpensesEl) totalExpensesEl.innerText = `₹${Math.round(totalExpenses)}`;
            if(netProfitEl) netProfitEl.innerText = `₹${Math.round(netProfit)}`;
            if(totalDueEl) totalDueEl.innerText = `₹${Math.round(totalDue)}`;
            if(newAccountsEl) newAccountsEl.innerText = totalAccounts;

        } catch (error) {
            console.error("लाइव वित्तीय रिपोर्ट लोड करने में गड़बड़ हुई:", error);
            // 💡 यहाँ सीधा असली एरर दिखेगा कि फायरबेस कहाँ अटक रहा है
            alert("⚠️ फायरबेस एरर: " + error.message);
        }
    }

    // लोड होते ही रन करें
    fetchRealtimeReport();
});
