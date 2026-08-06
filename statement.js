import { db, auth } from "./firebase.js";
import { 
  doc, getDoc, updateDoc, deleteDoc, 
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
// 🖥️ RENDER PROFILE (अब डॉक्यूमेंट्स के साथ)
// ============================================================
function renderProfile(cust, logs) {
  const planDur = Number(cust.planDuration || cust.duration || 60);
  const dailyEmi = Number(cust.dailyEmi || cust.emi || 0);
  const totalPaid = Number(cust.totalCollected || 0);
  const paidDays = Number(cust.paidDays || 0);
  const loanAmount = Number(cust.loanAmount || 0);
  const expectedTotal = Math.max(loanAmount * 1.2, planDur * dailyEmi);
  const remaining = Math.max(0, expectedTotal - totalPaid);
  const photo = (cust.photoUrl && cust.photoUrl.startsWith('http')) ? cust.photoUrl : 'https://via.placeholder.com/70';
  const isSettled = (cust.status === 'Settled' || cust.status === 'Closed');

  const aadharValue = getCustomerValue(cust, ['aadhar', 'aadhaar', 'aadharNumber', 'aadhaarNumber', 'aadharNo', 'aadhaarNo']);
  const panValue = getCustomerValue(cust, ['pan', 'panNumber', 'panCard', 'panNo']);

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
        <div class="info-item"><div class="label">Remaining</div><div class="value" style="color:#DC2626;">₹${remaining.toLocaleString('en-IN')}</div></div>
        <div class="info-item"><div class="label">Paid Days</div><div class="value">${paidDays} Days</div></div>
        <div class="info-item"><div class="label">Total Collected</div><div class="value">₹${totalPaid.toLocaleString('en-IN')}</div></div>
      </div>

      <div class="kyc-section">
        <h4>🔐 KYC VERIFICATION DETAILS</h4>
        <div class="kyc-row"><span>Aadhar Number</span><b>${aadharValue}</b></div>
        <div class="kyc-row"><span>PAN Card</span><b>${panValue}</b></div>
        <div class="kyc-row"><span>Residential Address</span><b>${cust.address || 'Not Provided'}</b></div>
        <div class="kyc-row"><span>Status</span><b style="color:${isSettled ? '#059669' : '#DC2626'};">${cust.status || 'Active'}</b></div>
      </div>

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

      <div class="action-bar">
        <button class="action-btn whatsapp" id="whatsappBtn">💬 WhatsApp</button>
        <button class="action-btn pdf" id="pdfBtn">📄 PDF</button>
        <a href="bond.html?id=${currentCustomerId}" class="action-btn bond" target="_blank">📜 Bond</a>
        <button class="action-btn settle ${isSettled ? 'settled' : ''}" id="settleBtn" ${isSettled ? 'disabled' : ''}>
          ${isSettled ? '✅ Settled' : '⚖️ Settle'}
        </button>
      </div>
    </div>

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

  document.getElementById('whatsappBtn')?.addEventListener('click', () => shareWhatsApp(cust));
  document.getElementById('pdfBtn')?.addEventListener('click', () => generatePDF(cust, logs));
  document.getElementById('settleBtn')?.addEventListener('click', () => handleSettle(cust));

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
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function ensureSpace(doc, y, needed, margin) {
  if (y + needed > 275) {
    doc.addPage();
    return margin;
  }
  return y;
}

// ============================================================
// 📄 PDF GENERATION – emoji हटाए गए, photo embed, total summary, page number जोड़े
// ============================================================
async function generatePDF(cust, logs) {
  const pdfBtn = document.getElementById('pdfBtn');
  if (pdfBtn) { pdfBtn.disabled = true; pdfBtn.textContent = '⏳ Generating...'; }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = 210;
    const margin = 16;
    let y = margin;

    const aadharValue = getCustomerValue(cust, ['aadhar', 'aadhaar', 'aadharNumber', 'aadhaarNumber', 'aadharNo', 'aadhaarNo']);
    const panValue = getCustomerValue(cust, ['pan', 'panNumber', 'panCard', 'panNo']);

    const photoUrl = (cust.photoUrl && cust.photoUrl.startsWith('http')) ? cust.photoUrl : null;
    const photoBase64 = await loadImageAsBase64(photoUrl);

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

    doc.setTextColor(26, 35, 53);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER KYC & STATEMENT REPORT', pageW / 2, y, { align: 'center' });
    y += 6;
    doc.setDrawColor(26, 35, 53);
    doc.setLineWidth(0.5);
    doc.line(margin + 20, y, pageW - margin - 20, y);
    y += 10;

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
      } catch (e) {}
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

    const planDur = Number(cust.planDuration || cust.duration || 60);
    const dailyEmi = Number(cust.dailyEmi || cust.emi || 0);
    const totalPaid = Number(cust.totalCollected || 0);
    const loanAmount = Number(cust.loanAmount || 0);
    const expectedTotal = Math.max(loanAmount * 1.2, planDur * dailyEmi);
    const remaining = Math.max(0, expectedTotal - totalPaid);

    doc.setFillColor(remaining > 0 ? 254 : 236, remaining > 0 ? 242 : 253, remaining > 0 ? 242 : 245);
    doc.setDrawColor(remaining > 0 ? 220 : 180, remaining > 0 ? 38 : 220, remaining > 0 ? 38 : 150);
    doc.rect(margin, y, pageW - (margin * 2), 12, 'FD');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(remaining > 0 ? 185 : 5, remaining > 0 ? 28 : 120, remaining > 0 ? 28 : 70);
    doc.text(
      remaining > 0 ? `REMAINING BALANCE: Rs. ${remaining.toLocaleString('en-IN')}` : 'ACCOUNT FULLY SETTLED',
      pageW / 2, y + 8, { align: 'center' }
    );
    y += 18;

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
