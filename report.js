import { db } from './firebase-config.js'; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentTab = 'Daily';

// 🔐 ताला खोलने का असली और पक्का फंक्शन
function doUnlock() {
    const pin = document.getElementById('pinInput').value.trim();
    
    // बाबू भाई का पर्सनल पिन मैचिंग
    if (pin === "8271" || pin == 8271) { 
        sessionStorage.setItem('reportPageUnlocked', 'true'); 
        document.getElementById('lockScreen').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        setupAppAndLoad(); // ताला खुलते ही तुरंत डेटा लोड होगा
    } else {
        document.getElementById('errorMsg').style.display = 'block';
        document.getElementById('pinInput').value = ''; // गलत होने पर बॉक्स खाली
    }
}

// पेज लोड होते ही सबसे पहले यह चलेगा
document.addEventListener('DOMContentLoaded', () => {
    // अगर पहले से अनलॉक है तो सीधे अंदर भेजो
    if (sessionStorage.getItem('reportPageUnlocked') === 'true') {
        if(document.getElementById('lockScreen')) document.getElementById('lockScreen').style.display = 'none';
        if(document.getElementById('mainContent')) document.getElementById('mainContent').style.display = 'block';
        setupAppAndLoad();
    } else {
        // ⚡ यहाँ आईडी बिल्कुल सही (btnUnlock) मैच कर दी गई है!
        const unlockBtn = document.getElementById('btnUnlock');
        if (unlockBtn) {
            unlockBtn.addEventListener('click', doUnlock);
        }
        
        // कीबोर्ड से Enter दबाने पर भी खुलेगा
        document.getElementById('pinInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') doUnlock();
        });
    }
});

function setupAppAndLoad() {
    document.getElementById('btnDaily')?.addEventListener('click', () => switchTab('Daily'));
    document.getElementById('btnMonthly')?.addEventListener('click', () => switchTab('Monthly'));
    document.getElementById('btnQuarterly')?.addEventListener('click', () => switchTab('Quarterly'));
    document.getElementById('btnYearly')?.addEventListener('click', () => switchTab('Yearly'));
    document.getElementById('inpReportDate')?.addEventListener('change', () => loadReportData());

    const dateInput = document.getElementById('inpReportDate');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    switchTab('Daily');
}

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

// 📊 फ़ायरबेस से लाइव डेटा लाने का फंक्शन
async function loadReportData() {
    if (sessionStorage.getItem('reportPageUnlocked') !== 'true') return; 

    let disbursement = 0, collectionAmt = 0, interestIncome = 0, expenses = 0, newCustomers = 0;
    const selectedDate = document.getElementById('inpReportDate')?.value || new Date().toISOString().split('T')[0];
    const today = new Date(selectedDate);

    try {
        // 1. Loans
        const loanSnapshot = await getDocs(collection(db, "loans"));
        if(loanSnapshot) {
            loanSnapshot.forEach((doc) => {
                const data = doc.data();
                if(data && data.date) {
                    const loanDate = new Date(data.date);
                    if (checkDateMatch(loanDate, today, currentTab)) {
                        disbursement += Number(data.amount || 0);
                        interestIncome += Number(data.interest || 0);
                    }
                }
            });
        }

        // 2. Collections
        const collSnapshot = await getDocs(collection(db, "collections"));
        if(collSnapshot) {
            collSnapshot.forEach((doc) => {
                const data = doc.data();
                if(data && data.date) {
                    const collDate = new Date(data.date);
                    if (checkDateMatch(collDate, today, currentTab)) {
                        collectionAmt += Number(data.amount || 0);
                    }
                }
            });
        }

        // 3. Expenses
        const expSnapshot = await getDocs(collection(db, "expenses"));
        if(expSnapshot) {
            expSnapshot.forEach((doc) => {
                const data = doc.data();
                if(data && data.date) {
                    const expDate = new Date(data.date);
                    if (checkDateMatch(expDate, today, currentTab)) {
                        expenses += Number(data.amount || 0);
                    }
                }
            });
        }

        // 4. Customers
        const custSnapshot = await getDocs(collection(db, "customers"));
        if(custSnapshot) {
            custSnapshot.forEach((doc) => {
                const data = doc.data();
                const dStr = data.createdAt || data.date;
                if(dStr) {
                    const regDate = new Date(dStr);
                    if (checkDateMatch(regDate, today, currentTab)) {
                        newCustomers++;
                    }
                }
            });
        }

        const netProfit = (collectionAmt + interestIncome) - expenses;
        const totalPortfolio = disbursement + collectionAmt;

        // UI पर लाइव डेटा दिखाना
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
    if (mode === 'Daily') return targetDate.toDateString() === baseDate.toDateString();
    if (mode === 'Monthly') return targetDate.getMonth() === baseDate.getMonth() && targetDate.getFullYear() === baseDate.getFullYear();
    if (mode === 'Quarterly') {
        return Math.floor(targetDate.getMonth() / 3) === Math.floor(baseDate.getMonth() / 3) && targetDate.getFullYear() === baseDate.getFullYear();
    }
    if (mode === 'Yearly') return targetDate.getFullYear() === baseDate.getFullYear();
    return false;
}
