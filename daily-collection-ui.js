
import { db } from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const todayAmount = document.getElementById("todayAmount");
const todayDate = document.getElementById("todayDate");

/* Show Today's Date */

if (todayDate) {
  todayDate.textContent = new Date().toLocaleDateString("en-IN");
}

/* Update Today's Collection */

export async function updateTodayCollection() {

  try {

    const snap = await getDocs(collection(db, "collections"));

    const today = new Date().toLocaleDateString("en-IN");

    let total = 0;

    snap.forEach((doc) => {

      const data = doc.data();

      let collectionDate = "";

      if (data.dateString) {

        collectionDate = data.dateString;

      } else if (data.date && data.date.seconds) {

        collectionDate = new Date(
          data.date.seconds * 1000
        ).toLocaleDateString("en-IN");

      }

      if (collectionDate === today) {

        total += Number(data.amount || 0);

      }

    });

    if (todayAmount) {

      todayAmount.textContent =
        "₹" + total.toLocaleString("en-IN");

    }

  } catch (err) {

    console.error("Today's Collection Error:", err);

    if (todayAmount) {

      todayAmount.textContent = "₹0";

    }

  }

}

/* Quick Amount Buttons */

window.setAmount = function(id, amount) {

  const input = document.getElementById("amount-" + id);

  if (!input) return;

  input.value = amount;

  input.focus();

};

/* Auto Refresh */

setInterval(() => {

  updateTodayCollection();

}, 30000);

/* First Load */

updateTodayCollection();
