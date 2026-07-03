import { db } from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const customerList = document.getElementById("customerList");

async function loadCustomers() {

  customerList.innerHTML = "Loading...";

  const snapshot = await getDocs(collection(db, "customers"));

  customerList.innerHTML = "";

  snapshot.forEach((doc) => {

    const c = doc.data();

    customerList.innerHTML += `

    <div class="card">

      <h3>${c.name}</h3>

      <p><b>Mobile:</b> ${c.mobile}</p>

      <p><b>Address:</b> ${c.address}</p>

      <p><b>Loan:</b> ₹${c.loan}</p>

      <p><b>Daily EMI:</b> ₹${c.emi}</p>

      <p><b>Remaining:</b> ₹${c.remainingAmount}</p>

      <a class="btn" href="collection.html?id=${doc.id}">
      Daily Collection
      </a>

    </div>

    `;

  });

}

loadCustomers();
