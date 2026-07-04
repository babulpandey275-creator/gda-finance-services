import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export async function saveCollection(id, customers) {

  const customer = customers.find(c => c.id === id);

  if (!customer) {
    alert("Customer not found.");
    return;
  }

  const amountBox = document.getElementById("amount-" + id);

  const amount = Number(amountBox.value);

  if (isNaN(amount) || amount <= 0) {
    alert("⚠ Please enter a valid amount.");
    amountBox.focus();
    return;
  }

  if (amount > Number(customer.remainingAmount)) {
    alert("⚠ Amount is greater than Remaining Amount.");
    return;
  }

  const remaining =
    Number(customer.remainingAmount) - amount;

  const paidDays =
    Number(customer.paidDays || 0) +
    Math.floor(amount / Number(customer.emi));

  const now = new Date();

  try {

    await addDoc(collection(db, "collections"), {

      customerId: id,
      customerName: customer.name,
      mobile: customer.mobile,

      loan: Number(customer.loan),

      emi: Number(customer.emi),

      amount: amount,

      totalCollected:
        Number(customer.totalCollected || 0) + amount,

      remainingAmount: remaining,

      paidDays: paidDays,

      date: now,

      dateString: now.toLocaleDateString("en-IN"),

      timeString: now.toLocaleTimeString("en-IN")

    });

    await updateDoc(doc(db, "customers", id), {

      remainingAmount: remaining,

      paidDays: paidDays,

      totalCollected:
        Number(customer.totalCollected || 0) + amount

    });

    alert("✅ Collection Saved Successfully");

    if (window.reloadCustomers) {
      window.reloadCustomers();
    }

  } catch (err) {

    console.error(err);

    alert("❌ Error Saving Collection");

  }

}
