import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc
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

  snapshot.forEach((documentSnap) => {

    const id = documentSnap.id;
    const c = documentSnap.data();

    historyList.innerHTML += `
      <div class="card">

        <h3>${c.customerName || ""}</h3>

        <p><b>Mobile:</b> ${c.mobile || ""}</p>

        <p><b>Collected:</b> ₹${c.amount || 0}</p>

        <p><b>Remaining:</b> ₹${c.remainingAmount || 0}</p>

        <p><b>Paid Days:</b> ${c.paidDays || 0}</p>

        <p><b>Date:</b>
        ${
          c.date
            ? new Date(c.date.seconds * 1000).toLocaleString()
            : "-"
        }
        </p>

        <button
          style="
            background:red;
            color:white;
            border:none;
            padding:10px 15px;
            border-radius:6px;
            cursor:pointer;
          "
          onclick="deleteCollection('${id}')">
          🗑 Delete
        </button>

      </div>
    `;

  });

}

window.deleteCollection = async function(id) {

  const ok = confirm("क्या आप यह Collection History Delete करना चाहते हैं?");

  if (!ok) return;

  try {

    await deleteDoc(doc(db, "collections", id));

    alert("Collection History Deleted Successfully");

    loadHistory();

  } catch (e) {

    alert("Delete Failed : " + e.message);

  }

};

loadHistory();
