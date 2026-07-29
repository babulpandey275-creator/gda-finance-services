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

function getCustomerIdFromUrl() {
  return new URLSearchParams(window.location.search).get('id');
}

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
        <div class="kyc-row"><span>Aadhar Number</span><b>${cust.aadhar || 'Not Provided'}</b></div>
        <div class="kyc-row"><span>PAN Card</span><b>${cust.pan || 'Not Provided'}</b></div>
        <div class="kyc-row"><span>Residential Address</span><b>${cust.address || 'Not Provided'}</b></div>
        <div class="kyc-row"><span>Status</span><b style="color:${isSettled ? '#059669' : '#DC2626'};">${cust.status || 'Active'}</b></div>
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

function shareWhatsApp(cust) {
  const msg = `*GDA FINANCE SERVICES*%0A%0A📄 *KYC STATEMENT*%0A%0A👤 *Name:* ${cust.name}%0A📞 *Mobile:* ${cust.mobile}%0A🆔 *Code:* ${cust.customerCode}%0A📅 *Loan Date:* ${cust.loanDate || 'N/A'}%0A💰 *EMI:* ₹${cust.dailyEmi || cust.emi || 0}%0A📆 *Duration:* ${cust.planDuration || cust.duration || 60} Days%0A💵 *Paid:* ₹${cust.totalCollected || 0}%0A🆔 *Aadhar:* ${cust.aadhar || 'N/A'}%0A📇 *PAN:* ${cust.pan || 'N/A'}%0A🏠 *Address:* ${cust.address || 'N/A'}%0A📍 *Branch:* Garhwa`;
  window.open(`https://wa.me/91${cust.mobile}?text=${msg}`, '_blank');
}

// ============================================================
// 🚀 नई PDF – PROFESSIONAL & DECENT
// ============================================================
function generatePDF(cust, logs) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const margin = 16;
  let y = margin;

  // ---- HEADER ----
  doc.setFillColor(26, 35, 53); // dark blue
  doc.rect(margin, y, pageW - (margin * 2), 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('🏦 GDA FINANCE SERVICES', pageW / 2, y + 12, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  doc.text('Digital Loan Distribution & Micro Finance System', pageW / 2, y + 22, { align: 'center' });
  y += 32;

  // ---- TITLE ----
  doc.setTextColor(26, 35, 53);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('📄 CUSTOMER KYC & STATEMENT REPORT', pageW / 2, y, { align: 'center' });
  y += 6;
  doc.setDrawColor(26, 35, 53);
  doc.setLineWidth(0.5);
  doc.line(margin + 20, y, pageW - margin - 20, y);
  y += 10;

  // ---- CUSTOMER DETAILS BOX ----
  doc.setFillColor(248, 250, 255);
  doc.setDrawColor(200, 200, 210);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, pageW - (margin * 2), 52, 'FD');
  
  // Left column
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const leftX = margin + 8;
  const rightX = pageW / 2 + 4;
  const rowH = 8;
  let ry = y + 6;
  
  const fields = [
    { label: 'Name', value: cust.name || 'N/A' },
    { label: 'Mobile', value: cust.mobile || 'N/A' },
    { label: 'EMI', value: `₹${cust.dailyEmi || cust.emi || 0}` },
    { label: 'Total Paid', value: `₹${cust.totalCollected || 0}` },
  ];
  fields.forEach((f, i) => {
    const x = i < 2 ? leftX : rightX;
    const yy = ry + (i % 2) * rowH;
    doc.setTextColor(120, 120, 130);
    doc.setFont('helvetica', 'normal');
    doc.text(f.label + ':', x, yy);
    doc.setTextColor(26, 35, 53);
    doc.setFont('helvetica', 'bold');
    doc.text(f.value, x + 28, yy);
  });

  // Right column
  const fields2 = [
    { label: 'Code', value: cust.customerCode || 'GDA' },
    { label: 'Loan Date', value: cust.loanDate || cust.startDate || 'N/A' },
    { label: 'Duration', value: `${cust.planDuration || cust.duration || 60} Days` },
    { label: 'Paid Days', value: `${cust.paidDays || 0} Days` },
  ];
  fields2.forEach((f, i) => {
    const x = pageW / 2 + 6;
    const yy = ry + (i % 2) * rowH + (i >= 2 ? rowH : 0);
    doc.setTextColor(120, 120, 130);
    doc.setFont('helvetica', 'normal');
    doc.text(f.label + ':', x, yy);
    doc.setTextColor(26, 35, 53);
    doc.setFont('helvetica', 'bold');
    doc.text(f.value, x + 28, yy);
  });
  y += 56;

  // ---- KYC DETAILS BOX ----
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(220, 180, 80);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, pageW - (margin * 2), 30, 'FD');
  doc.setTextColor(120, 80, 10);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('🔐 KYC VERIFICATION DETAILS', margin + 8, y + 6);
  doc.setTextColor(60, 60, 70);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const kycY = y + 14;
  doc.text(`Aadhar: ${cust.aadhar || 'Not Provided'}`, margin + 8, kycY);
  doc.text(`PAN: ${cust.pan || 'Not Provided'}`, margin + 70, kycY);
  doc.text(`Status: ${cust.status || 'Active'}`, margin + 130, kycY);
  doc.text(`Address: ${cust.address || 'Not Provided'}`, margin + 8, kycY + 8);
  y += 34;

  // ---- EMI LOGS TABLE ----
  doc.setTextColor(26, 35, 53);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('📊 COLLECTION HISTORY (EMI LOGS)', margin, y);
  y += 6;
  doc.setDrawColor(200, 200, 210);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  // Table headers
  const col1 = margin + 4;
  const col2 = margin + 50;
  const col3 = margin + 110;
  const col4 = margin + 160;
  doc.setFillColor(240, 245, 255);
  doc.rect(margin, y, pageW - (margin * 2), 8, 'F');
  doc.setTextColor(60, 60, 80);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Date', col1, y + 5.5);
  doc.text('Note', col2, y + 5.5);
  doc.text('Amount', col3, y + 5.5);
  doc.text('Action', col4, y + 5.5);
  y += 8;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 50);
  doc.setFontSize(8);
  let rowCount = 0;
  const maxRows = 18;

  if (logs.length === 0) {
    doc.text('No collection records found.', margin + 8, y + 5);
    y += 10;
  } else {
    const sortedLogs = logs.slice(0, maxRows);
    sortedLogs.forEach((log, idx) => {
      const date = log.date || log.collectionDate || 'N/A';
      const note = log.note || 'EMI Received';
      const amt = `₹${log.amount || log.collectionAmount || 0}`;
      const action = 'Paid';

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 255);
        doc.rect(margin, y, pageW - (margin * 2), 7, 'F');
      }
      doc.text(date, col1, y + 4.5);
      doc.text(note, col2, y + 4.5);
      doc.text(amt, col3, y + 4.5);
      doc.text(action, col4, y + 4.5);
      y += 7;
      rowCount++;
      if (y > 260) {
        doc.addPage();
        y = margin;
      }
    });
    if (logs.length > maxRows) {
      doc.setTextColor(100, 100, 120);
      doc.text(`... and ${logs.length - maxRows} more records`, margin + 8, y + 4);
      y += 8;
    }
  }

  // ---- FOOTER ----
  const now = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.setDrawColor(200, 200, 210);
  doc.setLineWidth(0.2);
  doc.line(margin, y + 6, pageW - margin, y + 6);
  doc.setTextColor(150, 150, 160);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${now} | GDA Finance Services`, pageW / 2, y + 13, { align: 'center' });

  // ---- SAVE ----
  doc.save(`${cust.name || 'Customer'}_GDA_Statement.pdf`);
}

// ============================================================
// बाकी फंक्शन (Settle, Delete, Auth) – पहले जैसे ही
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
