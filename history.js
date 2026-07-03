import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  getDoc,
  updateDoc
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
          c.date?.toDate
            ? c.date.toDate().toLocaleString()
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

  const ok = confirm("क्या आप यह Collection Delete करना चाहते हैं?");

  if (!ok) return;

  try {

    // Collection Record
    const collectionRef = doc(db, "collections", id);
    const collectionSnap = await getDoc(collectionRef);

    if (!collectionSnap.exists()) {
      alert("Collection Record Not Found");
      return;
    }

    const data = collectionSnap.data();

    // Customer Record
    const customerRef = doc(db, "customers", data.customerId);
    const customerSnap = await getDoc(customerRef);

    if (customerSnap.exists()) {

      const customer = customerSnap.data();

      await updateDoc(customerRef, {

        remainingAmount:
          (customer.remainingAmount || 0) + (data.amount || 0),

        paidDays:
          Math.max(
            0,
            (customer.paidDays || 0) -
            Math.floor((data.amount || 0) / (customer.emi || 1))
          ),

        totalCollected:
          Math.max(
            0,
            (customer.totalCollected || 0) - (data.amount || 0)
          )

      });

    }

    // Delete History
    await deleteDoc(collectionRef);

    alert("Collection Deleted Successfully");

    loadHistory();

  } catch (e) {

    alert("Delete Failed : " + e.message);

  }

};

loadHistory();
