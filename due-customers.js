import { db } from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const list = document.getElementById("dueList");

async function loadDueCustomers() {

  list.innerHTML = "<h3>Loading...</h3>";

  const snapshot = await getDocs(collection(db, "customers"));

  list.innerHTML = "";

  const today = new Date();

  snapshot.forEach((docSnap) => {

    const c = docSnap.data();

    if (!c.loanDate) return;

    const loanDate = new Date(c.loanDate);

    const diffTime = today - loanDate;
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const paidDays = Number(c.paidDays || 0);

    const dueDays = totalDays - paidDays;

    if (dueDays > 0 && Number(c.remainingAmount) > 0) {

      const dueAmount = dueDays * Number(c.emi);

      list.innerHTML += `
      <div class="card">

      <h3>${c.name}</h3>

      <p><b>Customer ID :</b> ${c.customerId}</p>

      <p><b>Mobile :</b> ${c.mobile}</p>

      <p><b>Loan :</b> ₹${c.loan}</p>

      <p><b>Daily EMI :</b> ₹${c.emi}</p>

      <p><b>Paid Days :</b> ${paidDays}</p>

      <p style="color:red;"><b>Due Days :</b> ${dueDays}</p>

      <p style="color:red;"><b>Due Amount :</b> ₹${dueAmount}</p>

      <p><b>Remaining :</b> ₹${c.remainingAmount}</p>

      </div>
      `;
    }

  });

  if (list.innerHTML === "") {
    list.innerHTML =
      "<h2 style='text-align:center;color:green;'>🎉 कोई Due Customer नहीं है</h2>";
  }

}

loadDueCustomers();
