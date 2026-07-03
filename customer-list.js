import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const customerList = document.getElementById("customerList");

async function loadCustomers() {

  customerList.innerHTML = "Loading...";

  const snapshot = await getDocs(collection(db, "customers"));

  customerList.innerHTML = "";

  snapshot.forEach((docSnap) => {

    const c = docSnap.data();

    customerList.innerHTML += `

    <div class="card">

      <h3>${c.name}</h3>

      <p><b>Customer ID:</b> ${c.customerId || "N/A"}</p>

      <p><b>Mobile:</b> ${c.mobile}</p>

      <p><b>Address:</b> ${c.address}</p>

      <p><b>Loan:</b> ₹${c.loan}</p>

      <p><b>Daily EMI:</b> ₹${c.emi}</p>

      <p><b>Loan Date:</b> ${c.loanDate || "N/A"}</p>

      <p><b>Remaining:</b> ₹${c.remainingAmount ?? c.loan}</p>

      <br>

      <a class="btn" href="collection.html?id=${docSnap.id}">
      💰 Daily Collection
      </a>

      <br><br>

      <button
      class="btn"
      onclick="window.openEdit('${docSnap.id}')">
      ✏ Edit Customer
      </button>

      <br><br>

      <a class="btn" href="statement.html?id=${docSnap.id}">
      📄 Statement
      </a>

      <br><br>

      <button
      class="btn"
      style="background:red"
      onclick="window.deleteCustomer('${docSnap.id}')">
      🗑 Delete Customer
      </button>

    </div>

    `;

  });

}window.openEdit = function(id) {

    const pin = prompt("🔒 Enter Admin PIN");

    if (pin === null) return;

    if (pin !== "2750") {
        alert("❌ Wrong Admin PIN");
        return;
    }

    window.location.href = "edit.html?id=" + id;

};

window.deleteCustomer = async function(id) {

    const pin = prompt("🔒 Enter Admin PIN");

    if (pin === null) return;

    if (pin !== "2750") {
        alert("❌ Wrong Admin PIN");
        return;
    }

    const ok = confirm("क्या आप इस ग्राहक को हटाना चाहते हैं?");

    if (!ok) return;

    await deleteDoc(doc(db, "customers", id));

    const q = query(
        collection(db, "collections"),
        where("customerId", "==", id)
    );

    const historySnapshot = await getDocs(q);

    for (const historyDoc of historySnapshot.docs) {
        await deleteDoc(doc(db, "collections"), historyDoc.id);
    }

    alert("✅ Customer Deleted Successfully");

    loadCustomers();

};

loadCustomers();
