import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const saveBtn = document.getElementById("saveBtn");

saveBtn.addEventListener("click", async () => {

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
    alert("⚠️ कृपया सभी जानकारी भरें");
    return;
  }

  try {

    const snapshot = await getDocs(collection(db, "customers"));

    const customerId =
      "GDA" + String(snapshot.size + 1).padStart(3, "0");

    await addDoc(collection(db, "customers"), {

      customerId: customerId,
      name: name,
      mobile: mobile,
      address: address,

      loan: loan,
      emi: emi,
      days: days,

      loanDate: loanDate,
      status: status,

      paidDays: 0,
      totalCollected: 0,
      remainingAmount: loan,

      createdAt: new Date()

    });

    alert("✅ Customer Saved Successfully");

    document.getElementById("name").value = "";
    document.getElementById("mobile").value = "";
    document.getElementById("address").value = "";
    document.getElementById("loan").value = "";
    document.getElementById("emi").value = "";
    document.getElementById("loanDate").value = "";
    document.getElementById("days").value = "60";
    document.getElementById("status").value = "Active";

  } catch (error) {

    console.error(error);

    alert("❌ Firebase Error\n\n" + error.message);

  }

});
