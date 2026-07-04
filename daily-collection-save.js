import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export async function saveCollection(id, customers) {

  try {

    const customer = customers.find(c => c.id === id);

    if (!customer) {
      alert("❌ Customer Not Found");
      return;
    }

    const amountInput = document.getElementById("amount-" + id);

    const amount = Number(amountInput.value);

    if (isNaN(amount) || amount <= 0) {
      alert("⚠ Please Enter Valid Amount");
      amountInput.focus();
      return;
    }

    if (amount > Number(customer.remainingAmount)) {
      alert("⚠ Amount is greater than Remaining Amount");
      return;
    }

    const remaining =
      Number(customer.remainingAmount) - amount;

    const totalCollected =
      Number(customer.totalCollected || 0) + amount;

    const paidDays =
      Number(customer.paidDays || 0) +
      Math.floor(amount / Number(customer.emi));

    const now = new Date();

    // Save Collection History

    await addDoc(collection(db, "collections"), {

      customerId: customer.id,

      customerName: customer.name,

      mobile: customer.mobile,

      loan: Number(customer.loan),

      emi: Number(customer.emi),

      amount: amount,

      totalCollected: totalCollected,

      remainingAmount: remaining,

      paidDays: paidDays,

      date: now,

      dateString: now.toLocaleDateString("en-IN"),

      timeString: now.toLocaleTimeString("en-IN")

    });

    // Update Customer

    await updateDoc(doc(db, "customers", customer.id), {

      remainingAmount: remaining,

      totalCollected: totalCollected,

      paidDays: paidDays

    });

    alert("✅ Collection Saved Successfully");

    if (window.reloadCustomers) {
      window.reloadCustomers();
    }

  }

  catch (error) {

    console.error(error);

    alert("❌ " + error.message);

  }

}
