import { db } from "./firebase.js";

import {
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.getElementById("saveBtn").addEventListener("click", async () => {

  const name = document.getElementById("name").value.trim();
  const mobile = document.getElementById("mobile").value.trim();
  const address = document.getElementById("address").value.trim();
  const loan = Number(document.getElementById("loan").value);
  const emi = Number(document.getElementById("emi").value);
  const days = Number(document.getElementById("days").value);
  const loanDate = document.getElementById("loanDate").value;
  const status = document.getElementById("status").value;

  if (
    !name ||
    !mobile ||
    !address ||
    !loan ||
    !emi ||
    !days ||
    !loanDate
  ) {
    alert("Please fill all fields");
    return;
  }

  try {

    await addDoc(collection(db, "customers"), {
      name,
      mobile,
      address,
      loan,
      emi,
      days,
      loanDate,
      status,
      paidDays: 0,
      totalCollected: 0,
      remainingAmount: loan,
      createdAt: new Date()
    });

    alert("Customer Saved Successfully");

    document.getElementById("name").value = "";
    document.getElementById("mobile").value = "";
    document.getElementById("address").value = "";
    document.getElementById("loan").value = "";
    document.getElementById("emi").value = "";
    document.getElementById("days").value = "60";
    document.getElementById("loanDate").value = "";

  } catch (e) {
    alert("Error: " + e.message);
    console.log(e);
  }

});
