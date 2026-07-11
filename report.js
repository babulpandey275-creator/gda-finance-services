import { db } from './firebase-config.js'; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentTab = 'Daily';

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnDaily')?.addEventListener('click', () => switchTab('Daily'));
    document.getElementById('btnMonthly')?.addEventListener('click', () => switchTab('Monthly'));
    document.getElementById('btnQuarterly')?.addEventListener('click', () => switchTab('Quarterly'));
    document.getElementById('btnYearly')?.addEventListener('click', () => switchTab('Yearly'));
    document.getElementById('inpReportDate')?.addEventListener('change', () => loadReportData());

    const dateInput = document.getElementById('inpReportDate');
    if (dateInput && !dateInput.value) {
        const localDate = new Date();
        const offset = localDate.getTimezoneOffset();
        const adjustedDate = new Date(localDate.getTime() - (offset * 60 * 1000));
        dateInput.value = adjustedDate.toISOString().split('T')[0];
    }
    switchTab('Daily');
});

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn${tab}`)?.classList.add('active');
    
    const dateFilterBox = document.getElementById('dateFilterBox');
    const reportTitle = document.getElementById('reportTitle');
    
    if (tab === 'Daily') {
        if (dateFilterBox) dateFilterBox.style.display = 'block';
        if (reportTitle) reportTitle.innerText = 'तारीख के अनुसार दैनिक लाइव रिपोर्ट';
    } else {
        if (dateFilterBox) dateFilterBox.style.display = 'none';
        if (reportTitle) reportTitle.innerText = `${tab} के अनुसार लाइव बिजनेस रिपोर्ट`;
    }
    loadReportData();
}

async function loadReportData() {
    let disbursement = 0, collectionAmt = 0, interestIncome = 0, expenses = 0, newCustomers = 0;
    const selectedDate = document.getElementById('inpReportDate')?.value || new Date().toISOString().split('T')[0];
    const today = new Date(selectedDate);

    try {
        // 1. Loans
        const loanSnapshot = await getDocs(collection(db, "loans"));
        if(loanSnapshot) {
            loanSnapshot.forEach((doc) => {
                const data = doc.data();
                // ⚡ अगर डेली मोड है तो तारीख चेक करेगा, वरना पूरे डेटाबेस का टोटल कर देगा ताकि खाली न दिखे
                if (currentTab === 'Daily' && data.date) {
                    const loanDate = new Date(data.date);
                    if (checkDateMatch(loanDate, today, 'Daily')) {
                        disbursement += Number(data.amount || 0);
                        interestIncome += Number(data.interest || 0);
                    }
                } else {
                    disbursement += Number(data.amount || data.loanAmount || 0);
                    interestIncome += Number(data.interest || (data.loanAmount ? data.loanAmount * 0.20 : 0));
                }
            });
        }

        // 2. Collections
        const collSnapshot = await getDocs(collection(db, "collections"));
        if(collSnapshot) {
            collSnapshot.forEach((doc) => {
                const data = doc.data();
                if (currentTab === 'Daily' && data.date) {
                    const collDate = new Date(data.date);
                    if (checkDateMatch(collDate, today, 'Daily')) {
                        collectionAmt += Number(data.amount || 0);
                    }
                } else {
                    collectionAmt += Number(data.amount || data.collectedAmount || 0);
                }
            });
        }

        // 3. Expenses
        const expSnapshot = await getDocs(collection(db, "expenses"));
        if(expSnapshot) {
            expSnapshot.forEach((doc) => {
                const data = doc.data();
                if (currentTab === 'Daily' && data.date) {
                    const expDate = new Date(data.date);
                    if (checkDateMatch(expDate, today, 'Daily')) {
                        expenses += Number(data.amount || 0);
                    }
                } else {
                    expenses += Number(data.amount || 0);
                }
            });
        }

        // 4. Customers (Total Registered)
        const custSnapshot = await getDocs(collection(db, "customers"));
        if(custSnapshot) {
            custSnapshot.forEach((doc) => {
                const data = doc.data();
                if (currentTab === 'Daily') {
                    const dStr = data.createdAt || data.date || data.loanDate;
                    if (dStr) {
                        const regDate = new Date(dStr);
                        if (checkDateMatch(regDate, today, 'Daily')) newCustomers++;
                    }
                } else {
                    newCustomers++;
                }
            });
        }

        const netProfit = (collectionAmt + interestIncome) - expenses;
        const totalPortfolio = disbursement + collectionAmt;

        // स्क्रीन पर डेटा दिखाना
        document.getElementById('txtDisbursement').innerText = `₹${disbursement.toLocaleString('en-IN')}`;
        document.getElementById('txtCollection').innerText = `₹${collectionAmt.toLocaleString('en-IN')}`;
        document.getElementById('txtInterestEarned').innerText = `₹${interestIncome.toLocaleString('en-IN')}`;
        document.getElementById('txtExpenses').innerText = `₹${expenses.toLocaleString('en-IN')}`;
        document.getElementById('txtNetProfit').innerText = `₹${netProfit.toLocaleString('en-IN')}`;
        document.getElementById('txtNewAccounts').innerText = newCustomers;
        document.getElementById('txtTotalPortfolio').innerText = `₹${totalPortfolio.toLocaleString('en-IN')}`;

    } catch (error) {
        console.error("डेटाबेस एरर:", error);
    }
}

function checkDateMatch(targetDate, baseDate, mode) {
    if (isNaN(targetDate.getTime())) return false;
    return targetDate.getFullYear() === baseDate.getFullYear() && 
           targetDate.getMonth() === baseDate.getMonth() && 
           targetDate.getDate() === baseDate.getDate();
}
