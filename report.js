import { db } from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const todayEl = document.getElementById("today");
const totalEl = document.getElementById("total");
const customersEl = document.getElementById("customers");

async function loadReport() {

  const snapshot = await getDocs(collection(db, "collections"));

  let todayTotal = 0;
  let totalCollection = 0;

  const today = new Date();

  customersEl.innerHTML = snapshot.size;

  snapshot.forEach((doc) => {

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

}

loadReport();
