import { db } from './firebase-config.js'; 
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ==========================================
// 🔐 1. पक्का सेशन-आधारित एडमिन लॉक लॉजिक (PIN: 8271)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    // जांचें कि क्या पहले से अनलॉक है
    if (sessionStorage.getItem('reportUnlocked') === 'true') {
        const lockEl = document.getElementById('lockScreen');
        if (lockEl) lockEl.style.display = 'none';
    }
});

// अनलॉक बटन का काम
document.getElementById('btnUnlock')?.addEventListener('click', () => {
    // .trim() लगाने से अगर कोई स्पेस (space) छूट गया होगा, तो वो हट जाएगा
    const pin = document.getElementById('pinInput').value.trim();
    
    // नंबर और टेक्स्ट दोनों तरीकों से चेक करने के लिए == का इस्तेमाल
    if (pin == 8271 || pin === "8271") { 
        sessionStorage.setItem('reportUnlocked', 'true'); 
        document.getElementById('lockScreen').style.display = 'none';
    } else {
        const errEl = document.getElementById('errorMsg');
        if (errEl) errEl.style.display = 'block';
        
        // गलत पिन होने पर इनपुट बॉक्स को खाली कर दे
        const inputEl = document.getElementById('pinInput');
        if (inputEl) inputEl.value = '';
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
        const loanSnapshot = await getDocs(collection(db, "loans"));
        loanSnapshot.forEach((doc) => {
            const data = doc.data();
            const loanDate = new Date(data.date);
            if (checkDateMatch(loanDate, today, currentTab)) {
                disbursement += Number(data.amount || 0);
                interestIncome += Number(data.interest || 0);
            }
        });

        const collSnapshot = await getDocs(collection(db, "collections"));
        collSnapshot.forEach((doc) => {
            const data = doc.data();
            const collDate = new Date(data.date);
            if (checkDateMatch(collDate, today, currentTab)) {
                collectionAmt += Number(data.amount || 0);
            }
        });

        const expSnapshot = await getDocs(collection(db, "expenses"));
        expSnapshot.forEach((doc) => {
            const data = doc.data();
            const expDate = new Date(data.date);
            if (checkDateMatch(expDate, today, currentTab)) {
                expenses += Number(data.amount || 0);
            }
        });

        const custSnapshot = await getDocs(collection(db, "customers"));
        custSnapshot.forEach((doc) => {
            const data = doc.data();
            const regDate = new Date(data.createdAt);
            if (checkDateMatch(regDate, today, currentTab)) {
                newCustomers++;
            }
        });

        const netProfit = (collectionAmt + interestIncome) - expenses;
        const totalPortfolio = disbursement + collectionAmt;

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
    if (mode === 'Daily') return targetDate.toDateString() === baseDate.toDateString();
    if (mode === 'Monthly') return targetDate.getMonth() === baseDate.getMonth() && targetDate.getFullYear() === baseDate.getFullYear();
    if (mode === 'Quarterly') {
        const targetQuarter = Math.floor(targetDate.getMonth() / 3);
        const baseQuarter = Math.floor(baseDate.getMonth() / 3);
        return targetQuarter === baseQuarter && targetDate.getFullYear() === baseDate.getFullYear();
    }
    if (mode === 'Yearly') return targetDate.getFullYear() === baseDate.getFullYear();
    return false;
}

function updateDOM(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

window.addEventListener('load', () => {
    const dateInput = document.getElementById('inpReportDate');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    switchTab('Daily');
});
