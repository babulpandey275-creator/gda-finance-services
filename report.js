// ==========================================
// 🚀 GDA FINANCE - LIVE FINANCIAL REPORT SCRIPT
// ==========================================

// फ़ायरबेस कनेक्शन फ़ाइल से db इम्पोर्ट करना
import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    
    // 📱 HTML के सभी वित्तीय रिपोर्ट वाले एलिमेंट्स को सेलेक्ट करना
    const totalPortfolioEl = document.getElementById("totalPortfolio");
    const disbursementEl = document.getElementById("disbursement");
    const collectionEl = document.getElementById("collection");
    const interestIncomeEl = document.getElementById("interestIncome");
    const totalExpensesEl = document.getElementById("totalExpenses");
    const netProfitEl = document.getElementById("netProfit");
    const totalDueEl = document.getElementById("totalDue");
    const newAccountsEl = document.getElementById("newAccounts");

    // Live वित्तीय रिपोर्ट जनरेट करने का मुख्य फंक्शन
    async function fetchRealtimeReport() {
        try {
            // 1. Customers कलेक्शन से लाइव डेटा रीड करना
            const querySnapshot = await getDocs(collection(db, "customers"));
            
            let totalDisbursement = 0; 
            let totalInterestIncome = 0; 
            let totalCollection = 0; 
            let totalDue = 0; 
            let totalAccounts = 0; 

            if (!querySnapshot.empty) {
                totalAccounts = querySnapshot.size; // कुल खातों की संख्या (New Accounts)

                querySnapshot.forEach((doc) => {
                    const data = doc.data();

                    // मूलधन (Loan Amount)
                    const loanAmount = Number(data.loanAmount) || 0;
                    
                    // आपके कैलकुलेटर के अनुसार 20% ब्याज जोड़कर कुल कलेक्शन अमाउंट
                    const fullCollectionAmount = Number(data.remainingAmount) || (loanAmount + (loanAmount * 0.20));
                    
                    // 20% के हिसाब से ब्याज की शुद्ध कमाई
                    const interest = fullCollectionAmount - loanAmount;

                    // कलेक्शन में जो अमाउंट रिकवर/जमा हो चुका है (paidAmount)
                    const paidAmount = Number(data.paidAmount) || 0; 
                    
                    // मार्केट बकाया राशि की गणना (कुल कलेक्शन - जमा राशि)
                    const dueAmount = fullCollectionAmount - paidAmount;

                    // सभी ग्राहकों का डेटा आपस में जोड़ना (Sum)
                    totalDisbursement += loanAmount;
                    totalInterestIncome += interest;
                    totalCollection += paidAmount;
                    totalDue += dueAmount;
                });
            }

            // 2. Expenses कलेक्शन से सभी खर्चों का टोटल निकालना
            const expenseSnapshot = await getDocs(collection(db, "expenses"));
            let totalExpenses = 0;

            if (!expenseSnapshot.empty) {
                expenseSnapshot.forEach((doc) => {
                    const data = doc.data();
                    totalExpenses += Number(data.amount) || 0;
                });
            }

            // 3. फाइनल मैथ कैलकुलेशन
            // शुद्ध मुनाफा = कुल ब्याज कमाई - कुल खर्चे 
            const netProfit = totalInterestIncome - totalExpenses;
            
            // कुल पोर्टफोलियो = वितरित लोन + मार्केट बकाया
            const totalPortfolio = totalDisbursement + totalDue;

            // 4. स्क्रीन (UI) को लाइव डेटा से अपडेट करना
            if(totalPortfolioEl) totalPortfolioEl.innerText = `₹${totalPortfolio}`;
            if(disbursementEl) disbursementEl.innerText = `₹${totalDisbursement}`;
            if(collectionEl) collectionEl.innerText = `₹${totalCollection}`;
            if(interestIncomeEl) interestIncomeEl.innerText = `₹${totalInterestIncome}`;
            if(totalExpensesEl) totalExpensesEl.innerText = `₹${totalExpenses}`;
            if(netProfitEl) netProfitEl.innerText = `₹${netProfit}`;
            if(totalDueEl) totalDueEl.innerText = `₹${totalDue}`;
            if(newAccountsEl) newAccountsEl.innerText = totalAccounts;

        } catch (error) {
            console.error("डेटाबेस से लाइव रिपोर्ट लोड करने में दिक्कत आई है:", error);
        }
    }

    // पेज लोड होते ही डेटा सिंक करने के लिए फंक्शन को कॉल करें
    fetchRealtimeReport();
});
