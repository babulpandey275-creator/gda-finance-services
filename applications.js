// ==========================================================
// 🚀 GDA FINANCE - APPLICATIONS REVIEW (Approve/Reject)
// Customer ke "apply.html" se bheji gayi Pending applications ko
// yahan staff dekh kar loan amount set karta hai aur Approve karte
// hi asli Customer record "customers" collection mein ban jaata hai.
// ==========================================================

import { db, auth } from "./firebase.js";
import {
  collection, getDocs, query, where, addDoc, updateDoc, deleteDoc, doc, runTransaction
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const appList = document.getElementById("appList");
const countBar = document.getElementById("countBar");

const approveModal = document.getElementById("approveModal");
const modalCustomerName = document.getElementById("modalCustomerName");
const modalLoanAmount = document.getElementById("modalLoanAmount");
const modalLoanPlan = document.getElementById("modalLoanPlan");
const modalTotalPayable = document.getElementById("modalTotalPayable");
const modalDailyEmi = document.getElementById("modalDailyEmi");
const modalConfirmBtn = document.getElementById("modalConfirmBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");

let currentApplications = [];
let selectedApp = null;

// ==========================================================
// AUTH GUARD — sirf login staff hi yeh page dekh sakta hai
// ==========================================================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    loadApplications();
  }
});

document.getElementById("logoutBtn").addEventListener("click", async (e) => {
  e.preventDefault();
  if (confirm("क्या आप सच में लॉगआउट करना चाहते हैं?")) {
    await signOut(auth);
    window.location.href = "login.html";
  }
});

// ==========================================================
// LOAD PENDING APPLICATIONS
// ==========================================================
async function loadApplications() {
  countBar.innerText = "⏳ Loading...";
  appList.innerHTML = "";
  try {
    const q = query(collection(db, "applications"), where("status", "==", "Pending"));
    const snap = await getDocs(q);
    currentApplications = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    currentApplications.sort((a, b) => (b.appliedAt || "").localeCompare(a.appliedAt || ""));

    countBar.innerText = `Pending Applications (${currentApplications.length})`;

    if (currentApplications.length === 0) {
      appList.innerHTML = `<div class="empty-msg">📭 अभी कोई नई application नहीं है।</div>`;
      return;
    }

    currentApplications.forEach(app => renderCard(app));
  } catch (err) {
    console.error("Load applications error:", err);
    countBar.innerText = "❌ Data load नहीं हुआ";
  }
}

function renderCard(app) {
  const card = document.createElement("div");
  card.className = "app-card";
  const imgUrl = (app.photoUrl && app.photoUrl.startsWith('http')) ? app.photoUrl : 'https://via.placeholder.com/52';
  const appliedDate = app.appliedAt ? new Date(app.appliedAt).toLocaleString('en-IN') : '';

  let docLinks = "";
  if (app.aadharPhoto) docLinks += `<a href="${app.aadharPhoto}" target="_blank">🆔 Aadhar</a>`;
  if (app.panPhoto) docLinks += `<a href="${app.panPhoto}" target="_blank">📇 PAN</a>`;
  if (app.voterPhoto) docLinks += `<a href="${app.voterPhoto}" target="_blank">🗳️ Voter ID</a>`;

  card.innerHTML = `
    <div class="top-row">
      <img src="${imgUrl}" onerror="this.src='https://via.placeholder.com/52'" class="avatar" />
      <div>
        <h4>${app.name || "N/A"}</h4>
        <div class="mobile">📱 ${app.mobile || "N/A"} ${app.guardianName ? " · S/O " + app.guardianName : ""}</div>
        <div class="applied-at">Applied: ${appliedDate}</div>
      </div>
    </div>
    <div style="font-size:12.5px;color:#475569;">
      🆔 Aadhaar: ${app.aadhaar || "—"} &nbsp; 📇 PAN: ${app.panCard || "—"}<br>
      🏠 ${app.address || "—"}
    </div>
    <div class="doc-links">${docLinks || '<span style="font-size:11px;color:#94A3B8;">कोई document attach नहीं</span>'}</div>
    <div class="actions">
      <button class="btn-approve" data-id="${app.id}">✅ Approve</button>
      <button class="btn-delete" data-id="${app.id}">🗑️ Delete</button>
    </div>
  `;

  card.querySelector(".btn-approve").addEventListener("click", () => openApproveModal(app));
  card.querySelector(".btn-delete").addEventListener("click", () => deleteApplication(app));

  appList.appendChild(card);
}

// ==========================================================
// APPROVE MODAL
// ==========================================================
function calcModalAmounts() {
  const amt = parseFloat(modalLoanAmount.value) || 0;
  const days = parseInt(modalLoanPlan.value) || 60;
  const total = amt + (amt * 0.20);
  modalTotalPayable.value = Math.round(total);
  modalDailyEmi.value = Math.round(total / days);
}
modalLoanAmount.addEventListener("input", calcModalAmounts);
modalLoanPlan.addEventListener("change", calcModalAmounts);

function openApproveModal(app) {
  selectedApp = app;
  modalCustomerName.innerText = `Approve: ${app.name || "Customer"}`;
  modalLoanAmount.value = "";
  modalLoanPlan.value = "60";
  modalTotalPayable.value = "";
  modalDailyEmi.value = "";
  approveModal.style.display = "flex";
}
modalCancelBtn.addEventListener("click", () => {
  approveModal.style.display = "none";
  selectedApp = null;
});

// ==========================================================
// CUSTOMER CODE GENERATE (register.js jaisa hi transaction)
// ==========================================================
async function generateCustomerCode() {
  const counterRef = doc(db, "metadata", "customerCounter");
  try {
    const newNumber = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef);
      let lastNum = snap.exists() ? snap.data().lastNumber || 0 : 0;
      const nextNum = lastNum + 1;
      transaction.set(counterRef, { lastNumber: nextNum });
      return nextNum;
    });
    return `GDA${String(newNumber).padStart(4, '0')}`;
  } catch (error) {
    return `GDA${Date.now().toString().slice(-4)}`;
  }
}

// ==========================================================
// CONFIRM APPROVE — asli customer record banega
// ==========================================================
modalConfirmBtn.addEventListener("click", async () => {
  if (!selectedApp) return;

  const amt = Number(modalLoanAmount.value);
  if (!amt || amt < 500) {
    alert("❌ कृपया सही Loan Amount डालें (कम से कम ₹500)");
    return;
  }
  const planDuration = Number(modalLoanPlan.value);
  const totalPayable = Number(modalTotalPayable.value);
  const dailyEmi = Number(modalDailyEmi.value);

  modalConfirmBtn.disabled = true;
  modalConfirmBtn.innerText = "⏳ Creating...";

  try {
    const uniqueCode = await generateCustomerCode();
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    const customerData = {
      name: selectedApp.name || "",
      mobile: selectedApp.mobile || "",
      guardianName: selectedApp.guardianName || "",
      aadhaar: selectedApp.aadhaar || "",
      panCard: selectedApp.panCard || "",
      address: selectedApp.address || "",
      loanAmount: amt,
      planDuration,
      totalPayable,
      totalCollected: 0,
      paidDays: 0,
      dailyEmi,
      photoUrl: selectedApp.photoUrl || "",
      aadharPhoto: selectedApp.aadharPhoto || "",
      panPhoto: selectedApp.panPhoto || "",
      voterPhoto: selectedApp.voterPhoto || "",
      status: "Active",
      loanDate: todayIST,
      createdAt: new Date().toISOString(),
      customerCode: uniqueCode,
      sourceApplicationId: selectedApp.id
    };

    await addDoc(collection(db, "customers"), customerData);

    // Application ko "Approved" mark kar dein (list se hat jaayegi)
    await updateDoc(doc(db, "applications", selectedApp.id), {
      status: "Approved",
      approvedAt: new Date().toISOString()
    });

    // 📄 Approval PDF banayein — WhatsApp pe customer ko bhejने के लिए
    generateApprovalPDF(customerData);

    alert(`✅ Customer ${uniqueCode} बन गया! Approval PDF download हो गई है — अब इसे WhatsApp पर customer को भेज दीजिए।`);
    approveModal.style.display = "none";
    selectedApp = null;
    loadApplications();

  } catch (err) {
    alert("❌ Error: " + err.message);
  } finally {
    modalConfirmBtn.disabled = false;
    modalConfirmBtn.innerText = "✅ Approve & Create Customer";
  }
});

// ==========================================================
// 📄 APPROVAL PDF — Loan Sanction Slip
// ==========================================================
function generateApprovalPDF(cust) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210, margin = 16;
  let y = 0;

  doc.setFillColor(58, 28, 98);
  doc.rect(0, 0, pageW, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('GDA FINANCE SERVICES', pageW / 2, 14, { align: 'center' });
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Loan Approval / Sanction Slip', pageW / 2, 22, { align: 'center' });
  y = 42;

  doc.setTextColor(20, 20, 30);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Date: ${today}`, pageW - margin, y, { align: 'right' });
  y += 4;

  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(22, 163, 74);
  doc.roundedRect(margin, y, pageW - margin * 2, 14, 3, 3, 'FD');
  doc.setTextColor(22, 163, 74);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('✔ Congratulations! Your Loan Has Been Approved', pageW / 2, y + 9, { align: 'center' });
  y += 24;

  function row(label, value, bold) {
    doc.setTextColor(100, 100, 110);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(label, margin, y);
    doc.setTextColor(20, 20, 30);
    doc.setFontSize(12);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(String(value), pageW - margin, y, { align: 'right' });
    y += 9;
    doc.setDrawColor(240, 240, 245);
    doc.line(margin, y - 5.5, pageW - margin, y - 5.5);
  }

  row('Customer Name', cust.name || '-', true);
  row('Customer Code', cust.customerCode || '-', true);
  row('Mobile Number', cust.mobile || '-');
  row('Loan Amount', `Rs. ${Number(cust.loanAmount).toLocaleString('en-IN')}`, true);
  row('Plan Duration', `${cust.planDuration} Days`);
  row('Total Payable', `Rs. ${Math.round(cust.totalPayable).toLocaleString('en-IN')}`, true);
  row('Daily EMI', `Rs. ${Math.round(cust.dailyEmi).toLocaleString('en-IN')}`, true);
  row('Loan Start Date', cust.loanDate || '-');

  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 130);
  doc.setFont('helvetica', 'italic');
  doc.text('कृपया अपनी दैनिक किश्त समय पर जमा करें। किसी भी सहायता के लिए हमारी शाखा से संपर्क करें।', margin, y, { maxWidth: pageW - margin * 2 });
  y += 16;

  doc.setDrawColor(15, 23, 42);
  doc.line(margin, y, margin + 55, y);
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signatory', margin, y + 5);
  doc.text('GDA Finance Services', margin, y + 10);

  doc.save(`Loan_Approval_${cust.customerCode || cust.name}.pdf`);
}

// ==========================================================
// 📄 REJECTION NOTICE PDF
// ==========================================================
function generateRejectionPDF(app) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210, margin = 16;
  let y = 0;

  doc.setFillColor(58, 28, 98);
  doc.rect(0, 0, pageW, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('GDA FINANCE SERVICES', pageW / 2, 14, { align: 'center' });
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Application Status Notice', pageW / 2, 22, { align: 'center' });
  y = 42;

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setTextColor(20, 20, 30);
  doc.setFontSize(11);
  doc.text(`Date: ${today}`, pageW - margin, y, { align: 'right' });
  y += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Dear ${app.name || 'Applicant'},`, margin, y);
  y += 10;

  const msg = `आपके द्वारा भेजी गई loan application (Mobile: ${app.mobile || '-'}) पर विचार करने के बाद, हम फिलहाल इसे आगे नहीं बढ़ा पा रहे हैं। अधिक जानकारी के लिए कृपया हमारी शाखा से संपर्क करें।`;
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(msg, pageW - margin * 2);
  doc.text(lines, margin, y);
  y += lines.length * 6 + 14;

  doc.setDrawColor(15, 23, 42);
  doc.line(margin, y, margin + 55, y);
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('GDA Finance Services', margin, y + 5);

  doc.save(`Application_Notice_${app.name || app.mobile}.pdf`);
}

// ==========================================================
// DELETE — application ko poori tarah hata dena (fake/galat entry)
// ==========================================================
async function deleteApplication(app) {
  if (!confirm(`⚠️ क्या आप "${app.name}" की application हमेशा के लिए DELETE करना चाहते हैं?\n\nयह वापस नहीं आएगी। दोबारा जरूरत पड़ने पर customer को नया लिंक भेजना होगा।`)) return;

  const wantPdf = confirm(`क्या आप "${app.name}" के लिए एक Notice PDF भी बनाना चाहते हैं जो आप customer को WhatsApp पर भेज सकें?`);
  if (wantPdf) generateRejectionPDF(app);

  try {
    await deleteDoc(doc(db, "applications", app.id));
    loadApplications();
  } catch (err) {
    alert("❌ Error: " + err.message);
  }
}
