import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const id = new URLSearchParams(window.location.search).get("id");

if (!id) {
  alert("Customer ID not found!");
  throw new Error("Customer ID missing");
}

const name = document.getElementById("name");
const mobile = document.getElementById("mobile");
const address = document.getElementById("address");
const loan = document.getElementById("loan");
const emi = document.getElementById("emi");
const remainingAmount = document.getElementById("remainingAmount");
const loanDate = document.getElementById("loanDate");

const customerRef = doc(db, "customers", id);

try {

  const snap = await getDoc(customerRef);

  if (snap.exists()) {

    const c = snap.data();

    name.value = c.name || "";
    mobile.value = c.mobile || "";
    address.value = c.address || "";
    loan.value = c.loan || "";
    emi.value = c.emi || "";
    remainingAmount.value = c.remainingAmount || "";
    loanDate.value = c.loanDate || "";

  } else {

    alert("Customer not found!");

  }

} catch (err) {

  console.error(err);
  alert("Error loading customer");

}

document.getElementById("saveBtn").addEventListener("click", async () => {

  try {

    await updateDoc(customerRef, {

      name: name.value,
      mobile: mobile.value,
      address: address.value,
      loan: Number(loan.value),
      emi: Number(emi.value),
      remainingAmount: Number(remainingAmount.value),
      loanDate: loanDate.value

    });

    alert("Customer Updated Successfully");

    window.location.href = "customer-list.html";

  } catch (err) {

    console.error(err);

    alert("Update Failed: " + err.message);

  }

});
