import { db } from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const todayEl = document.getElementById("today");
const totalEl = document.getElementById("total");
const customersEl = document.getElementById("customers");
const loanEl = document.getElementById("loan");
const remainingEl = document.getElementById("remaining");

async function loadReport() {

  // Customers Collection
  const customerSnap = await getDocs(collection(db, "customers"));

  // Collections Collection
  const collectionSnap = await getDocs(collection(db, "collections"));

  let totalLoan = 0;
  let totalRemaining = 0;
  let todayTotal = 0;
  let totalCollection = 0;

  const today = new Date();

  customersEl.innerHTML = customerSnap.size;

  customerSnap.forEach((doc) => {
    const data = doc.data();

    totalLoan += Number(data.loan || 0);
    totalRemaining += Number(data.remainingAmount || 0);
  });

  collectionSnap.forEach((doc) => {

    const data = doc.data();

    const amount = Number(data.amount || 0);

    totalCollection += amount;

    if (data.date) {

      const d = new Date(data.date.seconds * 1000);

      if (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      ) {
        todayTotal += amount;
      }

    }

  });

  todayEl.innerHTML = "₹" + todayTotal;
  totalEl.innerHTML = "₹" + totalCollection;
  loanEl.innerHTML = "₹" + totalLoan;
  remainingEl.innerHTML = "₹" + totalRemaining;

}

loadReport();
