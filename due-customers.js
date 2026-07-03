import { db } from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const list = document.getElementById("list");

async function loadDueCustomers() {

  list.innerHTML = "Loading...";

  const snapshot = await getDocs(collection(db, "customers"));

  list.innerHTML = "";

  const today = new Date();

  snapshot.forEach((doc) => {

    const data = doc.data();

    if (!data.loanDate || !data.days) return;

    const loanDate = new Date(data.loanDate);

    const dueDate = new Date(loanDate);
    dueDate.setDate(dueDate.getDate() + Number(data.days));

    if (today >= dueDate && Number(data.remainingAmount) > 0) {

      list.innerHTML += `
      <div class="card">
        <h3>${data.name}</h3>
        <p>Customer ID : ${data.customerId}</p>
        <p>Mobile : ${data.mobile}</p>
        <p>Loan : ₹${data.loan}</p>
        <p>Collected : ₹${data.totalCollection}</p>
        <p>Remaining : ₹${data.remainingAmount}</p>
        <p style="color:red;font-weight:bold;">⚠️ Due Customer</p>
      </div>
      `;
    }

  });

  if (list.innerHTML === "") {
    list.innerHTML = "<h3 style='text-align:center;color:green;'>🎉 कोई Due Customer नहीं है।</h3>";
  }

}

loadDueCustomers();
