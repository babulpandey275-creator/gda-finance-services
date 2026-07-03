import { db } from "./firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
window.addEventListener("load", () => {
    console.log("GDA Finance Services Loaded");
    console.log(db);
});

function showMessage(page) {

    if (page === "Customer Registration") {
        window.location.href = "register.html";
    }
    else {
        alert(page + " Coming Soon");
    }
}async function loadDashboard() {

  if (!document.getElementById("totalCustomers")) return;

  const snapshot = await getDocs(collection(db, "customers"));

  let totalCustomers = snapshot.size;
  let totalLoan = 0;
  let totalCollection = 0;
  let totalRemaining = 0;

  snapshot.forEach(doc => {
    const c = doc.data();

    totalLoan += Number(c.loan || 0);
    totalCollection += Number(c.totalCollected || 0);
    totalRemaining += Number(c.remainingAmount || 0);
  });

  document.getElementById("totalCustomers").textContent = totalCustomers;
  document.getElementById("totalLoan").textContent = totalLoan;
  document.getElementById("totalCollection").textContent = totalCollection;
  document.getElementById("totalRemaining").textContent = totalRemaining;
}

loadDashboard();

window.showMessage = showMessage;
