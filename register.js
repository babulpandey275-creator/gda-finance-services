import { db } from "./firebase.js";
import {
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.getElementById("saveBtn").addEventListener("click", async () => {

  const name = document.getElementById("name").value;
  const mobile = document.getElementById("mobile").value;
  const address = document.getElementById("address").value;
  const loan = document.getElementById("loan").value;
  const emi = document.getElementById("emi").value;

  await addDoc(collection(db, "customers"), {
    name,
    mobile,
    address,
    loan,
    emi,
    createdAt: new Date()
  });

  alert("Customer Saved Successfully");
});
