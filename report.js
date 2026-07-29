// ============================================================
// 🚀 GDA FINANCE - REPORT ENGINE (FIXED DATE HANDLING)
// ============================================================

import { db, auth } from "./firebase.js";
import { collection, getDocs, doc, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

// ============================================================
// ADMIN LOCK LOGIC
// ============================================================
const ADMIN_PASSWORD = "GDA@2026";
const lockOverlay = document.getElementById('lockOverlay');
const appContent = document.getElementById('appContent');
const lockPassword = document.getElementById('lockPassword');
const unlockBtn = document.getElementById('unlockBtn');
const lockError = document.getElementById('lockError');

function checkLock() {
  if (sessionStorage.getItem('reportUnlocked') === 'true') {
    lockOverlay.classList.add('hidden');
    appContent.style.display = 'block';
    initReport();
  } else {
    lockOverlay.classList.remove('hidden');
    appContent.style.display = 'none';
  }
}

function unlock() {
  const pwd = lockPassword.value.trim();
  if (pwd === ADMIN_PASSWORD) {
    sessionStorage.setItem('reportUnlocked', 'true');
    lockOverlay.classList.add('hidden');
    appContent.style.display = 'block';
    initReport();
  } else {
    lockError.style.display = 'block';
    lockPassword.value = '';
    lockPassword.focus();
  }
}

lockPassword.addEventListener('keydown', (e) => { if (e.key === 'Enter') unlock(); });
unlockBtn.addEventListener('click', unlock);

// ============================================================
// DOM Elements
// ============================================================
const totalPortfolio = document.getElementById("totalPortfolio");
const disbursement = document.getElementById("disbursement");
const collectionEl = document.getElementById("collection");
const interestIncome = document.getElementById("interestIncome");
const totalExpensesEl = document.getElementById("totalExpenses");
const netProfit = document.getElementById("netProfit");
const totalDue = document.getElementById("totalDue");
const newAccounts = document.getElementById("newAccounts");
const reportDatePicker = document.getElementById("reportDatePicker");
const btnDaily = document.getElementById("btnDaily");
const btnMonthly = document.getElementById("btnMonthly");
const btnQuarterly = document.getElementById("btnQuarterly");
const btnYearly = document.getElementById("btnYearly");

let currentMode = "Monthly";
const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
if (reportDatePicker) reportDatePicker.value = todayIST;

function updateTabUI(activeBtn) {
  [btnDaily, btnMonthly, btnQuarterly, btnYearly].forEach(btn => btn?.classList.remove("active"));
  if (activeBtn) activeBtn.classList.add("active");
}

// ============================================================
// 🔥 TOTAL DUE CALCULATION (Dashboard Style)
// ============================================================
function calculateTotalDue(customers, targetDateStr) {
  const targetDate = new Date(targetDateStr);
  let totalDue = 0;
  customers.forEach(cust => {
    if (cust.status === "Closed") return;
    const dailyEmi = Number(cust.dailyEmi || cust.emi || 0);
    if (dailyEmi <= 0) return;

    const loanDate = new Date(cust.loanDate || cust.startDate || targetDateStr);
    let diffDays = Math.floor((targetDate - loanDate) / (1000 * 60 * 60 * 24));
    let daysElapsed = Math.max(0, diffDays) + 1;
    const planDur = Number(cust.planDuration || cust.duration || 60);
    if (daysElapsed > planDur) daysElapsed = planDur;

    const expectedAmt = daysElapsed * dailyEmi;
    const totalPaid = Number(cust.totalCollected || 0);
    const currentDue = Math.max(0, expectedAmt - totalPaid);
    totalDue += currentDue;
  });
  return totalDue;
}

// ============================================================
// 📊 RENDER REPORT (FIXED: Timestamp → String Conversion)
// ============================================================
async function renderReport() {
  const targetDate = reportDatePicker ? reportDatePicker.value : todayIST;
  let startDateStr = "0000-00-00", endDateStr = targetDate;
  const parsedDate = new Date(targetDate);
  const yyyy = parsedDate.getFullYear();
  const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');

  if (currentMode === "Daily") {
    startDateStr = targetDate;
  } else if (currentMode === "Monthly") {
    startDateStr = `${yyyy}-${mm}-01`;
    const lastDay = new Date(yyyy, parsedDate.getMonth() + 1, 0).getDate();
    endDateStr = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
  } else if (currentMode === "Yearly") {
    startDateStr = `${yyyy}-01-01`;
    endDateStr = `${yyyy}-12-31`;
  } else if (currentMode === "Quarterly") {
    const q = Math.floor(parsedDate.getMonth() / 3);
    const qStart = q * 3;
    startDateStr = `${yyyy}-${String(qStart + 1).padStart(2, '0')}-01`;
    const qEndMonth = qStart + 2;
    const lastDay = new Date(yyyy, qEndMonth + 1, 0).getDate();
    endDateStr = `${yyyy}-${String(qEndMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }

  try {
    // --- Expenses ---
    let expensesSum = 0;
    const expSnap = await getDocs(collection(db, "expenses"));
    expSnap.forEach(doc => {
      const data = doc.data();
      if (data.date && data.date >= startDateStr && data.date <= endDateStr) {
        expensesSum += Number(data.amount || 0);
      }
    });

    // --- Collections ---
    let lifetimeCollectionUptoTarget = 0;
    let rangeCollectionSum = 0;
    const colSnap = await getDocs(collection(db, "collections"));
    colSnap.forEach(doc => {
      const data = doc.data();
      const amt = Number(data.amount || 0);
      if (data.date && data.date <= targetDate) {
        lifetimeCollectionUptoTarget += amt;
      }
      if (data.date && data.date >= startDateStr && data.date <= endDateStr) {
        rangeCollectionSum += amt;
      }
    });

    // --- Customers (🔥 FIXED: Timestamp to String) ---
    const custSnap = await getDocs(collection(db, "customers"));
    let lifetimeDisbursementUptoTarget = 0;
    let lifetimeInterestUptoTarget = 0;
    let rangeDisbursementSum = 0;
    let rangeInterestSum = 0;
    let rangeAccountsCount = 0;
    const allCustomers = [];

    custSnap.forEach(doc => {
      const cust = doc.data();
      const loanAmt = Number(cust.loanAmount || 0);
      allCustomers.push({ ...cust, id: doc.id });

      // 🔥 Convert loanDate (any format) to YYYY-MM-DD
      let loanDateStr = '';
      if (cust.loanDate) {
        if (typeof cust.loanDate === 'string') {
          loanDateStr = cust.loanDate;
        } else if (cust.loanDate.toDate) {
          loanDateStr = cust.loanDate.toDate().toISOString().split('T')[0];
        } else if (cust.loanDate instanceof Date) {
          loanDateStr = cust.loanDate.toISOString().split('T')[0];
        }
      }
      if (!loanDateStr && cust.startDate) {
        if (typeof cust.startDate === 'string') {
          loanDateStr = cust.startDate;
        } else if (cust.startDate.toDate) {
          loanDateStr = cust.startDate.toDate().toISOString().split('T')[0];
        } else if (cust.startDate instanceof Date) {
          loanDateStr = cust.startDate.toISOString().split('T')[0];
        }
      }

      if (loanDateStr && loanDateStr <= targetDate) {
        lifetimeDisbursementUptoTarget += loanAmt;
        lifetimeInterestUptoTarget += (loanAmt * 0.20);
      }
      if (loanDateStr && loanDateStr >= startDateStr && loanDateStr <= endDateStr) {
        rangeDisbursementSum += loanAmt;
        rangeInterestSum += (loanAmt * 0.20);
        if (cust.status !== "Closed") rangeAccountsCount++;
      }
    });

    // Total Due
    const totalOverdue = calculateTotalDue(allCustomers, targetDate);

    const rawTotalMarketCap = lifetimeDisbursementUptoTarget + lifetimeInterestUptoTarget;
    const portfolioRemaining = Math.max(0, rawTotalMarketCap - lifetimeCollectionUptoTarget);
    const netProfitSum = rangeInterestSum - expensesSum;

    // Render UI
    if (totalPortfolio) totalPortfolio.innerText = `₹${Math.round(portfolioRemaining).toLocaleString('en-IN')}`;
    if (disbursement) disbursement.innerText = `₹${Math.round(rangeDisbursementSum).toLocaleString('en-IN')}`;
    if (collectionEl) collectionEl.innerText = `₹${Math.round(rangeCollectionSum).toLocaleString('en-IN')}`;
    if (interestIncome) interestIncome.innerText = `₹${Math.round(rangeInterestSum).toLocaleString('en-IN')}`;
    if (totalExpensesEl) totalExpensesEl.innerText = `₹${Math.round(expensesSum).toLocaleString('en-IN')}`;
    if (netProfit) netProfit.innerText = `₹${Math.round(netProfitSum).toLocaleString('en-IN')}`;
    if (totalDue) totalDue.innerText = `₹${Math.round(totalOverdue).toLocaleString('en-IN')}`;
    if (newAccounts) newAccounts.innerText = rangeAccountsCount;

  } catch (err) {
    console.error("Report render error:", err);
  }
}

// ============================================================
// 💾 BACKUP & RESTORE
// ============================================================
async function downloadBackup() {
  const statusDiv = document.getElementById("backupStatus");
  statusDiv.style.display = 'block';
  statusDiv.innerText = '⏳ Preparing backup... Please wait.';
  statusDiv.style.color = '#f59e0b';

  try {
    const collections = ['customers', 'collections', 'expenses', 'metadata'];
    let backupData = {};

    for (const colName of collections) {
      const snapshot = await getDocs(collection(db, colName));
      backupData[colName] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
    }

    backupData._backupInfo = {
      generatedAt: new Date().toISOString(),
      version: 'GDA_Backup_v1',
      totalCustomers: backupData.customers?.length || 0,
      totalCollections: backupData.collections?.length || 0
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `GDA_Backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    statusDiv.innerText = `✅ Backup successful! (${backupData._backupInfo.totalCustomers} customers, ${backupData._backupInfo.totalCollections} collections)`;
    statusDiv.style.color = '#10b981';
    setTimeout(() => { statusDiv.style.display = 'none'; }, 5000);

  } catch (err) {
    console.error('Backup Error:', err);
    statusDiv.innerText = '❌ Error: ' + err.message;
    statusDiv.style.color = '#d32f2f';
  }
}

async function restoreBackup(file) {
  const statusDiv = document.getElementById("backupStatus");
  statusDiv.style.display = 'block';

  if (!file) {
    statusDiv.innerText = '❌ No file selected!';
    statusDiv.style.color = '#d32f2f';
    return;
  }

  if (!confirm("⚠️ WARNING: This will OVERWRITE all existing data in Firestore!\n\nAre you sure you want to continue?")) {
    statusDiv.innerText = '⏹️ Restore cancelled.';
    statusDiv.style.color = '#64748B';
    setTimeout(() => { statusDiv.style.display = 'none'; }, 2000);
    return;
  }

  try {
    statusDiv.innerText = '⏳ Reading backup file...';
    statusDiv.style.color = '#f59e0b';
    const text = await file.text();
    const backupData = JSON.parse(text);

    if (!backupData.customers || !backupData.collections) {
      throw new Error('Invalid backup file! Missing required collections.');
    }

    statusDiv.innerText = '⏳ Restoring data... This may take a few moments.';

    const collections = ['customers', 'collections', 'expenses', 'metadata'];
    let totalWritten = 0;

    for (const colName of collections) {
      if (!backupData[colName]) continue;
      const docs = backupData[colName];
      let batch = writeBatch(db);
      let batchCount = 0;
      for (let i = 0; i < docs.length; i++) {
        const docData = docs[i];
        const docRef = doc(db, colName, docData.id);
        const { id, ...rest } = docData;
        batch.set(docRef, rest, { merge: true });
        batchCount++;
        totalWritten++;
        if (batchCount === 500 || i === docs.length - 1) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
    }

    statusDiv.innerText = `✅ Restore successful! ${totalWritten} documents updated.`;
    statusDiv.style.color = '#10b981';
    alert(`✅ Restore complete!\n${totalWritten} documents restored.\nPlease refresh the page to see the updated data.`);
    window.location.reload();

  } catch (err) {
    console.error('Restore Error:', err);
    statusDiv.innerText = '❌ Restore failed: ' + err.message;
    statusDiv.style.color = '#d32f2f';
  }
}

// ============================================================
// 🚀 INITIALIZATION
// ============================================================
function initReport() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      location.href = "login.html";
    } else {
      renderReport();
    }
  });

  // Tabs
  btnDaily.onclick = () => { currentMode = "Daily"; updateTabUI(btnDaily); renderReport(); };
  btnMonthly.onclick = () => { currentMode = "Monthly"; updateTabUI(btnMonthly); renderReport(); };
  btnQuarterly.onclick = () => { currentMode = "Quarterly"; updateTabUI(btnQuarterly); renderReport(); };
  btnYearly.onclick = () => { currentMode = "Yearly"; updateTabUI(btnYearly); renderReport(); };
  reportDatePicker.onchange = () => renderReport();

  // Logout
  document.getElementById("logoutBtn").onclick = async (e) => {
    e.preventDefault();
    sessionStorage.removeItem('reportUnlocked');
    await signOut(auth);
    location.href = "login.html";
  };

  // Backup & Restore
  document.getElementById('backupDownloadBtn').addEventListener('click', downloadBackup);
  document.getElementById('restoreFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      restoreBackup(file);
    }
    e.target.value = '';
  });
}

// ============================================================
// 🔥 START – Lock Check
// ============================================================
checkLock();
