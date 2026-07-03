import { db } from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const dueList = document.getElementById("dueList");

async function loadDueCustomers() {
  dueList.innerHTML = "Loading...";

  const snapshot = await getDocs(collection(db, "customers"));

  dueList.innerHTML = "";

  const today = new Date();
  let found = false;

  snapshot.forEach((doc) => {
    const c = doc.data();

    if (!c.loanDate || !c.days) return;

    const start = new Date(c.loanDate);
    const end = new Date(start);
    end.setDate(start.getDate() + Number(c.days));

    if (today > end && Number(c.remainingAmount) > 0) {
      found = true;

      dueList.innerHTML += `
        <div class="card">
          <h3>${c.name}</h3>
          <p><b>Customer ID:</b> ${c.customerId}</p>
          <p><b>Mobile:</b> ${c.mobile}</p>
          <p><b>Loan:</b> ₹${c.loan}</p>
          <p><b>Remaining:</b> ₹${c.remainingAmount}</p>
          <p style="color:red;"><b>Status:</b> Due</p>
        </div>
      `;
    }
  });

  if (!found) {
    dueList.innerHTML = "<h3 style='text-align:center;color:green;'>✅ No Due Customers</h3>";
  }
}

loadDueCustomers();
