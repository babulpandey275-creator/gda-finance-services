import { db } from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

window.addEventListener("load", () => {
  loadDashboard();
});

async function loadDashboard() {

  if (!document.getElementById("totalCustomers")) return;

  const customerSnap = await getDocs(collection(db, "customers"));
  const collectionSnap = await getDocs(collection(db, "collections"));

  let totalCustomers = customerSnap.size;
  let totalLoan = 0;
  let totalCollection = 0;
  let todayCollection = 0;
  let totalRemaining = 0;
  let dueCustomers = 0;

  const today = new Date().toISOString().split("T")[0];

  // Customer Summary
  customerSnap.forEach((docSnap) => {

    const c = docSnap.data();

    totalLoan += Number(c.loan || 0);
    totalRemaining += Number(c.remainingAmount || 0);

    if (c.loanDate && c.days) {

      const loanDate = new Date(c.loanDate);

      const passedDays = Math.floor(
        (new Date() - loanDate) / (1000 * 60 * 60 * 24)
      );

      const paidDays = Number(c.paidDays || 0);

      const dueDays = passedDays - paidDays;

      if (dueDays > 0 && Number(c.remainingAmount || 0) > 0) {
        dueCustomers++;
      }
    }

  });

  // Collection Summary
  collectionSnap.forEach((docSnap) => {

    const data = docSnap.data();

    totalCollection += Number(data.amount || 0);

    if (data.date) {

      let collectionDate = "";

      if (data.date.toDate) {
        collectionDate = data.date.toDate().toISOString().split("T")[0];
      } else if (data.date.seconds) {
        collectionDate = new Date(data.date.seconds * 1000)
          .toISOString()
          .split("T")[0];
      }

      if (collectionDate === today) {
        todayCollection += Number(data.amount || 0);
      }

    }

  });

  document.getElementById("totalCustomers").textContent = totalCustomers;
  document.getElementById("totalLoan").textContent = totalLoan;
  document.getElementById("totalCollection").textContent = totalCollection;
  document.getElementById("todayCollection").textContent = todayCollection;
  document.getElementById("totalRemaining").textContent = totalRemaining;

  if (document.getElementById("dueCustomers")) {
    document.getElementById("dueCustomers").textContent = dueCustomers;
  }

}

loadDashboard();
