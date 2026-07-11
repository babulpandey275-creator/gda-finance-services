import { db } from './firebase-config.js'; 
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ==========================================
// 🔐 1. सेशन-आधारित एडमिन लॉक लॉजिक (PIN: 8271)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    // जांचें कि क्या इस सेशन में ऐप पहले से अनलॉक है
    if (sessionStorage.getItem('reportUnlocked') === 'true') {
        const lockEl = document.getElementById('lockScreen');
        if (lockEl) lockEl.style.display = 'none';
    }
});

// अनलॉक बटन का काम
document.getElementById('btnUnlock')?.addEventListener('click', () => {
    const pin = document.getElementById('pinInput').value;
    
    // बाबू भाई का पर्सनल पिन सुरक्षा के लिए सेट किया गया
    if (pin === "8271") { 
        sessionStorage.setItem('reportUnlocked', 'true'); // ब्राउज़र याद रखेगा जब तक ऐप बंद न हो
        document.getElementById('lockScreen').style.display = 'none';
    } else {
        const errEl = document.getElementById('errorMsg');
        if (errEl) errEl.style.display = 'block';
    }
});

// ==========================================
// 📊 2. वित्तीय रिपोर्ट लाइव डेटा कैलकुलेशन लॉजिक
// ==========================================
let currentTab = 'Daily';

document.getElementById('btnDaily')?.addEventListener('click', () => switchTab('Daily'));
document.getElementById('btnMonthly')?.addEventListener('click', () => switchTab('Monthly'));
document.getElementById('btnQuarterly')?.addEventListener('click', () => switchTab('Quarterly'));
document.getElementById('btnYearly')?.addEventListener('click', () => switchTab('Yearly'));
document.getElementById('inpReportDate')?.addEventListener('change', () => loadReportData());

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    const activeBtn = document.getElementById(`btn${tab}`);
    if (activeBtn) activeBtn.classList.add('active');
    
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
    let disbursement = 0;
    let collectionAmt = 0;
    let interestIncome = 0;
    let expenses = 0;
    let newCustomers = 0;

    const selectedDate = document.getElementById('inpReportDate')?.value || new Date().toISOString().split('T')[0];
    const today = new Date(selectedDate);

    try {
        // 💵 1. वितरित लोन (Disbursement) और ब्याज की गणना
        const loanSnapshot = await getDocs(collection(db, "loans"));
        loanSnapshot.forEach((doc) => {
            const data = doc.data();
            const loanDate = new Date(data.date);
            
            if (checkDateMatch(loanDate, today, currentTab)) {
                disbursement += Number(data.amount || 0);
                interestIncome += Number(data.interest || 0);
            }
        });

        // 💰 2. वसूली कलेक्शन (Collection) की गणना
        const collSnapshot = await getDocs(collection(db, "collections"));
        collSnapshot.forEach((doc) => {
            const data = doc.data();
            const collDate = new Date(data.date);
            
            if (checkDateMatch(collDate, today, currentTab)) {
                collectionAmt += Number(data.amount || 0);
            }
        });

        // 📉 3. कुल खर्चों (Expenses) की गणना
        const expSnapshot = await getDocs(collection(db, "expenses"));
        expSnapshot.forEach((doc) => {
            const data = doc.data();
            const expDate = new Date(data.date);
            
            if (checkDateMatch(expDate, today, currentTab)) {
                expenses += Number(data.amount || 0);
            }
        });

        // 👥 4. नए पंजीकृत ग्राहकों (New Accounts) की गणना
        const custSnapshot = await getDocs(collection(db, "customers"));
        custSnapshot.forEach((doc) => {
            const data = doc.data();
            const regDate = new Date(data.createdAt);
            
            if (checkDateMatch(regDate, today, currentTab)) {
                newCustomers++;
            }
        });

        // 🧮 5. गणितीय गणना (Calculations)
        const netProfit = (collectionAmt + interestIncome) - expenses;
        const totalPortfolio = disbursement + collectionAmt;

        // 🖥️ 6. स्क्रीन पर डेटा अपडेट करना
        updateDOM('txtDisbursement', `₹${disbursement.toLocaleString('en-IN')}`);
        updateDOM('txtCollection', `₹${collectionAmt.toLocaleString('en-IN')}`);
        updateDOM('txtInterestEarned', `₹${interestIncome.toLocaleString('en-IN')}`);
        updateDOM('txtExpenses', `₹${expenses.toLocaleString('en-IN')}`);
        updateDOM('txtNetProfit', `₹${netProfit.toLocaleString('en-IN')}`);
        updateDOM('txtNewAccounts', newCustomers);
        updateDOM('txtTotalPortfolio', `₹${totalPortfolio.toLocaleString('en-IN')}`);

    } catch (error) {
        console.error("डेटा लोड करने में त्रुटि आई: ", error);
    }
}

function checkDateMatch(targetDate, baseDate, mode) {
    if (isNaN(targetDate.getTime())) return false;
    
    if (mode === 'Daily') {
        return targetDate.toDateString() === baseDate.toDateString();
    } else if (mode === 'Monthly') {
        return targetDate.getMonth() === baseDate.getMonth() && targetDate.getFullYear() === baseDate.getFullYear();
    } else if (mode === 'Quarterly') {
        const targetQuarter = Math.floor(targetDate.getMonth() / 3);
        const baseQuarter = Math.floor(baseDate.getMonth() / 3);
        return targetQuarter === baseQuarter && targetDate.getFullYear() === baseDate.getFullYear();
    } else if (mode === 'Yearly') {
        return targetDate.getFullYear() === baseDate.getFullYear();
    }
    return false;
}

function updateDOM(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

// सबसे पहले पेज लोड होने पर दैनिक डेटा अपने आप लोड हो
window.addEventListener('load', () => {
    const dateInput = document.getElementById('inpReportDate');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    switchTab('Daily');
});
