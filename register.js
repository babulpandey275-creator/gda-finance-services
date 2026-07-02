import { db } from "./firebase.js";
import {
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.getElementById("saveBtn").addEventListener("click", async () => {

  const name = document.getElementById("name").value;
  const mobile = document.getElementById("mobile").value;
  const address = document.getElementById("address").value;
  const loan = document.getElementById("loan").value;
  const emi = document.getElementById("emi").value;
const days = document.getElementById("days").value;
const loanDate = document.getElementById("loanDate").value;
const status = document.getElementById("status").value;
  await addDoc(collection(db, "customers"), {
    name,
    mobile,
    address,
    loan: Number(loan),
emi: Number(emi),
days: Number(days),
loanDate,
status,
paidDays: 0,
totalCollected: 0,
remainingAmount: Number(loan),
createdAt: new Date()
  });

  alert("Customer Saved Successfully");
});
