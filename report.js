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

  const customerSnap = await getDocs(collection(db, "customers"));
  const collectionSnap = await getDocs(collection(db, "collections"));

  let totalLoan = 0;
  let totalRemaining = 0;
  let totalCollection = 0;
  let todayCollection = 0;

  const today = new Date();

  customersEl.textContent = customerSnap.size;

  customerSnap.forEach((docSnap) => {

    const data = docSnap.data();

    totalLoan += Number(data.loan || 0);
    totalRemaining += Number(data.remainingAmount || 0);

  });

  collectionSnap.forEach((docSnap) => {

    const data = docSnap.data();

    const amount = Number(data.amount || 0);

    totalCollection += amount;

    if (data.date) {

      let d;

      if (data.date.toDate) {
        d = data.date.toDate();
      } else {
        d = new Date(data.date.seconds * 1000);
      }

      if (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      ) {
        todayCollection += amount;
      }
    }

  });

  todayEl.textContent = "₹" + todayCollection;
  totalEl.textContent = "₹" + totalCollection;
  loanEl.textContent = "₹" + totalLoan;
  remainingEl.textContent = "₹" + totalRemaining;
}

loadReport();
