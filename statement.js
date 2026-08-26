import { db, auth } from "./firebase.js";
import { 
  doc, getDoc, updateDoc, deleteDoc, addDoc, deleteField,
  collection, query, where, getDocs 
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const ADMIN_PASSWORD = "GDA@2026";
let currentCustomer = null;
let currentCustomerId = null;

const loadingMsg = document.getElementById("loadingMsg");
const profileContent = document.getElementById("profileContent");

// ============================================================
// 🔥 Helper – Multi-Key Search (Aadhar, PAN)
// ============================================================
function getCustomerValue(cust, keys, defaultValue = 'Not Provided') {
  if (!cust) return defaultValue;
  for (let key of keys) {
    if (cust[key] && cust[key] !== '') {
      return cust[key];
    }
  }
  return defaultValue;
}

function getCustomerIdFromUrl() {
  return new URLSearchParams(window.location.search).get('id');
}

// ============================================================
// 💰 OVERDUE INTEREST — Plan खत्म होने के बाद बचे पैसे पर लगेगा
// 60 din plan -> Daily EMI ka 10%/din, 80 din -> 20%/din, 120 din -> 30%/din
// ============================================================
function getOverdueRate(planDur) {
  if (planDur <= 60) return 0.10;
  if (planDur <= 80) return 0.20;
  return 0.30;
}

function calculateDueWithOverdue(cust) {
  const planDur = Number(cust.planDuration || cust.duration || 60);
  const dailyEmi = Number(cust.dailyEmi || cust.emi || 0);
  const totalPaid = Number(cust.totalCollected || 0);
  const loanAmount = Number(cust.loanAmount || 0);

  const baseTotal = Math.max(loanAmount * 1.2, planDur * dailyEmi);
  const baseRemaining = Math.max(0, baseTotal - totalPaid);

  const loanDate = new Date(cust.loanDate || cust.startDate || new Date());
  const today = new Date();
  let daysElapsedRaw = Math.max(0, Math.floor((today - loanDate) / (1000 * 60 * 60 * 24))) + 1;

  let overdueInterest = 0;
  let extraDays = 0;
  if (daysElapsedRaw > planDur && baseRemaining > 0) {
    extraDays = daysElapsedRaw - planDur;
    const rate = getOverdueRate(planDur);
    overdueInterest = extraDays * (dailyEmi * rate);
  }

  return {
    baseRemaining,
    overdueInterest,
    extraDays,
    totalDue: Math.max(0, baseRemaining + overdueInterest)
  };
}

// ============================================================
// 🖥️ RENDER PROFILE (अब डॉक्यूमेंट्स के साथ)
// ============================================================
function renderProfile(cust, logs) {
  const planDur = Number(cust.planDuration || cust.duration || 60);
  const dailyEmi = Number(cust.dailyEmi || cust.emi || 0);
  const totalPaid = Number(cust.totalCollected || 0);
  const paidDays = Number(cust.paidDays || 0);
  const loanAmount = Number(cust.loanAmount || 0);
  const isSettled = (cust.status === 'Settled' || cust.status === 'Closed');
  const dueInfo = calculateDueWithOverdue(cust);
  // 🔥 FIX: Settle हो चुके account पर "Remaining" ₹0 दिखेगा (officially बंद है)
  // पर कितना amount छोड़ा गया वो record के लिए अलग से दिखेगा
  const writeOffAmount = isSettled ? dueInfo.totalDue : 0;
  const remaining = isSettled ? 0 : dueInfo.totalDue;
  const photo = (cust.photoUrl && cust.photoUrl.startsWith('http')) ? cust.photoUrl : 'https://via.placeholder.com/70';

  // 🔥 AUTO-CLOSE SAFETY NET — अगर पूरा loan भर चुका है (Remaining ₹0) पर
  // status अभी भी "Active" है (पुराने collections से जो auto-close से पहले भरे गए थे),
  // तो यहाँ भी खुद-ब-खुद उसे "Closed" कर दें
  if (!isSettled && dueInfo.totalDue <= 0 && cust.status !== 'Active_Manual_Override') {
    updateDoc(doc(db, "customers", currentCustomerId), {
      status: "Closed",
      settlementDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    }).then(() => { window.location.reload(); }).catch(() => {});
    return; // अभी के render को रोक दें, reload होते ही सही "Closed" स्टेट दिखेगी
  }

  const aadharValue = getCustomerValue(cust, ['aadhar', 'aadhaar', 'aadharNumber', 'aadhaarNumber', 'aadharNo', 'aadhaarNo']);
  const panValue = getCustomerValue(cust, ['pan', 'panNumber', 'panCard', 'panNo']);

  // 🔥 डॉक्यूमेंट फोटो – अगर URL है तो दिखाएँ, वरना placeholder
  const aadharPhoto = cust.aadharPhoto || cust.aadharPhotoUrl || '';
  const panPhoto = cust.panPhoto || cust.panPhotoUrl || '';
  const voterPhoto = cust.voterPhoto || cust.voterPhotoUrl || '';

  let html = `
    <div class="profile-card">
      <div class="profile-top">
        <img src="${photo}" onerror="this.src='https://via.placeholder.com/70'">
        <div>
          <h2>${cust.name || 'N/A'}</h2>
          <p>📞 ${cust.mobile || 'N/A'} &nbsp;|&nbsp; 📋 ${cust.customerCode || 'GDA'}</p>
        </div>
      </div>
      <div class="info-grid">
        <div class="info-item"><div class="label">Loan Date</div><div class="value">${cust.loanDate || cust.startDate || 'N/A'}</div></div>
        <div class="info-item"><div class="label">Daily EMI</div><div class="value">₹${dailyEmi}</div></div>
        <div class="info-item"><div class="label">Plan Duration</div><div class="value">${planDur} Days</div></div>
        <div class="info-item"><div class="label">Remaining</div><div class="value" style="color:${isSettled ? '#059669' : '#DC2626'};">₹${remaining.toLocaleString('en-IN')}</div>${!isSettled && dueInfo.overdueInterest > 0 ? `<div style="font-size:10px;color:#DC2626;font-weight:700;margin-top:2px;">⚠️ +₹${Math.round(dueInfo.overdueInterest).toLocaleString('en-IN')} Overdue (${dueInfo.extraDays} din)</div>` : ''}${isSettled && writeOffAmount > 0 ? `<div style="font-size:10px;color:#B45309;font-weight:700;margin-top:2px;">ℹ️ ₹${Math.round(writeOffAmount).toLocaleString('en-IN')} settlement में छोड़ा गया</div>` : ''}</div>
        <div class="info-item"><div class="label">Paid Days</div><div class="value">${paidDays} Days</div></div>
        <div class="info-item"><div class="label">Total Collected</div><div class="value">₹${totalPaid.toLocaleString('en-IN')}</div></div>
      </div>

      <!-- KYC DETAILS -->
      <div class="kyc-section">
        <h4>🔐 KYC VERIFICATION DETAILS</h4>
        <div class="kyc-row"><span>Aadhar Number</span><b>${aadharValue}</b></div>
        <div class="kyc-row"><span>PAN Card</span><b>${panValue}</b></div>
        <div class="kyc-row"><span>Residential Address</span><b>${cust.address || 'Not Provided'}</b></div>
        <div class="kyc-row"><span>Status</span><b style="color:${isSettled ? '#059669' : '#DC2626'};">${cust.status || 'Active'}</b></div>
      </div>

      <!-- ===== 📁 KYC DOCUMENTS (NEW) ===== -->
      <div class="kyc-section" style="margin-top:12px; background:#F8FAFF; border-color:#E2E8F0;">
        <h4 style="color:#3A1C62;">📁 KYC DOCUMENTS</h4>
        <div class="doc-grid">
          <div class="doc-item">
            <p>🆔 Aadhar Card</p>
            ${aadharPhoto ? `<img src="${aadharPhoto}" alt="Aadhar" onclick="window.open('${aadharPhoto}','_blank')" style="cursor:pointer;">` : `<div class="no-doc">No photo uploaded</div>`}
          </div>
          <div class="doc-item">
            <p>📇 PAN Card</p>
            ${panPhoto ? `<img src="${panPhoto}" alt="PAN" onclick="window.open('${panPhoto}','_blank')" style="cursor:pointer;">` : `<div class="no-doc">No photo uploaded</div>`}
          </div>
          <div class="doc-item">
            <p>🗳️ Voter ID</p>
            ${voterPhoto ? `<img src="${voterPhoto}" alt="Voter" onclick="window.open('${voterPhoto}','_blank')" style="cursor:pointer;">` : `<div class="no-doc">No photo uploaded</div>`}
          </div>
        </div>
      </div>

      <!-- ACTION BUTTONS -->
      <div class="action-bar">
        <button class="action-btn whatsapp" id="whatsappBtn">💬 WhatsApp</button>
        <button class="action-btn pdf" id="pdfBtn">📄 PDF</button>
        <a href="bond.html?id=${currentCustomerId}" class="action-btn bond" target="_blank">📜 Bond</a>
        <button class="action-btn settle ${isSettled ? 'settled' : ''}" id="settleBtn" ${isSettled ? 'disabled' : ''}>
          ${isSettled ? '✅ Settled' : '⚖️ Settle'}
        </button>
        ${isSettled ? `<button class="action-btn noc" id="nocBtn">📃 NOC</button>` : ''}
        ${isSettled ? `<button class="action-btn renew" id="renewBtn">🔄 Renew</button>` : ''}
        ${isSettled ? `<button class="action-btn" id="undoSettleBtn" style="background:#FEF3C7;color:#B45309;border:1px solid #FDE68A;">↩️ Undo Settle</button>` : ''}
      </div>
    </div>

    <!-- LOAN CYCLE HISTORY -->
    <div class="loan-history-section">
      <h3>🔁 Loan Cycle History</h3>
      <div id="loanHistoryList"><p class="history-empty">⏳ Loading...</p></div>
    </div>

    <!-- EMI LOGS TABLE -->
    <div class="table-wrap">
      <h3>📋 RECEIVED INSTALLMENTS (EMI LOGS)</h3>
      <table>
        <thead><tr><th>Date</th><th>Note</th><th>Amount</th><th>Action</th></tr></thead>
        <tbody id="logsBody">
          ${logs.length === 0 ? `<tr><td colspan="4" class="empty-msg">No collections yet.</td></tr>` : 
            logs.map(log => `
              <tr>
                <td>${log.date || log.collectionDate || 'N/A'}</td>
                <td>${log.note || 'EMI Received'}</td>
                <td><strong>₹${log.amount || log.collectionAmount || 0}</strong></td>
                <td><button class="del-btn" data-logid="${log.docId}" data-custid="${currentCustomerId}">Del</button></td>
              </tr>
            `).join('')
          }
        </tbody>
      </table>
    </div>
  `;

  profileContent.innerHTML = html;
  loadingMsg.style.display = 'none';
  profileContent.style.display = 'block';

  // Attach Event Listeners
  document.getElementById('whatsappBtn')?.addEventListener('click', () => shareWhatsApp(cust));
  document.getElementById('pdfBtn')?.addEventListener('click', () => generatePDF(cust, logs));
  document.getElementById('settleBtn')?.addEventListener('click', () => handleSettle(cust));
  document.getElementById('nocBtn')?.addEventListener('click', () => generateNOC(cust));
  document.getElementById('renewBtn')?.addEventListener('click', () => handleRenewLoan(cust));
  document.getElementById('undoSettleBtn')?.addEventListener('click', () => handleUndoSettle(cust));

  loadLoanHistory();

  document.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const logId = btn.dataset.logid;
      const custId = btn.dataset.custid;
      await deleteLog(logId, custId);
    });
  });
}

// ============================================================
// 💬 WHATSAPP SHARE (सभी डिटेल + डॉक्यूमेंट स्टेटस)
// ============================================================
function shareWhatsApp(cust) {
  const aadharValue = getCustomerValue(cust, ['aadhar', 'aadhaar', 'aadharNumber', 'aadhaarNumber', 'aadharNo', 'aadhaarNo']);
  const panValue = getCustomerValue(cust, ['pan', 'panNumber', 'panCard', 'panNo']);
  const hasAadharDoc = cust.aadharPhoto ? '✅' : '❌';
  const hasPanDoc = cust.panPhoto ? '✅' : '❌';
  const hasVoterDoc = cust.voterPhoto ? '✅' : '❌';
  
  const msg = `*GDA FINANCE SERVICES*%0A%0A📄 *KYC STATEMENT*%0A%0A👤 *Name:* ${cust.name}%0A📞 *Mobile:* ${cust.mobile}%0A🆔 *Code:* ${cust.customerCode}%0A📅 *Loan Date:* ${cust.loanDate || 'N/A'}%0A💰 *EMI:* ₹${cust.dailyEmi || cust.emi || 0}%0A📆 *Duration:* ${cust.planDuration || cust.duration || 60} Days%0A💵 *Paid:* ₹${cust.totalCollected || 0}%0A🆔 *Aadhar:* ${aadharValue}%0A📇 *PAN:* ${panValue}%0A🏠 *Address:* ${cust.address || 'N/A'}%0A%0A📁 *Documents:*%0A🆔 Aadhar: ${hasAadharDoc}%0A📇 PAN: ${hasPanDoc}%0A🗳️ Voter: ${hasVoterDoc}%0A📍 *Branch:* Garhwa`;
  window.open(`https://wa.me/91${cust.mobile}?text=${msg}`, '_blank');
}

// ============================================================
// 🖼️ Helper – किसी भी image URL को base64 में बदलना (PDF में लगाने के लिए)
// अगर host CORS allow नहीं करता (जैसे कुछ पुराने ImgBB लिंक), तो चुपचाप fail
// हो जाएगा और PDF बिना फोटो के generate होता रहेगा — कभी टूटेगा नहीं।
// ============================================================
function loadImageAsBase64(url) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (e) {
        resolve(null); // CORS ने canvas को "taint" कर दिया — फोटो skip
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// पेज खत्म होने वाला हो तो नया पेज जोड़ना (हर सेक्शन के लिए reusable)
function ensureSpace(doc, y, needed, margin) {
  if (y + needed > 275) {
    doc.addPage();
    return margin;
  }
  return y;
}

// ============================================================
// 📄 PDF GENERATION – emoji हटाए गए (jsPDF में emoji glyph सपोर्ट नहीं है,
// पहले ये खाली बॉक्स बनकर आते थे), photo embed, total summary, page number जोड़े
// ============================================================
async function generatePDF(cust, logs, externalBtn) {
  const pdfBtn = externalBtn || document.getElementById('pdfBtn');
  if (pdfBtn) { pdfBtn.disabled = true; pdfBtn.textContent = '⏳ Generating...'; }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = 210;
    const margin = 16;
    let y = margin;

    const aadharValue = getCustomerValue(cust, ['aadhar', 'aadhaar', 'aadharNumber', 'aadhaarNumber', 'aadharNo', 'aadhaarNo']);
    const panValue = getCustomerValue(cust, ['pan', 'panNumber', 'panCard', 'panNo']);

    // Customer photo पहले से load कर लें (network call है, इसलिए PDF बनने से पहले)
    const photoUrl = (cust.photoUrl && cust.photoUrl.startsWith('http')) ? cust.photoUrl : null;
    const photoBase64 = await loadImageAsBase64(photoUrl);

    // ---- HEADER ----
    doc.setFillColor(26, 35, 53);
    doc.rect(margin, y, pageW - (margin * 2), 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('GDA FINANCE SERVICES', pageW / 2, y + 12, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 200);
    doc.text('Digital Loan Distribution & Micro Finance System', pageW / 2, y + 22, { align: 'center' });
    y += 32;

    // ---- TITLE ----
    doc.setTextColor(26, 35, 53);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER KYC & STATEMENT REPORT', pageW / 2, y, { align: 'center' });
    y += 6;
    doc.setDrawColor(26, 35, 53);
    doc.setLineWidth(0.5);
    doc.line(margin + 20, y, pageW - margin - 20, y);
    y += 10;

    // ---- CUSTOMER DETAILS BOX (साथ में फोटो, अगर load हो पाई हो) ----
    const boxH = 52;
    doc.setFillColor(248, 250, 255);
    doc.setDrawColor(200, 200, 210);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, pageW - (margin * 2), boxH, 'FD');

    let textStartX = margin + 8;
    if (photoBase64) {
      try {
        const photoSize = 26;
        const photoX = pageW - margin - photoSize - 8;
        const photoY = y + (boxH - photoSize) / 2;
        doc.addImage(photoBase64, 'JPEG', photoX, photoY, photoSize, photoSize);
        doc.setDrawColor(220, 220, 220);
        doc.rect(photoX, photoY, photoSize, photoSize);
      } catch (e) {
        // Photo add fail hua to bina photo ke aage badho, PDF nahi rukega
      }
    }

    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const leftX = textStartX;
    const rightX = pageW / 2 - 8;
    const rowH = 10;
    let ry = y + 6;

    const leftFields = [
      { label: 'Name', value: cust.name || 'N/A' },
      { label: 'Mobile', value: cust.mobile || 'N/A' },
      { label: 'EMI', value: `Rs. ${cust.dailyEmi || cust.emi || 0}` },
      { label: 'Total Paid', value: `Rs. ${cust.totalCollected || 0}` }
    ];
    leftFields.forEach((f, idx) => {
      const yy = ry + (idx * rowH);
      doc.setTextColor(120, 120, 130);
      doc.setFont('helvetica', 'normal');
      doc.text(f.label + ':', leftX, yy);
      doc.setTextColor(26, 35, 53);
      doc.setFont('helvetica', 'bold');
      // लंबी value box से बाहर न जाए
      const val = doc.splitTextToSize(String(f.value), 55)[0];
      doc.text(val, leftX + 28, yy);
    });

    const rightFields = [
      { label: 'Code', value: cust.customerCode || 'GDA' },
      { label: 'Loan Date', value: cust.loanDate || cust.startDate || 'N/A' },
      { label: 'Duration', value: `${cust.planDuration || cust.duration || 60} Days` },
      { label: 'Paid Days', value: `${cust.paidDays || 0} Days` }
    ];
    rightFields.forEach((f, idx) => {
      const yy = ry + (idx * rowH);
      doc.setTextColor(120, 120, 130);
      doc.setFont('helvetica', 'normal');
      doc.text(f.label + ':', rightX, yy);
      doc.setTextColor(26, 35, 53);
      doc.setFont('helvetica', 'bold');
      doc.text(String(f.value), rightX + 26, yy);
    });

    y += boxH + 4;

    // ---- REMAINING BALANCE (highlight, जैसे app screen पर दिखता है) ----
    const isSettledPdf = (cust.status === 'Settled' || cust.status === 'Closed');
    const dueInfoPdf = calculateDueWithOverdue(cust);
    const remaining = isSettledPdf ? 0 : dueInfoPdf.totalDue;
    const writeOffPdf = isSettledPdf ? dueInfoPdf.totalDue : 0;

    doc.setFillColor(remaining > 0 ? 254 : 236, remaining > 0 ? 242 : 253, remaining > 0 ? 242 : 245);
    doc.setDrawColor(remaining > 0 ? 220 : 180, remaining > 0 ? 38 : 220, remaining > 0 ? 38 : 150);
    doc.rect(margin, y, pageW - (margin * 2), dueInfoPdf.overdueInterest > 0 ? 18 : 12, 'FD');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(remaining > 0 ? 185 : 5, remaining > 0 ? 28 : 120, remaining > 0 ? 28 : 70);
    doc.text(
      remaining > 0 ? `REMAINING BALANCE: Rs. ${remaining.toLocaleString('en-IN')}` : 'ACCOUNT FULLY SETTLED',
      pageW / 2, y + 8, { align: 'center' }
    );
    if (!isSettledPdf && dueInfoPdf.overdueInterest > 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `(Includes overdue interest: Rs. ${Math.round(dueInfoPdf.overdueInterest).toLocaleString('en-IN')} for ${dueInfoPdf.extraDays} extra days)`,
        pageW / 2, y + 14, { align: 'center' }
      );
      y += 24;
    } else if (isSettledPdf && writeOffPdf > 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `(Settled with Rs. ${Math.round(writeOffPdf).toLocaleString('en-IN')} waived off)`,
        pageW / 2, y + 14, { align: 'center' }
      );
      y += 24;
    } else {
      y += 18;
    }

    // ---- KYC DETAILS BOX ----
    y = ensureSpace(doc, y, 30, margin);
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(220, 180, 80);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, pageW - (margin * 2), 30, 'FD');
    doc.setTextColor(120, 80, 10);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('KYC VERIFICATION DETAILS', margin + 8, y + 6);
    doc.setTextColor(60, 60, 70);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const kycY = y + 14;
    doc.text(`Aadhar: ${aadharValue}`, margin + 8, kycY);
    doc.text(`PAN: ${panValue}`, margin + 70, kycY);
    doc.text(`Status: ${cust.status || 'Active'}`, margin + 130, kycY);
    const addressLines = doc.splitTextToSize(`Address: ${cust.address || 'Not Provided'}`, pageW - (margin * 2) - 16);
    doc.text(addressLines[0] || '', margin + 8, kycY + 8);
    y += 34;

    // ---- DOCUMENTS STATUS ----
    y = ensureSpace(doc, y, 30, margin);
    doc.setTextColor(26, 35, 53);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('KYC DOCUMENTS STATUS', margin, y);
    y += 6;
    doc.setDrawColor(200, 200, 210);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Aadhar Card: ${cust.aadharPhoto ? 'Uploaded' : 'Not Uploaded'}`, margin + 4, y);
    y += 7;
    doc.text(`PAN Card: ${cust.panPhoto ? 'Uploaded' : 'Not Uploaded'}`, margin + 4, y);
    y += 7;
    doc.text(`Voter ID: ${cust.voterPhoto ? 'Uploaded' : 'Not Uploaded'}`, margin + 4, y);
    y += 12;

    // ---- EMI LOGS TABLE ----
    y = ensureSpace(doc, y, 20, margin);
    doc.setTextColor(26, 35, 53);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('COLLECTION HISTORY (EMI LOGS)', margin, y);
    y += 6;
    doc.setDrawColor(200, 200, 210);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageW - margin, y);
    y += 4;

    const col1 = margin + 4;
    const col2 = margin + 50;
    const col3 = margin + 110;
    const col4 = margin + 160;

    function drawTableHeader(yy) {
      doc.setFillColor(240, 245, 255);
      doc.rect(margin, yy, pageW - (margin * 2), 8, 'F');
      doc.setTextColor(60, 60, 80);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Date', col1, yy + 5.5);
      doc.text('Note', col2, yy + 5.5);
      doc.text('Amount', col3, yy + 5.5);
      doc.text('Action', col4, yy + 5.5);
      return yy + 8;
    }
    y = drawTableHeader(y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 50);
    doc.setFontSize(8);
    let logsTotal = 0;

    if (logs.length === 0) {
      doc.text('No collection records found.', margin + 8, y + 5);
      y += 10;
    } else {
      logs.forEach((log, idx) => {
        const date = log.date || log.collectionDate || 'N/A';
        const note = log.note || 'EMI Received';
        const amountNum = Number(log.amount || log.collectionAmount || 0);
        logsTotal += amountNum;

        // हर row से पहले चेक करें पेज में जगह है या नहीं; न हो तो नया पेज + header दोबारा
        if (y + 7 > 270) {
          doc.addPage();
          y = margin;
          y = drawTableHeader(y);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(40, 40, 50);
          doc.setFontSize(8);
        }

        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 255);
          doc.rect(margin, y, pageW - (margin * 2), 7, 'F');
        }
        doc.text(String(date), col1, y + 4.5);
        doc.text(String(note), col2, y + 4.5);
        doc.text(`Rs. ${amountNum}`, col3, y + 4.5);
        doc.text('Paid', col4, y + 4.5);
        y += 7;
      });

      // ---- TOTAL SUMMARY ROW ----
      y = ensureSpace(doc, y, 10, margin);
      doc.setDrawColor(26, 35, 53);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageW - margin, y);
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(26, 35, 53);
      doc.text(`Total Collected (${logs.length} entries): Rs. ${logsTotal.toLocaleString('en-IN')}`, margin + 4, y);
      y += 10;
    }

    // ---- FOOTER + PAGE NUMBERS on every page ----
    const now = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(200, 200, 210);
      doc.setLineWidth(0.2);
      doc.line(margin, 285, pageW - margin, 285);
      doc.setTextColor(150, 150, 160);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${now} | GDA Finance Services`, margin, 291);
      doc.text(`Page ${i} of ${totalPages}`, pageW - margin, 291, { align: 'right' });
    }

    doc.save(`${(cust.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_')}_GDA_Statement.pdf`);

  } catch (err) {
    console.error('PDF generation error:', err);
    alert('PDF banane me error aayi: ' + err.message);
  } finally {
    if (pdfBtn) { pdfBtn.disabled = false; pdfBtn.textContent = '📄 PDF'; }
  }
}

// ============================================================
// 📃 LOAN CLOSURE CERTIFICATE (NOC) — सिर्फ Settled loan के लिए
// ============================================================
function generateNOC(cust) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const margin = 20;
  let y = margin;

  // Header
  doc.setFillColor(26, 35, 53);
  doc.rect(margin, y, pageW - (margin * 2), 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.text('GDA FINANCE SERVICES', pageW / 2, y + 11, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  doc.text('Digital Loan Distribution & Micro Finance System', pageW / 2, y + 19, { align: 'center' });
  y += 40;

  // Title
  doc.setTextColor(5, 150, 105);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('NO DUES CERTIFICATE (NOC)', pageW / 2, y, { align: 'center' });
  y += 4;
  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(0.6);
  doc.line(margin + 30, y, pageW - margin - 30, y);
  y += 16;

  // Body text
  const settlementDate = cust.settlementDate || new Date().toISOString().split('T')[0];
  doc.setTextColor(30, 30, 40);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const paragraph =
    `This is to certify that Mr./Mrs. ${cust.name || 'N/A'} (Customer Code: ${cust.customerCode || 'GDA'}), ` +
    `residing at ${cust.address || 'N/A'}, holding Mobile Number ${cust.mobile || 'N/A'}, had taken a loan of ` +
    `Rs. ${Number(cust.loanAmount || 0).toLocaleString('en-IN')} from GDA Finance Services on ${cust.loanDate || 'N/A'}.`;
  const paragraph2 =
    `We hereby confirm that the borrower has repaid the entire loan amount along with applicable interest in full, ` +
    `and there are NO DUES pending against this loan account as of ${settlementDate}.`;

  const lines1 = doc.splitTextToSize(paragraph, pageW - margin * 2);
  doc.text(lines1, margin, y);
  y += lines1.length * 6 + 6;

  const lines2 = doc.splitTextToSize(paragraph2, pageW - margin * 2);
  doc.text(lines2, margin, y);
  y += lines2.length * 6 + 16;

  // Details box
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(167, 243, 208);
  doc.rect(margin, y, pageW - margin * 2, 36, 'FD');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  const boxY = y + 10;
  doc.text(`Loan Amount: Rs. ${Number(cust.loanAmount || 0).toLocaleString('en-IN')}`, margin + 8, boxY);
  doc.text(`Total Paid: Rs. ${Number(cust.totalCollected || 0).toLocaleString('en-IN')}`, margin + 8, boxY + 9);
  doc.text(`Settlement Date: ${settlementDate}`, margin + 8, boxY + 18);
  y += 46;

  // Footer / Signature
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 110);
  doc.text('This is a system-generated certificate and does not require a physical signature.', margin, y);
  y += 20;
  doc.setDrawColor(15, 23, 42);
  doc.line(margin, y, margin + 60, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Branch Manager (Authorized)', margin, y + 6);
  doc.text('GDA Finance Services', margin, y + 12);

  doc.save(`${(cust.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_')}_NOC_Certificate.pdf`);
}

// ============================================================
// 🔁 LOAN CYCLE HISTORY — पुराने बंद हो चुके loans दिखाना
// ============================================================
async function loadLoanHistory() {
  const listEl = document.getElementById('loanHistoryList');
  if (!listEl) return;
  try {
    const histSnap = await getDocs(collection(db, "customers", currentCustomerId, "loanHistory"));
    if (histSnap.empty) {
      listEl.innerHTML = `<p class="history-empty">कोई पुराना loan cycle नहीं मिला — यह पहला loan है।</p>`;
      return;
    }
    let cycles = [];
    histSnap.forEach(d => cycles.push({ historyId: d.id, ...d.data() }));
    cycles.sort((a, b) => new Date(b.closedOn || 0) - new Date(a.closedOn || 0));

    listEl.innerHTML = cycles.map((c, idx) => `
      <div class="history-cycle">
        <div class="hc-row"><span>Cycle</span><b>#${cycles.length - idx}</b></div>
        <div class="hc-row"><span>Loan Amount</span><b>₹${Number(c.loanAmount || 0).toLocaleString('en-IN')}</b></div>
        <div class="hc-row"><span>Loan Date</span><b>${c.loanDate || 'N/A'}</b></div>
        <div class="hc-row"><span>Total Paid</span><b>₹${Number(c.totalCollected || 0).toLocaleString('en-IN')}</b></div>
        <div class="hc-row"><span>Closed On</span><b>${c.closedOn || 'N/A'}</b></div>
        <button class="history-pdf-btn" data-historyid="${c.historyId}" style="width:100%;margin-top:10px;padding:9px;background:#FFF1F2;color:#DC2626;border:1px solid #FFE4E6;border-radius:10px;font-weight:700;font-size:12px;cursor:pointer;">📄 इस पुराने Loan की PDF निकालें</button>
        ${idx === 0 ? `<button class="restore-cycle-btn" data-historyid="${c.historyId}" style="width:100%;margin-top:8px;padding:9px;background:#FEF3C7;color:#B45309;border:1px solid #FDE68A;border-radius:10px;font-weight:700;font-size:12px;cursor:pointer;">↩️ यह Cycle वापस करें (Undo Renew)</button>` : ''}
      </div>
    `).join('');

    listEl.querySelectorAll('.history-pdf-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = cycles.find(c => c.historyId === btn.dataset.historyid);
        if (target) generateHistoricalCyclePDF(target, btn);
      });
    });

    const restoreBtn = listEl.querySelector('.restore-cycle-btn');
    if (restoreBtn) {
      restoreBtn.addEventListener('click', () => {
        const target = cycles.find(c => c.historyId === restoreBtn.dataset.historyid);
        if (target) handleUndoRenew(target);
      });
    }
  } catch (err) {
    listEl.innerHTML = `<p class="history-empty">History लोड नहीं हो पाई।</p>`;
    console.error(err);
  }
}

// ============================================================
// 📄 पुराने (Closed/Renewed) Loan Cycle की PDF निकालना
// ============================================================
async function generateHistoricalCyclePDF(cycle, btn) {
  const originalText = btn ? btn.innerText : '';
  if (btn) { btn.disabled = true; btn.innerText = '⏳ बन रहा है...'; }
  try {
    // उसी customer की सभी collections में से इसी cycle की अवधि (loanDate से closedOn तक) वाली निकालें
    const q = query(collection(db, "collections"), where("customerId", "==", currentCustomerId));
    const snap = await getDocs(q);
    let allLogs = [];
    snap.forEach(d => allLogs.push({ docId: d.id, ...d.data() }));

    const startD = cycle.loanDate || '';
    const endD = cycle.closedOn || '9999-12-31';
    let cycleLogs = allLogs.filter(log => {
      const d = log.date || log.collectionDate || '';
      return d >= startD && d <= endD;
    });
    cycleLogs.sort((a, b) => new Date(b.date || b.collectionDate || 0) - new Date(a.date || a.collectionDate || 0));

    // इस पुराने cycle जैसा दिखने वाला customer-object बनाएं (KYC details currentCustomer से लें)
    const historicalCust = {
      ...currentCustomer,
      loanAmount: cycle.loanAmount || 0,
      loanDate: cycle.loanDate || '',
      planDuration: cycle.planDuration || 60,
      dailyEmi: cycle.dailyEmi || 0,
      totalCollected: cycle.totalCollected || 0,
      paidDays: cycle.paidDays || 0,
      status: 'Settled',
      settlementDate: cycle.closedOn || ''
    };

    await generatePDF(historicalCust, cycleLogs, btn);
  } catch (err) {
    alert('❌ Error: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = originalText; }
  }
}

// ============================================================
// ↩️ UNDO RENEW — galti se "Renew" hue naye cycle ko hataakar
// purana cycle (uski asli remaining/paid amount ke saath) wapas laana
// ============================================================
async function handleUndoRenew(cycle) {
  const pass = prompt("🔑 Admin Password to Undo Renew:");
  if (pass !== ADMIN_PASSWORD) {
    if (pass !== null) alert("❌ Wrong Password!");
    return;
  }
  if (!confirm(
    `⚠️ Confirm: क्या आप इस नए loan cycle (₹${currentCustomer?.loanAmount || 0}) को हटाकर पुराना cycle वापस लाना चाहते हैं?\n\n` +
    `पुराना cycle वापस आएगा:\nLoan Amount: ₹${Number(cycle.loanAmount || 0).toLocaleString('en-IN')}\nTotal Paid: ₹${Number(cycle.totalCollected || 0).toLocaleString('en-IN')}\n\n` +
    `नया cycle (अभी तक ₹${currentCustomer?.totalCollected || 0} ही collect हुआ है) हट जाएगा।`
  )) return;

  try {
    const custRef = doc(db, "customers", currentCustomerId);
    await updateDoc(custRef, {
      loanAmount: cycle.loanAmount || 0,
      loanDate: cycle.loanDate || '',
      planDuration: cycle.planDuration || 60,
      dailyEmi: cycle.dailyEmi || 0,
      totalCollected: cycle.totalCollected || 0,
      paidDays: cycle.paidDays || 0,
      status: "Settled",
      settlementDate: cycle.closedOn || new Date().toISOString().split('T')[0]
    });

    // History से wo cycle हटा दें, क्योंकि अब वो दोबारा active/settled record बन गया
    await deleteDoc(doc(db, "customers", currentCustomerId, "loanHistory", cycle.historyId));

    alert("✅ पुराना Loan Cycle वापस आ गया!");
    window.location.reload();
  } catch (err) {
    alert("❌ Error: " + err.message);
  }
}

// ============================================================
// 🔄 RENEW LOAN — पुराना settled loan history में save करके नया शुरू करना
// ============================================================
async function handleRenewLoan(cust) {
  const pass = prompt("🔑 नया Loan Cycle शुरू करने के लिए Admin Password डालें:");
  if (pass !== ADMIN_PASSWORD) {
    if (pass !== null) alert("❌ गलत पासवर्ड!");
    return;
  }

  const newAmountStr = prompt(`नया Loan Amount डालें (पिछला था ₹${cust.loanAmount || 0}):`, cust.loanAmount || '');
  if (newAmountStr === null) return;
  const newAmount = Number(newAmountStr);
  if (!newAmount || newAmount < 500) {
    alert("❌ सही Loan Amount डालें (कम से कम ₹500)।");
    return;
  }
  const newDurationStr = prompt("Plan Duration (Days) डालें:", cust.planDuration || 60);
  if (newDurationStr === null) return;
  const newDuration = Number(newDurationStr) || 60;

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const newLoanDateStr = prompt("नए Loan की Date डालें (YYYY-MM-DD):", todayStr);
  if (newLoanDateStr === null) return;
  const newLoanDate = /^\d{4}-\d{2}-\d{2}$/.test(newLoanDateStr) ? newLoanDateStr : todayStr;

  if (!confirm(`नया loan cycle शुरू करें?\n\nLoan: ₹${newAmount}\nDuration: ${newDuration} Days\nLoan Date: ${newLoanDate}\n\nपुराना cycle "Loan History" में save हो जाएगा।`)) return;

  try {
    // पुराना cycle history में archive करना
    await addDoc(collection(db, "customers", currentCustomerId, "loanHistory"), {
      loanAmount: cust.loanAmount || 0,
      loanDate: cust.loanDate || cust.startDate || '',
      planDuration: cust.planDuration || cust.duration || 60,
      dailyEmi: cust.dailyEmi || cust.emi || 0,
      totalCollected: cust.totalCollected || 0,
      paidDays: cust.paidDays || 0,
      closedOn: new Date().toISOString().split('T')[0]
    });

    // नया cycle शुरू करना
    const newDailyEmi = Math.round((newAmount * 1.2) / newDuration);
    const custRef = doc(db, "customers", currentCustomerId);
    await updateDoc(custRef, {
      loanAmount: newAmount,
      planDuration: newDuration,
      dailyEmi: newDailyEmi,
      totalCollected: 0,
      paidDays: 0,
      loanDate: newLoanDate,
      status: 'Active',
      settlementDate: null
    });

    alert("✅ नया Loan Cycle शुरू हो गया!");
    window.location.reload();
  } catch (err) {
    alert("❌ Error: " + err.message);
  }
}

// ============================================================
// ⚖️ SETTLE CUSTOMER
// ============================================================
async function handleSettle(cust) {
  if (cust.status === 'Settled' || cust.status === 'Closed') {
    alert('This account is already settled.');
    return;
  }
  const pass = prompt("🔑 Admin Password to Settle:");
  if (pass !== ADMIN_PASSWORD) {
    if (pass !== null) alert("❌ Wrong Password!");
    return;
  }
  if (!confirm(`Confirm to settle ${cust.name}?`)) return;
  try {
    const custRef = doc(db, "customers", currentCustomerId);
    await updateDoc(custRef, { status: "Settled", settlementDate: new Date().toISOString().split('T')[0] });
    alert("✅ Customer Settled Successfully!");
    window.location.reload();
  } catch (err) {
    alert("❌ Error: " + err.message);
  }
}

// ============================================================
// ↩️ UNDO SETTLE — galti se settle hue account ko wapas Active karna
// ============================================================
async function handleUndoSettle(cust) {
  if (cust.status !== 'Settled' && cust.status !== 'Closed') {
    alert('यह account settled नहीं है।');
    return;
  }
  const pass = prompt("🔑 Admin Password to Undo Settle:");
  if (pass !== ADMIN_PASSWORD) {
    if (pass !== null) alert("❌ Wrong Password!");
    return;
  }
  if (!confirm(`⚠️ Confirm: क्या आप ${cust.name} का Settlement हटाकर account वापस Active करना चाहते हैं?`)) return;
  try {
    const custRef = doc(db, "customers", currentCustomerId);
    await updateDoc(custRef, {
      status: "Active",
      settlementDate: deleteField()
    });
    alert("✅ Account वापस Active हो गया!");
    window.location.reload();
  } catch (err) {
    alert("❌ Error: " + err.message);
  }
}

// ============================================================
// 🗑️ DELETE EMI LOG
// ============================================================
async function deleteLog(logId, custId) {
  const pass = prompt("🔑 Admin Password to Delete this log:");
  if (pass !== ADMIN_PASSWORD) {
    if (pass !== null) alert("❌ Wrong Password!");
    return;
  }
  if (!confirm("Delete this EMI record? This will also reduce Total Collected & Paid Days.")) return;
  try {
    const logRef = doc(db, "collections", logId);
    const logSnap = await getDoc(logRef);
    if (!logSnap.exists()) { alert("Log not found!"); return; }
    const logData = logSnap.data();
    const amount = Number(logData.amount || logData.collectionAmount || 0);
    await deleteDoc(logRef);
    const custRef = doc(db, "customers", custId);
    const custSnap = await getDoc(custRef);
    if (custSnap.exists()) {
      const custData = custSnap.data();
      const newCollected = Math.max(0, Number(custData.totalCollected || 0) - amount);
      const newDays = Math.max(0, Number(custData.paidDays || 0) - 1);
      await updateDoc(custRef, { totalCollected: newCollected, paidDays: newDays });
    }
    alert("✅ Log deleted and customer data updated!");
    window.location.reload();
  } catch (err) {
    alert("❌ Error: " + err.message);
  }
}

// ============================================================
// 📥 MAIN LOADER
// ============================================================
async function loadStatement() {
  const id = getCustomerIdFromUrl();
  if (!id) {
    loadingMsg.innerHTML = "❌ No Customer ID found in URL.";
    return;
  }
  currentCustomerId = id;
  try {
    const custDoc = await getDoc(doc(db, "customers", id));
    if (!custDoc.exists()) {
      loadingMsg.innerHTML = "❌ Customer not found.";
      return;
    }
    currentCustomer = { id: custDoc.id, ...custDoc.data() };
    const q = query(collection(db, "collections"), where("customerId", "==", id));
    const logSnap = await getDocs(q);
    let logs = [];
    logSnap.forEach(d => logs.push({ docId: d.id, ...d.data() }));

    // 🔥 सिर्फ मौजूदा (current) loan cycle की collections दिखाएं —
    // जो collection loan शुरू होने की तारीख (loanDate) से पहले की है,
    // वो पुराने/Renew हो चुके cycle की है, उसे यहाँ मत दिखाओ (History में देखें)
    const cycleStartDate = currentCustomer.loanDate || currentCustomer.startDate || '';
    if (cycleStartDate) {
      logs = logs.filter(log => (log.date || log.collectionDate || '') >= cycleStartDate);
    }

    logs.sort((a, b) => new Date(b.date || b.collectionDate || 0) - new Date(a.date || a.collectionDate || 0));
    renderProfile(currentCustomer, logs);
  } catch (err) {
    loadingMsg.innerHTML = `❌ Error loading data: ${err.message}`;
    console.error(err);
  }
}

// ============================================================
// 🔐 AUTH
// ============================================================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.href = "login.html";
  } else {
    loadStatement();
  }
});

document.getElementById("logoutBtn")?.addEventListener('click', async (e) => {
  e.preventDefault();
  if (confirm("Logout?")) {
    await signOut(auth);
    location.href = "login.html";
  }
});
