import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

const ref = doc(db, "customers", id);
const snap = await getDoc(ref);

const c = snap.data();

document.getElementById("name").textContent = c.name;
document.getElementById("loan").textContent = c.loan;
document.getElementById("emi").textContent = c.emi;
document.getElementById("remaining").textContent = c.remainingAmount;

document.getElementById("saveBtn").onclick = async () => {

  const amount = Number(document.getElementById("amount").value);

  if (!amount || amount <= 0) {
    alert("Enter valid amount");
    return;
  }

  const remaining = c.remainingAmount - amount;
  const paidDays = c.paidDays + Math.floor(amount / c.emi);
await addDoc(collection(db, "collections"), {
  customerId: id,
  customerName: c.name,
  mobile: c.mobile,
  loan: c.loan,
  emi: c.emi,
  amount: amount,
  paidDays: paidDays,
  remainingAmount: Math.max(0, remaining),
  status: status,
  date: new Date()
});
  
await addDoc(collection(db, "collections"), {
  customerId: id,
  customerName: c.name,
  mobile: c.mobile,
  loan: c.loan,
  emi: c.emi,
  amount: amount,
  paidDays: paidDays,
  remainingAmount: Math.max(0, remaining),
  status: status,
  date: new Date()
});
  
  alert("Collection Saved Successfully");

  location.reload();

};
