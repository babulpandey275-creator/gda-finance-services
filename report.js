// ==========================================
// 🚀 GDA FINANCE - ADVANCED & CRASH-PROOF REPORT SCRIPT
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

    // 🆔 [BONUS] डिलीटेड कस्टमर आईडी को री-साइकिल करने वाला स्मार्ट फंक्शन
    // इसे आप अपने कस्टमर ऐड करने वाले फॉर्म में भी इस्तेमाल कर सकते हैं
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

            // नंबरों को छोटे से बड़े क्रम में सॉर्ट करना
            existingNumbers.sort((a, b) => a - b);

            let nextNumber = 1;
            // लूप चलाकर देखना कि बीच में कौन सा नंबर गायब (डिलीट) हुआ है
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
                // एक्टिव खातों की सटीक संख्या (डिलीटेड कस्टमर इसमें काउंट नहीं होंगे)
                totalAccounts = querySnapshot.size; 

                querySnapshot.forEach((doc) => {
                    const data = doc.data();

                    // डेटा न होने पर क्रैश से बचाने के लिए '|| 0' सुरक्षा कवच
                    const loanAmount = Number(data.loanAmount) || 0;
                    
                    // कुल कलेक्शन = मूलधन + 20% ब्याज (अगर रिमेनिंग अमाउंट पहले से सेव नहीं है तो)
                    const fullCollectionAmount = Number(data.remainingAmount) || (loanAmount + (loanAmount * 0.20));
                    
                    // ब्याज कमाई
                    const interest = fullCollectionAmount - loanAmount;

                    // वसूली कलेक्शन (जो पैसा अब तक कस्टमर चुका चुका है)
                    const paidAmount = Number(data.paidAmount) || 0; 
                    
                    // मार्केट बकाया (कुल देना - जो चुका दिया)
                    const dueAmount = fullCollectionAmount - paidAmount;

                    // सभी का सम (Total Sum)
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

            // 3. शुद्ध मुनाफा = कुल ब्याज - कुल खर्चे 
            const netProfit = totalInterestIncome - totalExpenses;
            
            // कुल पोर्टफोलियो = वितरित लोन + मार्केट बकाया
            const totalPortfolio = totalDisbursement + totalDue;

            // 4. बिना रुकावट UI स्क्रीन को अपडेट करना
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
            alert("⚠️ डेटाबेस से कनेक्ट नहीं हो पा रहा है। इंटरनेट या फायरबेस रूल्स चेक करें।");
        }
    }

    // लोड होते ही रन करें
    fetchRealtimeReport();
});
