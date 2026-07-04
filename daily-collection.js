import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { saveCollection } from "./daily-collection-save.js";
import { updateTodayCollection } from "./daily-collection-ui.js";

const customerList = document.getElementById("customerList");
const search = document.getElementById("search");

let customers = [];

async function loadCustomers() {

  const snap = await getDocs(collection(db, "customers"));

  customers = [];

  snap.forEach((doc) => {
    customers.push({
      id: doc.id,
      ...doc.data()
    });
  });

  // Global बनाओ ताकि saveCollection इसे उपयोग कर सके
  window.customers = customers;

  showCustomers(customers);

  updateTodayCollection();
}

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

    customerList.innerHTML += `

<div class="card">

<h3>👤 ${c.name}</h3>

<p>📱 ${c.mobile}</p>

<p>💰 Loan : ₹${Number(c.loan || 0).toLocaleString("en-IN")}</p>

<p>💵 Daily EMI : ₹${Number(c.emi || 0).toLocaleString("en-IN")}</p>

<p>✅ Total Collected : ₹${Number(c.totalCollected || 0).toLocaleString("en-IN")}</p>

<p><b>📉 Remaining : ₹${Number(c.remainingAmount || 0).toLocaleString("en-IN")}</b></p>

<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0;">

<button type="button" onclick="setAmount('${c.id}',100)">₹100</button>

<button type="button" onclick="setAmount('${c.id}',200)">₹200</button>

<button type="button" onclick="setAmount('${c.id}',500)">₹500</button>

<button type="button" onclick="setAmount('${c.id}',1000)">₹1000</button>

</div>

<input
type="number"
id="amount-${c.id}"
class="amountBox"
value="${c.emi || 0}"
placeholder="Enter Amount">

<button
type="button"
class="saveBtn"
onclick="saveCollection('${c.id}', window.customers)">

✅ SAVE COLLECTION

</button>

</div>

`;

  });

}

search.addEventListener("keyup", () => {

  const value = search.value.toLowerCase();

  const filtered = customers.filter(c =>
    (c.name || "").toLowerCase().includes(value) ||
    (c.mobile || "").includes(value)
  );

  showCustomers(filtered);

});

// Reload Function
window.reloadCustomers = loadCustomers;

// First Load
loadCustomers();
