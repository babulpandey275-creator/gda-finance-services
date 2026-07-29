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
        <!-- ✅ अब लिंक bond.html है – बिल्कुल सही नाम -->
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

function generatePDF(cust, logs) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 20;
  doc.setFontSize(18);
  doc.text("GDA FINANCE SERVICES", 20, y);
  y += 10;
  doc.setFontSize(12);
  doc.text("Customer KYC & Bond Paper", 20, y);
  y += 8;
  doc.setFontSize(11);
  const fields = [
    `Name: ${cust.name || 'N/A'}`,
    `Code: ${cust.customerCode || 'GDA'}`,
    `Mobile: ${cust.mobile || 'N/A'}`,
    `Loan Date: ${cust.loanDate || cust.startDate || 'N/A'}`,
    `EMI: ₹${cust.dailyEmi || cust.emi || 0}`,
    `Duration: ${cust.planDuration || cust.duration || 60} Days`,
    `Total Paid: ₹${cust.totalCollected || 0}`,
    `Paid Days: ${cust.paidDays || 0} Days`,
    `Aadhar: ${cust.aadhar || 'N/A'}`,
    `PAN: ${cust.pan || 'N/A'}`,
    `Address: ${cust.address || 'N/A'}`,
    `Status: ${cust.status || 'Active'}`
  ];
  fields.forEach(f => {
    doc.text(f, 20, y);
    y += 10;
    if (y > 270) { doc.addPage(); y = 20; }
  });
  y += 6;
  doc.text("----- Collection History -----", 20, y);
  y += 10;
  if (logs.length === 0) {
    doc.text("No logs found.", 20, y);
  } else {
    logs.slice(0, 15).forEach(log => {
      doc.text(`${log.date || log.collectionDate || 'N/A'} - ₹${log.amount || log.collectionAmount || 0}`, 20, y);
      y += 10;
      if (y > 270) { doc.addPage(); y = 20; }
    });
  }
  doc.save(`${cust.name || 'Customer'}_GDA_Statement.pdf`);
}

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
