import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const id = new URLSearchParams(location.search).get("id");

const name = document.getElementById("name");
const mobile = document.getElementById("mobile");
const address = document.getElementById("address");
const loan = document.getElementById("loan");
const emi = document.getElementById("emi");

const customerRef = doc(db, "customers", id);

const snap = await getDoc(customerRef);

if (snap.exists()) {
  const c = snap.data();

  name.value = c.name;
  mobile.value = c.mobile;
  address.value = c.address;
  loan.value = c.loan;
  emi.value = c.emi;
}

document.getElementById("saveBtn").onclick = async () => {

  await updateDoc(customerRef, {
    name: name.value,
    mobile: mobile.value,
    address: address.value,
    loan: Number(loan.value),
    emi: Number(emi.value)
  });

  alert("Customer Updated Successfully");

  location.href = "customer-list.html";

};
