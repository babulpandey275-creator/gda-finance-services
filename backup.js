import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const backupBtn = document.getElementById("backupBtn");
const restoreBtn = document.getElementById("restoreBtn");
const restoreFile = document.getElementById("restoreFile");

// ================= BACKUP =================

backupBtn.onclick = async () => {

  const customers = [];
  const collections = [];

  const customerSnap = await getDocs(collection(db, "customers"));

  customerSnap.forEach((doc) => {

    customers.push({
      id: doc.id,
      ...doc.data()
    });

  });

  const collectionSnap = await getDocs(collection(db, "collections"));

  collectionSnap.forEach((doc) => {

    collections.push({
      id: doc.id,
      ...doc.data()
    });

  });

  const backup = {
   
