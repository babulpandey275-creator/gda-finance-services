import { db } from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const todayAmount = document.getElementById("todayAmount");
const todayDate = document.getElementById("todayDate");

/* Today's Date */

if (todayDate) {

  todayDate.innerHTML =
    new Date().toLocaleDateString("en-IN");

}

/* Today's Collection */

export async function updateTodayCollection() {

  try {

    const snap =
      await getDocs(collection(db, "collections"));

    let total = 0;

    const today =
      new Date().toLocaleDateString("en-IN");

    snap.forEach((doc) => {

      const data = doc.data();

      if (!data.date) return;

      let docDate = "";

      if (data.dateString) {

        docDate = data.dateString;

      } else if (data.date.seconds) {

        docDate = new Date(
          data.date.seconds * 1000
        ).toLocaleDateString("en-IN");

      }

      if (docDate === today) {

        total += Number(data.amount || 0);

      }

    });

    if (todayAmount) {

      todayAmount.innerHTML =
        "₹" + total.toLocaleString("en-IN");

    }

  } catch (err) {

    console.error(err);

    if (todayAmount) {

      todayAmount.innerHTML = "₹0";

    }

  }

}

/* Quick Amount Buttons */

window.setAmount = function(id, amount) {

  const box =
    document.getElementById("amount-" + id);

  if (box) {

    box.value = amount;

    box.focus();

  }

};

/* Auto Refresh Every 20 Seconds */

setInterval(() => {

  updateTodayCollection();

}, 20000);

/* First Load */

updateTodayCollection();
