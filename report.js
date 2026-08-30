// ============================================================
// 🚀 GDA FINANCE - REPORT ENGINE (DEBUG VERSION)
// ============================================================

import { db, auth } from "./firebase.js";
import { collection, getDocs, doc, setDoc, writeBatch, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

// ============================================================
// ADMIN LOCK LOGIC (with Debugging)
// ============================================================
const ADMIN_PASSWORD = "GDA@2026"; // ✅ सही पासवर्ड (Case-Sensitive)
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
    lockPassword.value = ''; // Clear input
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
let lastReportSnapshot = null; // 📄 PDF export ke liye last calculated report data
const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
if (reportDatePicker) reportDatePicker.value = todayIST;

function updateTabUI(activeBtn) {
  [btnDaily, btnMonthly, btnQuarterly, btnYearly].forEach(btn => btn?.classList.remove("active"));
  if (activeBtn) activeBtn.classList.add("active");
}

// ============================================================
// 🔄 LOADING STATE — data आने तक boxes धुंधले रहेंगे, पुराने
// numbers अचानक बदलते नहीं दिखेंगे
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
  // Quarterly
  const q = Math.floor(mm / 3);
  const prevQ = q - 1;
  const py = prevQ < 0 ? yyyy - 1 : yyyy;
  const qStart = ((prevQ + 4) % 4) * 3;
  const qEndMonth = qStart + 2;
  const lastDay = new Date(py, qEndMonth + 1, 0).getDate();
  return { startDateStr: `${py}-${String(qStart + 1).padStart(2, '0')}-01`, endDateStr: `${py}-${String(qEndMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}` };
}

// ============================================================
// 🏷️ PDF/Report ke liye readable period label (jaise "August 2026")
// ============================================================
function getPeriodLabel(mode, startDateStr, endDateStr) {
  const startD = new Date(startDateStr);
  if (mode === "Daily") {
    return startD.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  }
  if (mode === "Monthly") {
    return startD.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }
  if (mode === "Yearly") {
    return `Year ${startD.getFullYear()}`;
  }
  // Quarterly
  const endD = new Date(endDateStr);
  return `${startD.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} – ${endD.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`;
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
// 📈 पिछले 7 दिन का Collection Trend — छोटा canvas chart
// ============================================================
function renderTrendChart(dailyTotals) {
  try {
    const canvas = document.getElementById('trendChart');
    if (!canvas) return;
    const parent = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || parent.clientWidth || 300;
    const cssH = 110;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
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

      // Simple rectangle bar (roundRect कुछ पुराने Android WebView में
      // सपोर्ट नहीं होता, इसलिए plain fillRect इस्तेमाल किया — हर
      // device पर काम करेगा)
      ctx.fillStyle = val > 0 ? '#3A1C62' : '#E2E8F0';
      ctx.fillRect(x, y, barW, barH);

      // Day label
      ctx.fillStyle = '#94A3B8';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(dailyTotals[i].label, x + barW / 2, cssH - 6);

      // Value label (सिर्फ अगर 0 से ज़्यादा हो)
      if (val > 0) {
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 8.5px Inter, sans-serif';
        ctx.fillText(`₹${Math.round(val / 1000)}k`, x + barW / 2, y - 4);
      }
    });
  } catch (err) {
    console.error('Trend chart render error:', err);
  }
}

// ============================================================
// 💰 OVERDUE RATE — Plan खत्म होने के बाद Daily EMI का %
// ============================================================
function getOverdueRate(planDur) {
  if (planDur <= 60) return 0.10;
  if (planDur <= 80) return 0.20;
  return 0.30;
}

// ============================================================
// TOTAL DUE CALCULATION (अब Overdue Interest भी शामिल)
// ============================================================
function calculateTotalDue(customers, targetDateStr) {
  const targetDate = new Date(targetDateStr);
  let totalDue = 0;
  customers.forEach(cust => {
    // 🔥 FIX: Settled accounts भी Total Due से हट जाएँ (पहले सिर्फ Closed हटता था)
    if (cust.status === "Closed" || cust.status === "Settled") return;
    const dailyEmi = Number(cust.dailyEmi || cust.emi || 0);
    if (dailyEmi <= 0) return;

    const loanDate = new Date(cust.loanDate || cust.startDate || targetDateStr);
    let diffDays = Math.floor((targetDate - loanDate) / (1000 * 60 * 60 * 24));
    let daysElapsedRaw = Math.max(0, diffDays) + 1;
    const planDur = Number(cust.planDuration || cust.duration || 60);
    let daysElapsed = daysElapsedRaw;
    if (daysElapsed > planDur) daysElapsed = planDur;

    const expectedAmt = daysElapsed * dailyEmi;
    const totalPaid = Number(cust.totalCollected || 0);
    const baseDue = Math.max(0, expectedAmt - totalPaid);

    let overdueInterest = 0;
    if (daysElapsedRaw > planDur && baseDue > 0) {
      const extraDays = daysElapsedRaw - planDur;
      const rate = getOverdueRate(planDur);
      overdueInterest = extraDays * (dailyEmi * rate);
    }

    totalDue += Math.max(0, baseDue + overdueInterest);
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
    let lifetimeWriteOffUptoTarget = 0; // 🔥 Settled/Closed accounts में जो interest छोड़ा गया
    let rangeDisbursementSum = 0;
    let rangeInterestSum = 0;
    let rangeAccountsCount = 0;
    let rangeDisbursementSumPrev = 0;
    let rangeInterestSumPrev = 0;
    let rangeExpectedCollectionSum = 0; // 📊 इस period में कुल कितना collect होना चाहिए था (Efficiency % के लिए)
    const allCustomers = [];
    const rangeDisbursedList = []; // 📄 Is period me disburse hue loans (PDF table ke liye)

    custSnap.forEach(doc => {
      const cust = doc.data();
      const loanAmt = Number(cust.loanAmount || 0);
      const isSettledCust = (cust.status === 'Settled' || cust.status === 'Closed');
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

        // 🔥 FIX: Settle करते वक्त जो amount छोड़ा गया, उसे "Portfolio" से हमेशा के लिए हटा दें
        // वरना settled loan का बचा हुआ हिस्सा हमेशा "outstanding portfolio" जैसा दिखता रहेगा
        if (isSettledCust) {
          const expectedTotalForCust = Math.max(loanAmt * 1.2, Number(cust.planDuration || cust.duration || 60) * Number(cust.dailyEmi || cust.emi || 0));
          const collectedForCust = Number(cust.totalCollected || 0);
          lifetimeWriteOffUptoTarget += Math.max(0, expectedTotalForCust - collectedForCust);
        }
      }

      // 📊 EXPECTED COLLECTION — इस loan के हिसाब से इस period (startDateStr–endDateStr) में
      // कितने दिनों की EMI बनती थी (loan की active अवधि और period के overlap से)
      if (loanDateStr) {
        const dailyEmiVal = Number(cust.dailyEmi || cust.emi || 0);
        const planDur = Number(cust.planDuration || cust.duration || 60);
        if (dailyEmiVal > 0) {
          const loanStartD = new Date(loanDateStr);
          const loanEndD = new Date(loanStartD);
          loanEndD.setDate(loanEndD.getDate() + planDur - 1);
          const rangeStartD = new Date(startDateStr);
          const rangeEndD = new Date(endDateStr);
          const todayD = new Date(todayIST);
          const cappedRangeEndD = rangeEndD < todayD ? rangeEndD : todayD;

          const overlapStart = loanStartD > rangeStartD ? loanStartD : rangeStartD;
          const overlapEnd = loanEndD < cappedRangeEndD ? loanEndD : cappedRangeEndD;

          if (overlapEnd >= overlapStart) {
            const days = Math.floor((overlapEnd - overlapStart) / 86400000) + 1;
            rangeExpectedCollectionSum += days * dailyEmiVal;
          }
        }
      }
      if (loanDateStr && loanDateStr >= startDateStr && loanDateStr <= endDateStr) {
        rangeDisbursementSum += loanAmt;
        rangeInterestSum += (loanAmt * 0.20);
        if (cust.status !== "Closed") rangeAccountsCount++;
        rangeDisbursedList.push({
          name: cust.name || "N/A",
          code: cust.customerCode || "",
          mobile: cust.mobile || "",
          loanAmt,
          loanDateStr
        });
      }
      if (loanDateStr && loanDateStr >= prevStart && loanDateStr <= prevEnd) {
        rangeDisbursementSumPrev += loanAmt;
        rangeInterestSumPrev += (loanAmt * 0.20);
      }
    });

    // Total Due
    const totalOverdue = calculateTotalDue(allCustomers, targetDate);

    const rawTotalMarketCap = lifetimeDisbursementUptoTarget + lifetimeInterestUptoTarget;
    const portfolioRemaining = Math.max(0, rawTotalMarketCap - lifetimeCollectionUptoTarget - lifetimeWriteOffUptoTarget);
    const netProfitSum = rangeInterestSum - expensesSum;
    const netProfitSumPrev = rangeInterestSumPrev - expensesSumPrev;

    // Render UI
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

    // 📊 COLLECTION EFFICIENCY % — जितना आना चाहिए था उसमें से कितना % actually आया
    const collectionEfficiency = rangeExpectedCollectionSum > 0
      ? Math.round((rangeCollectionSum / rangeExpectedCollectionSum) * 100)
      : 0;
    const effEl = document.getElementById('collectionEfficiency');
    const effDetailEl = document.getElementById('efficiencyDetail');
    if (effEl) {
      effEl.innerText = `${collectionEfficiency}%`;
      effEl.style.color = collectionEfficiency >= 90 ? '#6EE7B7' : (collectionEfficiency >= 70 ? '#FDE68A' : '#FCA5A5');
    }
    if (effDetailEl) {
      effDetailEl.innerText = `अपेक्षित: ₹${Math.round(rangeExpectedCollectionSum).toLocaleString('en-IN')} में से ₹${Math.round(rangeCollectionSum).toLocaleString('en-IN')} आया`;
    }

    renderTrendChart(last7);

    // 📄 PDF export ke liye is calculation ka snapshot save kar lena
    rangeDisbursedList.sort((a, b) => (a.loanDateStr || "").localeCompare(b.loanDateStr || ""));
    lastReportSnapshot = {
      mode: currentMode,
      periodLabel: getPeriodLabel(currentMode, startDateStr, endDateStr),
      disbursement: rangeDisbursementSum,
      disbursementPrev: rangeDisbursementSumPrev,
      collection: rangeCollectionSum,
      collectionPrev: rangeCollectionSumPrev,
      interestIncome: rangeInterestSum,
      expenses: expensesSum,
      netProfit: netProfitSum,
      totalDue: totalOverdue,
      newAccounts: rangeAccountsCount,
      portfolioRemaining,
      disbursedList: rangeDisbursedList,
      expectedCollection: rangeExpectedCollectionSum,
      collectionEfficiency
    };

    // 💵 CASH BOOK — सिर्फ Daily mode में दिखेगा
    const cashBookCard = document.getElementById('cashBookCard');
    if (currentMode === "Daily") {
      if (cashBookCard) cashBookCard.style.display = "block";
      await loadAndRenderCashBook(targetDate, rangeCollectionSum, rangeDisbursementSum, expensesSum);
    } else {
      if (cashBookCard) cashBookCard.style.display = "none";
    }

  } catch (err) {
    console.error("Report render error:", err);
  } finally {
    setLoading(false);
  }
}

// ============================================================
// 💵 DAILY CASH BOOK — Opening balance load/save + closing calculate
// Firestore: cashbook/{dateStr} = { openingBalance }
// ============================================================
let currentCashBookDate = null;

async function loadAndRenderCashBook(dateStr, collectionAmt, disbursementAmt, expenseAmt) {
  currentCashBookDate = dateStr;
  const openingInput = document.getElementById('cbOpeningBalance');
  let openingBalance = 0;

  try {
    const cbSnap = await getDoc(doc(db, "cashbook", dateStr));
    if (cbSnap.exists()) {
      openingBalance = Number(cbSnap.data().openingBalance || 0);
    } else {
      // Agar aaj ke liye set nahi hai, to kal ka closing balance auto-suggest kar dein
      const prevDate = new Date(dateStr);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = prevDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const prevSnap = await getDoc(doc(db, "cashbook", prevDateStr));
      if (prevSnap.exists() && prevSnap.data().closingBalance != null) {
        openingBalance = Number(prevSnap.data().closingBalance || 0);
      }
    }
  } catch (err) {
    console.error("Cash book load error:", err);
  }

  if (openingInput) openingInput.value = openingBalance || "";
  renderCashBookNumbers(openingBalance, collectionAmt, disbursementAmt, expenseAmt);
}

function renderCashBookNumbers(openingBalance, collectionAmt, disbursementAmt, expenseAmt) {
  const closing = openingBalance + collectionAmt - disbursementAmt - expenseAmt;
  const fmt = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
  set('cbOpening', fmt(openingBalance));
  set('cbCollection', fmt(collectionAmt));
  set('cbDisbursement', fmt(disbursementAmt));
  set('cbExpense', fmt(expenseAmt));
  set('cbClosing', fmt(closing));

  // PDF ke liye bhi save kar lein
  if (lastReportSnapshot) {
    lastReportSnapshot.cashBook = {
      opening: openingBalance,
      collection: collectionAmt,
      disbursement: disbursementAmt,
      expense: expenseAmt,
      closing
    };
  }
}

async function saveCashBookOpening() {
  if (!currentCashBookDate || !lastReportSnapshot) return;
  const openingInput = document.getElementById('cbOpeningBalance');
  const openingBalance = Number(openingInput?.value || 0);
  const cb = lastReportSnapshot.cashBook || {};
  const closing = openingBalance + (cb.collection || 0) - (cb.disbursement || 0) - (cb.expense || 0);

  const saveBtn = document.getElementById('cbSaveBtn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerText = "⏳ Saving..."; }

  try {
    await setDoc(doc(db, "cashbook", currentCashBookDate), {
      date: currentCashBookDate,
      openingBalance,
      closingBalance: closing,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    renderCashBookNumbers(openingBalance, cb.collection || 0, cb.disbursement || 0, cb.expense || 0);
    if (saveBtn) { saveBtn.innerText = "✅ Saved!"; setTimeout(() => { saveBtn.innerText = "💾 Save Opening"; saveBtn.disabled = false; }, 1500); }
  } catch (err) {
    alert("❌ Error: " + err.message);
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerText = "💾 Save Opening"; }
  }
}

// ============================================================
// 📄 SUMMARY REPORT PDF (Disbursement, Collection, Profit, आदि)
// Daily/Monthly/Quarterly/Yearly — jo bhi tab currently selected hai
// ============================================================
function generateSummaryReportPDF() {
  if (!lastReportSnapshot) {
    alert("❌ पहले report load होने दें, फिर PDF download करें।");
    return;
  }
  const s = lastReportSnapshot;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210, pageH = 297, margin = 14;
  let y = margin;

  function drawHeader() {
    doc.setFillColor(58, 28, 98);
    doc.rect(0, 0, pageW, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('GDA FINANCE SERVICES', pageW / 2, 12, { align: 'center' });
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${s.mode} Business Summary Report`, pageW / 2, 19, { align: 'center' });
    doc.setFontSize(8.5);
    doc.text(`Period: ${s.periodLabel}`, pageW / 2, 24.5, { align: 'center' });
    y = 34;
  }

  function drawSummaryCard(label, value, x, w, colorRGB) {
    doc.setFillColor(248, 247, 251);
    doc.setDrawColor(230, 226, 240);
    doc.rect(x, y, w, 22, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 110, 140);
    doc.text(label.toUpperCase(), x + 4, y + 7);
    doc.setFontSize(12.5);
    doc.setTextColor(colorRGB[0], colorRGB[1], colorRGB[2]);
    doc.text(`Rs. ${Math.round(value).toLocaleString('en-IN')}`, x + 4, y + 16);
  }

  drawHeader();

  // ---- SUMMARY CARDS GRID (2 columns) ----
  const colW = (pageW - margin * 2 - 6) / 2;
  const rows = [
    ["Total Disbursement", s.disbursement, [58, 28, 98]],
    ["Total Collection", s.collection, [5, 120, 70]],
    ["Interest Income", s.interestIncome, [5, 120, 70]],
    ["Total Expenses", s.expenses, [200, 40, 40]],
    ["Net Profit", s.netProfit, s.netProfit >= 0 ? [5, 120, 70] : [200, 40, 40]],
    ["Total Outstanding Due", s.totalDue, [200, 40, 40]]
  ];
  for (let i = 0; i < rows.length; i += 2) {
    drawSummaryCard(rows[i][0], rows[i][1], margin, colW, rows[i][2]);
    if (rows[i + 1]) drawSummaryCard(rows[i + 1][0], rows[i + 1][1], margin + colW + 6, colW, rows[i + 1][2]);
    y += 26;
  }

  y += 2;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 55, 75);
  doc.text(`New Loan Accounts Opened: ${s.newAccounts}`, margin, y);
  doc.text(`Portfolio Remaining (Outstanding): Rs. ${Math.round(s.portfolioRemaining).toLocaleString('en-IN')}`, margin, y + 6);
  y += 14;

  // ---- 📊 COLLECTION EFFICIENCY ----
  doc.setFont('helvetica', 'bold');
  const effColor = s.collectionEfficiency >= 90 ? [5, 120, 70] : (s.collectionEfficiency >= 70 ? [180, 130, 10] : [200, 40, 40]);
  doc.setTextColor(effColor[0], effColor[1], effColor[2]);
  doc.text(`Collection Efficiency: ${s.collectionEfficiency}%`, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 110);
  doc.text(`(Expected Rs. ${Math.round(s.expectedCollection).toLocaleString('en-IN')} vs Collected Rs. ${Math.round(s.collection).toLocaleString('en-IN')})`, margin + 62, y);
  y += 12;

  // ---- 💵 CASH BOOK SECTION (सिर्फ Daily mode में) ----
  if (s.mode === "Daily" && s.cashBook) {
    const cb = s.cashBook;
    doc.setFillColor(250, 246, 238);
    doc.setDrawColor(200, 137, 44);
    doc.rect(margin, y, pageW - margin * 2, 42, 'FD');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(58, 28, 98);
    doc.text('Cash Book (Cash In Hand)', margin + 5, y + 8);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 45, 65);
    const lineY = y + 16;
    doc.text(`Opening Balance:  Rs. ${Math.round(cb.opening).toLocaleString('en-IN')}`, margin + 5, lineY);
    doc.setTextColor(5, 120, 70);
    doc.text(`(+) Collection:  Rs. ${Math.round(cb.collection).toLocaleString('en-IN')}`, margin + 5, lineY + 6);
    doc.setTextColor(200, 40, 40);
    doc.text(`(-) Disbursement:  Rs. ${Math.round(cb.disbursement).toLocaleString('en-IN')}`, margin + 5, lineY + 12);
    doc.text(`(-) Expenses:  Rs. ${Math.round(cb.expense).toLocaleString('en-IN')}`, margin + 5, lineY + 18);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(58, 28, 98);
    doc.text(`Closing Cash In Hand: Rs. ${Math.round(cb.closing).toLocaleString('en-IN')}`, pageW - margin - 5, lineY + 12, { align: 'right' });

    y += 48;
  }

  // ---- NEW DISBURSEMENTS TABLE ----
  if (s.disbursedList.length > 0) {
    if (y > pageH - 50) { doc.addPage(); y = margin; drawHeader(); }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 40);
    doc.text('New Disbursements This Period', margin, y);
    y += 6;

    doc.setFillColor(240, 240, 245);
    doc.rect(margin, y, pageW - margin * 2, 8, 'F');
    doc.setFontSize(8.5);
    doc.text('#', margin + 2, y + 5.5);
    doc.text('Date', margin + 10, y + 5.5);
    doc.text('Customer', margin + 32, y + 5.5);
    doc.text('Mobile', margin + 100, y + 5.5);
    doc.text('Code', margin + 130, y + 5.5);
    doc.text('Amount', pageW - margin - 2, y + 5.5, { align: 'right' });
    y += 10;

    doc.setFont('helvetica', 'normal');
    s.disbursedList.forEach((d, idx) => {
      if (y > pageH - 35) {
        doc.addPage();
        y = margin;
        drawHeader();
        doc.setFillColor(240, 240, 245);
        doc.rect(margin, y, pageW - margin * 2, 8, 'F');
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.text('#', margin + 2, y + 5.5);
        doc.text('Date', margin + 10, y + 5.5);
        doc.text('Customer', margin + 32, y + 5.5);
        doc.text('Mobile', margin + 100, y + 5.5);
        doc.text('Code', margin + 130, y + 5.5);
        doc.text('Amount', pageW - margin - 2, y + 5.5, { align: 'right' });
        y += 10;
        doc.setFont('helvetica', 'normal');
      }
      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 252);
        doc.rect(margin, y - 4.5, pageW - margin * 2, 7, 'F');
      }
      doc.setFontSize(8.5);
      doc.setTextColor(20, 20, 30);
      doc.text(String(idx + 1), margin + 2, y);
      doc.text(d.loanDateStr || '-', margin + 10, y);
      doc.text((d.name.length > 26 ? d.name.slice(0, 24) + '..' : d.name), margin + 32, y);
      doc.text(d.mobile || '-', margin + 100, y);
      doc.text(d.code || '-', margin + 130, y);
      doc.setTextColor(58, 28, 98);
      doc.setFont('helvetica', 'bold');
      doc.text(`Rs.${Math.round(d.loanAmt).toLocaleString('en-IN')}`, pageW - margin - 2, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(20, 20, 30);
      y += 7;
    });
  }

  // ---- SIGNATURE LINE ----
  if (y > pageH - 30) { doc.addPage(); y = margin + 10; }
  y += 14;
  doc.setDrawColor(15, 23, 42);
  doc.line(margin, y, margin + 60, y);
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Prepared By', margin, y + 5);
  doc.line(pageW - margin - 60, y, pageW - margin, y);
  doc.text('Verified By (Manager)', pageW - margin - 60, y + 5);

  doc.save(`GDA_${s.mode}_Summary_Report_${s.periodLabel.replace(/\s|,/g, '_')}.pdf`);
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
    const collections = ['customers', 'collections', 'expenses', 'metadata', 'applications', 'cashbook'];
    let backupData = {};

    for (const colName of collections) {
      const snapshot = await getDocs(collection(db, colName));
      backupData[colName] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
    }

    // 🔁 हर customer के अंदर की "Loan Cycle History" (Renew का पुराना data) भी बैकअप में जोड़ें
    backupData.loanHistory = {};
    for (const cust of backupData.customers) {
      const histSnap = await getDocs(collection(db, "customers", cust.id, "loanHistory"));
      if (!histSnap.empty) {
        backupData.loanHistory[cust.id] = histSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    }

    backupData._backupInfo = {
      generatedAt: new Date().toISOString(),
      version: 'GDA_Backup_v2',
      totalCustomers: backupData.customers?.length || 0,
      totalCollections: backupData.collections?.length || 0,
      totalApplications: backupData.applications?.length || 0,
      totalCashBookDays: backupData.cashbook?.length || 0
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

  // Restore se pehle current data ki ek safety copy download kar lo
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

  // 📄 Summary Report PDF Download
  const downloadReportPdfBtn = document.getElementById('downloadReportPdfBtn');
  if (downloadReportPdfBtn) downloadReportPdfBtn.addEventListener('click', generateSummaryReportPDF);

  // 💵 Cash Book — Save Opening Balance
  const cbSaveBtn = document.getElementById('cbSaveBtn');
  if (cbSaveBtn) cbSaveBtn.addEventListener('click', saveCashBookOpening);

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
// START – LOCK CHECK
// ============================================================
checkLock();
