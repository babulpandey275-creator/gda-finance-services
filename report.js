import { db } from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

async function loadReport() {

  const snapshot = await getDocs(collection(db, "collections"));

  let todayTotal = 0;
  let monthTotal = 0;
  let remainingTotal = 0;
  let customers = 0;

  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  customers = snapshot.size;

  snapshot.forEach((doc) => {

    const c = doc.data();

    const amount = Number(c.amount || 0);
    const remaining = Number(c.remainingAmount || 0);

    remainingTotal += remaining;

    if (c.date) {

      const d = new Date(c.date.seconds * 1000);

      if (
        d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear
      ) {
        monthTotal += amount;
      }

      if (
        d.getDate() === currentDay &&
        d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear
      ) {
        todayTotal += amount;
      }

    }

  });

  document.getElementById("today").innerHTML =
    "₹" + todayTotal;

  document.getElementById("month").innerHTML =
    "₹" + monthTotal;

  document.getElement
