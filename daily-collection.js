import { db } from "./firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { saveCollection } from "./daily-collection-save.js";
import { updateTodayCollection } from "./daily-collection-ui.js";

const customerList = document.getElementById("customerList");
const search = document.getElementById("search");

let customers = [];

/* Load Customers */

async function loadCustomers() {

  customerList.innerHTML = `
    <div class="loadingCard">
      <h3>Loading Customers...</h3>
    </div>
  `;

  try {

    const snap = await getDocs(collection(db, "customers"));

    customers = [];

    snap.forEach((doc) => {

      customers.push({
        id: doc.id,
        ...doc.data()
      });

    });

    window.customers = customers;

    showCustomers(customers);

    updateTodayCollection();

    const total = document.getElementById("totalCustomers");

    if(total){
      total.textContent = customers.length;
    }

  }

  catch(error){

    console.error(error);

    customerList.innerHTML = `
      <div class="card">
        <h3>❌ Customer Load Failed</h3>
        <p>${error.message}</p>
      </div>
    `;

  }

}

/* Search */

search.addEventListener("keyup",()=>{

  const value = search.value.toLowerCase();

  const filtered = customers.filter(c=>{

    return (
      (c.name || "").toLowerCase().includes(value) ||
      (c.mobile || "").includes(value)
    );

  });

  showCustomers(filtered);

});
/* ===========================
   Premium Customer Cards
=========================== */

function showCustomers(list) {

  customerList.innerHTML = "";

  if (list.length === 0) {

    customerList.innerHTML = `
      <div class="card">
        <h3>❌ No Customer Found</h3>
      </div>
    `;

    return;
  }

  list.forEach((c) => {

    const loan = Number(c.loan || 0);
    const emi = Number(c.emi || 0);
    const collected = Number(c.totalCollected || 0);
    const remaining = Number(c.remainingAmount || 0);

    const percent =
      loan > 0
        ? Math.min(100, Math.round((collected / loan) * 100))
        : 0;

    const status =
      remaining <= 0
        ? "Completed"
        : "Active";

    customerList.innerHTML += `

    <div class="card">

      <div style="display:flex;justify-content:space-between;align-items:center;">

        <div>

          <h3>👤 ${c.name}</h3>

          <p>📱 ${c.mobile}</p>

        </div>

        <span class="statusBadge ${status}">
          ${status}
        </span>

      </div>

      <p>💰 Loan : ₹${loan.toLocaleString("en-IN")}</p>

      <p>💵 Daily EMI : ₹${emi.toLocaleString("en-IN")}</p>

      <p>✅ Collected : ₹${collected.toLocaleString("en-IN")}</p>

      <p><b>📉 Remaining : ₹${remaining.toLocaleString("en-IN")}</b></p>

      <div class="progressBox">

        <div
        class="progressBar"
        style="width:${percent}%">
        </div>

      </div>

      <p style="margin:8px 0;">
        Progress : ${percent}%
      </p>

      <div
      style="
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:8px;
      margin:15px 0;
      ">

      <button
      onclick="setAmount('${c.id}',100)">
      ₹100
      </button>

      <button
      onclick="setAmount('${c.id}',200)">
      ₹200
      </button>

      <button
      onclick="setAmount('${c.id}',500)">
      ₹500
      </button>

      <button
      onclick="setAmount('${c.id}',1000)">
      ₹1000
      </button>

      </div>

      <input
      type="number"
      id="amount-${c.id}"
      class="amountBox"
      value="${emi}"
      placeholder="Enter Amount">

      <button
      class="saveBtn"
      onclick="saveCollection('${c.id}',window.customers)">

      💰
     /* ===========================
   Reload + First Load
=========================== */

// Reload Function
window.reloadCustomers = async function () {
  await loadCustomers();
};

// Quick Amount Buttons
window.setAmount = function (id, amount) {
  const input = document.getElementById("amount-" + id);

  if (!input) return;

  input.value = amount;
  input.focus();
};

// Auto Refresh Today's Collection
setInterval(() => {
  updateTodayCollection();
}, 30000);

// First Load
loadCustomers(); 
