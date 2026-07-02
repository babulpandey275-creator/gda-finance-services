import { db } from "./firebase.js";
import {
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const saveBtn = document.getElementById("saveBtn");

saveBtn.addEventListener("click", async () => {

  const name = document.getElementById("name").value;
  const mobile = document.getElementById("mobile").value;
  const address = document.getElementById("address").value;
  const loan = document.getElementById("loan").value;
  const emi = document.getElementById("emi").value;

  if (!name || !mobile) {
    alert("नाम और मोबाइल नंबर भरें");
    return;
  }

  try {
    await addDoc(collection(db, "customers"), {
      name,
      mobile,
      address,
      loan,
      emi,
      createdAt: new Date()
    });

    alert("Customer Successfully Saved");

    document.getElementById("name").value = "";
    document.getElementById("mobile").value = "";
    document.getElementById("address").value = "";
    document.getElementById("loan").value = "";
    document.getElementById("emi").value = "";

  } catch (error) {
    alert("Error: " + error.message);
  }

});
