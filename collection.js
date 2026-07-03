import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

const ref = doc(db, "customers", id);
const snap = await getDoc(ref);

if (!snap.exists()) {
  alert("Customer not found");
  throw new Error("Customer not found");
}

const c = snap.data();

document.getElementById("name").textContent = c.name;
document.getElementById("loan").textContent = c.loan;
document.getElementById("emi").textContent = c.emi;
document.getElementById("remaining").textContent = c.remainingAmount;

// EMI Auto Fill
document.getElementById("amount").value = c.emi;

// Statement Button
document.getElementById("statementBtn").href =
  "statement.html?id=" + id;

document.getElementById("saveBtn").onclick = async () => {

  const amount = Number(
    document.getElementById("amount").value
  );

  if (!amount || amount <= 0) {
    alert("Please Enter Valid Amount");
    return;
  }

  if (amount > c.remainingAmount) {
    alert("Amount is greater than Remaining Amount");
    return;
  }

  const remaining =
    Math.max(0, c.remainingAmount - amount);

  const paidDays =
    (c.paidDays || 0) +
    Math.floor(amount / c.emi);  await addDoc(collection(db, "collections"), {
    customerId: id,
    customerName: c.name,
    mobile: c.mobile,
    loan: c.loan,
    emi: c.emi,
    amount: amount,
    paidDays: paidDays,
    remainingAmount: remaining,
    date: new Date()
  });

  await updateDoc(ref, {
    remainingAmount: remaining,
    paidDays: paidDays,
    totalCollected: (c.totalCollected || 0) + amount
  });

  document.getElementById("remaining").textContent = remaining;

  alert("✅ Collection Saved Successfully");

  location.reload();

};
