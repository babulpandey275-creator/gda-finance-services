import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const historyList = document.getElementById("historyList");

async function loadHistory() {
  historyList.innerHTML = "Loading...";

  const q = query(
    collection(db, "collections"),
    orderBy("date", "desc")
  );

  const snapshot = await getDocs(q);

  historyList.innerHTML = "";

  if (snapshot.empty) {
    historyList.innerHTML = "<h3>No Collection History Found</h3>";
    return;
  }

  snapshot.forEach((doc) => {
    const c = doc.data();

    historyList.innerHTML += `
      <div class="card">
        <h3>${c.customerName || ""}</h3>

        <p><b>Mobile:</b> ${c.mobile || ""}</p>

        <p><b>Collected:</b> ₹${c.amount || 0}</p>

        <p><b>Remaining:</b> ₹${c.remainingAmount || 0}</p>

        <p><b>Paid Days:</b> ${c.paidDays || 0}</p>

        <p><b>Date:</b> ${
          c.date
            ? new Date(c.date.seconds * 1000).toLocaleString()
            : "-"
        }</p>
      </div>
    `;
  });
}

loadHistory();
