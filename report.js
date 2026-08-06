// ============================================================
// 🚀 GDA FINANCE - REPORT ENGINE
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
  const unlocked = sessionStorage.getItem('reportUnlocked');
  if (unlocked === 'true') {
    lockOverlay.classList.add('hidden');
    appContent.style.display = 'block';
    initReport();
  } else {
    lockOverlay.classList.remove('hidden');
    appContent.style.display = 'none';
    lockPassword.value = '';
    lockPassword.focus();
  }
}

function unlock() {
  const entered = lockPassword.value.trim();

  if (entered === ADMIN_PASSWORD) {
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

lockPassword.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') unlock();
});
unlockBtn.addEventListener('click', unlock);

// ============================================================
// DOM Elements for Report
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
// 🔄 LOADING STATE
// ============================================================
function setLoading(isLoading) {
  document.querySelectorAll('.grid .box').forEach(box => {
    box.classList.toggle('loading', isLoading);
  });
}

// ============================================================
// 📆 पिछले period की तारीख-रेंज निकालना (तुलना के लिए)
// ============================================================
function getPreviousRange(mode, targetDateStr) {
  const d = new Date(targetDateStr);
  const yyyy = d.getFullYear();
  const mm = d.getMonth();

  if (mode === "Daily") {
    const prev = new Date(d);
    prev.setDate(prev.getDate() - 1);
    const s = prev.toISOString().split('T')[0];
    return { startDateStr: s, endDateStr: s };
  }
  if (mode === "Monthly") {
    const prevMonthDate = new Date(yyyy, mm - 1, 1);
    const py = prevMonthDate.getFullYear();
    const pm = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(py, prevMonthDate.getMonth() + 1, 0).getDate();
    return { startDateStr: `${py}-${pm}-01`, endDateStr: `${py}-${pm}-${String(lastDay).padStart(2, '0')}` };
  }
  if (mode === "Yearly") {
    return { startDateStr: `${yyyy - 1}-01-01`, endDateStr: `${yyyy - 1}-12-31` };
  }
  const q = Math.floor(mm / 3);
  const prevQ = q - 1;
  const py = prevQ < 0 ? yyyy - 1 : yyyy;
  const qStart = ((prevQ + 4) % 4) * 3;
  const qEndMonth = qStart + 2;
  const lastDay = new Date(py, qEndMonth + 1, 0).getDate();
  return { startDateStr: `${py}-${String(qStart + 1).padStart(2, '0')}-01`, endDateStr: `${py}-${String(qEndMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}` };
}

// ============================================================
// 📊 Delta badge (▲/▼ %) दिखाना
// ============================================================
function renderDelta(elId, current, previous) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (previous <= 0) { el.style.display = 'none'; return; }
  const pct = ((current - previous) / previous) * 100;
  el.style.display = 'inline-block';
  if (Math.abs(pct) < 1) {
    el.className = 'delta flat';
    el.innerText = '● Same as before';
  } else if (pct > 0) {
    el.className = 'delta up';
    el.innerText = `▲ ${pct.toFixed(0)}% vs pichla period`;
  } else {
    el.className = 'delta down';
    el.innerText = `▼ ${Math.abs(pct).toFixed(0)}% vs pichla period`;
  }
}

// ============================================================
// 📈 पिछले 7 दिन का Collection Trend
// ============================================================
function renderTrendChart(dailyTotals) {
  const canvas = document.getElementById('trendChart');
  if (!canvas) return;
  const parent = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || parent.clientWidth || 300;
  const cssH = 110;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssW, cssH);

  const values = dailyTotals.map(d => d.total);
  const maxVal = Math.max(...values, 1);
  const padding = 8;
  const barGap = 8;
  const barW = (cssW - padding * 2 - barGap * (values.length - 1)) / values.length;

  values.forEach((val, i) => {
    const barH = Math.max(2, (val / maxVal) * (cssH - 34));
    const x = padding + i * (barW + barGap);
    const y = cssH - barH - 20;

    ctx.fillStyle = val > 0 ? '#3A1C62' : '#E2E8F0';
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, 4);
    ctx.fill();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(dailyTotals[i].label, x + barW / 2, cssH - 6);

    if (val > 0) {
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 8.5px Inter, sans-serif';
      ctx.fillText(`₹${Math.round(val / 1000)}k`, x + barW / 2, y - 4);
    }
  });
}

// ============================================================
// TOTAL DUE CALCULATION
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
// RENDER REPORT
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

  const { startDateStr: prevStart, endDateStr: prevEnd } = getPreviousRange(currentMode, targetDate);

  setLoading(true);

  try {
    // --- Expenses ---
    let expensesSum = 0;
    let expensesSumPrev = 0;
    const expSnap = await getDocs(collection(db, "expenses"));
    expSnap.forEach(doc => {
      const data = doc.data();
      const amt = Number(data.amount || 0);
      if (data.date && data.date >= startDateStr && data.date <= endDateStr) expensesSum += amt;
      if (data.date && data.date >= prevStart && data.date <= prevEnd) expensesSumPrev += amt;
    });

    // --- Collections ---
    let lifetimeCollectionUptoTarget = 0;
    let rangeCollectionSum = 0;
    let rangeCollectionSumPrev = 0;
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(targetDate);
      dt.setDate(dt.getDate() - i);
      const key = dt.toISOString().split('T')[0];
      const label = dt.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 3);
      last7.push({ key, label, total: 0 });
    }
    const last7Map = {};
    last7.forEach(d => { last7Map[d.key] = d; });

    const colSnap = await getDocs(collection(db, "collections"));
    colSnap.forEach(doc => {
      const data = doc.data();
      const amt = Number(data.amount || 0);
      if (data.date && data.date <= targetDate) lifetimeCollectionUptoTarget += amt;
      if (data.date && data.date >= startDateStr && data.date <= endDateStr) rangeCollectionSum += amt;
      if (data.date && data.date >= prevStart && data.date <= prevEnd) rangeCollectionSumPrev += amt;
      if (data.date && last7Map[data.date]) last7Map[data.date].total += amt;
    });

    // --- Customers ---
    const custSnap = await getDocs(collection(db, "customers"));
    let lifetimeDisbursementUptoTarget = 0;
    let lifetimeInterestUptoTarget = 0;
    let rangeDisbursementSum = 0;
    let rangeInterestSum = 0;
    let rangeAccountsCount = 0;
    let rangeDisbursementSumPrev = 0;
    let rangeInterestSumPrev = 0;
    const allCustomers = [];

    custSnap.forEach(doc => {
      const cust = doc.data();
      const loanAmt = Number(cust.loanAmount || 0);
      allCustomers.push({ ...cust, id: doc.id });

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
      if (loanDateStr && loanDateStr >= prevStart && loanDateStr <= prevEnd) {
        rangeDisbursementSumPrev += loanAmt;
        rangeInterestSumPrev += (loanAmt * 0.20);
      }
    });

    const totalOverdue = calculateTotalDue(allCustomers, targetDate);

    const rawTotalMarketCap = lifetimeDisbursementUptoTarget + lifetimeInterestUptoTarget;
    const portfolioRemaining = Math.max(0, rawTotalMarketCap - lifetimeCollectionUptoTarget);
    const netProfitSum = rangeInterestSum - expensesSum;
    const netProfitSumPrev = rangeInterestSumPrev - expensesSumPrev;

    if (totalPortfolio) totalPortfolio.innerText = `₹${Math.round(portfolioRemaining).toLocaleString('en-IN')}`;
    if (disbursement) disbursement.innerText = `₹${Math.round(rangeDisbursementSum).toLocaleString('en-IN')}`;
    if (collectionEl) collectionEl.innerText = `₹${Math.round(rangeCollectionSum).toLocaleString('en-IN')}`;
    if (interestIncome) interestIncome.innerText = `₹${Math.round(rangeInterestSum).toLocaleString('en-IN')}`;
    if (totalExpensesEl) totalExpensesEl.innerText = `₹${Math.round(expensesSum).toLocaleString('en-IN')}`;
    if (netProfit) netProfit.innerText = `₹${Math.round(netProfitSum).toLocaleString('en-IN')}`;
    if (totalDue) totalDue.innerText = `₹${Math.round(totalOverdue).toLocaleString('en-IN')}`;
    if (newAccounts) newAccounts.innerText = rangeAccountsCount;

    renderDelta('deltaDisbursement', rangeDisbursementSum, rangeDisbursementSumPrev);
    renderDelta('deltaCollection', rangeCollectionSum, rangeCollectionSumPrev);
    renderDelta('deltaNetProfit', netProfitSum, netProfitSumPrev);

    renderTrendChart(last7);

  } catch (err) {
    console.error("Report render error:", err);
  } finally {
    setLoading(false);
  }
}

// ============================================================
// BACKUP & RESTORE
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

  if (!confirm("⚠️ WARNING: This will OVERWRITE all existing data in Firestore!\n\nAapka current data pehle safety ke liye download ho jayega, uske baad restore shuru hoga.\n\nContinue karein?")) {
    statusDiv.innerText = '⏹️ Restore cancelled.';
    statusDiv.style.color = '#64748B';
    setTimeout(() => { statusDiv.style.display = 'none'; }, 2000);
    return;
  }

  statusDiv.innerText = '⏳ Safety backup le rahe hain (restore se pehle)...';
  statusDiv.style.color = '#f59e0b';
  await downloadBackup();

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
// INITIALIZATION
// ============================================================
function initReport() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      location.href = "login.html";
    } else {
      renderReport();
    }
  });

  btnDaily.onclick = () => { currentMode = "Daily"; updateTabUI(btnDaily); renderReport(); };
  btnMonthly.onclick = () => { currentMode = "Monthly"; updateTabUI(btnMonthly); renderReport(); };
  btnQuarterly.onclick = () => { currentMode = "Quarterly"; updateTabUI(btnQuarterly); renderReport(); };
  btnYearly.onclick = () => { currentMode = "Yearly"; updateTabUI(btnYearly); renderReport(); };
  reportDatePicker.onchange = () => renderReport();

  document.getElementById("logoutBtn").onclick = async (e) => {
    e.preventDefault();
    sessionStorage.removeItem('reportUnlocked');
    await signOut(auth);
    location.href = "login.html";
  };

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
// START – LOCK CHECK
// ============================================================
checkLock();

