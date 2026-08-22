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

    alert(`✅ Customer ${uniqueCode} बन गया!`);
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
// DELETE — application ko poori tarah hata dena (fake/galat entry)
// ==========================================================
async function deleteApplication(app) {
  if (!confirm(`⚠️ क्या आप "${app.name}" की application हमेशा के लिए DELETE करना चाहते हैं?\n\nयह वापस नहीं आएगी। दोबारा जरूरत पड़ने पर customer को नया लिंक भेजना होगा।`)) return;
  try {
    await deleteDoc(doc(db, "applications", app.id));
    loadApplications();
  } catch (err) {
    alert("❌ Error: " + err.message);
  }
}
