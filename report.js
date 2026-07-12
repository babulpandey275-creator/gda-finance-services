import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    const totalPortfolioEl = document.getElementById("totalPortfolio");
    const disbursementEl = document.getElementById("disbursement");
    const collectionEl = document.getElementById("collection");
    const interestIncomeEl = document.getElementById("interestIncome");
    const totalExpensesEl = document.getElementById("totalExpenses");
    const netProfitEl = document.getElementById("netProfit");
    const totalDueEl = document.getElementById("totalDue");
    const newAccountsEl = document.getElementById("newAccounts");

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
                    if (data.status !== "Closed") {
                        const loanAmount = Number(data.loanAmount) || 0;
                        const collectedAmount = Number(data.totalCollected || 0);
                        const totalPayableWithInterest = loanAmount + (loanAmount * 0.20);
                        const interest = loanAmount * 0.20;
                        const dueAmount = totalPayableWithInterest - collectedAmount;

                        totalDisbursement += loanAmount;
                        totalInterestIncome += interest;
                        totalCollection += collectedAmount;
                        totalDue += dueAmount >= 0 ? dueAmount : 0;
                    }
                });
            }

            const expenseSnapshot = await getDocs(collection(db, "expenses"));
            let totalExpenses = 0;
            if (!expenseSnapshot.empty) {
                expenseSnapshot.forEach((doc) => {
                    totalExpenses += Number(doc.data().amount) || 0;
                });
            }

            const netProfit = totalInterestIncome - totalExpenses;
            const totalPortfolio = totalDisbursement + totalInterestIncome;

            if(totalPortfolioEl) totalPortfolioEl.innerText = `₹${Math.round(totalPortfolio)}`;
            if(disbursementEl) disbursementEl.innerText = `₹${Math.round(totalDisbursement)}`;
            if(collectionEl) collectionEl.innerText = `₹${Math.round(totalCollection)}`;
            if(interestIncomeEl) interestIncomeEl.innerText = `₹${Math.round(totalInterestIncome)}`;
            if(totalExpensesEl) totalExpensesEl.innerText = `₹${Math.round(totalExpenses)}`;
            if(netProfitEl) netProfitEl.innerText = `₹${Math.round(netProfit)}`;
            if(totalDueEl) totalDueEl.innerText = `₹${Math.round(totalDue)}`;
            if(newAccountsEl) newAccountsEl.innerText = totalAccounts;

        } catch (error) {
            console.error("रिपोर्ट एरर:", error);
            alert("⚠️ फायरबेस एरर: " + error.message);
        }
    }
    fetchRealtimeReport();
});
