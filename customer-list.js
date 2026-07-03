import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  deleteDoc,
  doc
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
        Daily Collection
      </a>

      <br><br>

      <a class="btn" href="edit.html?id=${docSnap.id}">
        ✏ Edit Customer
      </a>

      <br><br>

      <button
        class="btn"
        style="background:red"
        onclick="deleteCustomer('${docSnap.id}')">
        🗑 Delete Customer
      </button>

    </div>

    `;

  });

}

window.deleteCustomer = async function(id) {

  const ok = confirm("क्या आप इस ग्राहक को हटाना चाहते हैं?");

  if (!ok) return;

  await deleteDoc(doc(db, "customers", id));

  alert("Customer Deleted Successfully");

  loadCustomers();

};

loadCustomers();
