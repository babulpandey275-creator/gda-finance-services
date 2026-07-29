// ==========================================================
// 🚀 GDA FINANCE - REGISTER (WITH DOCUMENT UPLOADS)
// ==========================================================

import { db } from "./firebase.js";
import { collection, addDoc, doc, runTransaction } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const IMGBB_API_KEY = "5230b9fc28c784e9c389bcf09cb56dd2";

// DOM Elements
const form = document.getElementById("regForm");
const loanAmountInput = document.getElementById("loanAmount");
const loanPlanSelect = document.getElementById("loanPlan");
const totalPayableInput = document.getElementById("totalPayable");
const dailyCollectionInput = document.getElementById("dailyCollection");

// Document Upload Elements
const aadharInput = document.getElementById("aadharInput");
const panInput = document.getElementById("panInput");
const voterInput = document.getElementById("voterInput");
const aadharPreview = document.getElementById("aadharPreview");
const panPreview = document.getElementById("panPreview");
const voterPreview = document.getElementById("voterPreview");

// ==========================================================
// 1️⃣ EMI CALCULATION
// ==========================================================
function calculate() {
  const amt = parseFloat(loanAmountInput.value) || 0;
  const days = parseInt(loanPlanSelect.value) || 60;
  const total = amt + (amt * 0.20);
  totalPayableInput.value = Math.round(total);
  dailyCollectionInput.value = Math.round(total / days);
}
loanAmountInput.addEventListener("input", calculate);
loanPlanSelect.addEventListener("change", calculate);

// ==========================================================
// 2️⃣ DOCUMENT PHOTO PREVIEW
// ==========================================================
function setupPreview(input, previewEl) {
  input.addEventListener("change", function() {
    if (this.files && this.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewEl.src = e.target.result;
        previewEl.style.display = "block";
        previewEl.parentElement.querySelector(".placeholder").style.display = "none";
      };
      reader.readAsDataURL(this.files[0]);
    }
  });
}
setupPreview(aadharInput, aadharPreview);
setupPreview(panInput, panPreview);
setupPreview(voterInput, voterPreview);

// ==========================================================
// 3️⃣ IMGBB UPLOAD FUNCTION
// ==========================================================
async function uploadToImgBB(file) {
  const formData = new FormData();
  formData.append("image", file);
  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST",
    body: formData
  });
  const result = await response.json();
  if (!result.success) throw new Error("ImgBB Upload Failed");
  return result.data.url;
}

// ==========================================================
// 4️⃣ GENERATE CUSTOMER CODE
// ==========================================================
async function generateCustomerCode() {
  const counterRef = doc(db, "metadata", "customerCounter");
  try {
    const newNumber = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef);
      let lastNum = snap.exists() ? snap.data().lastNumber || 0 : 0;
      const nextNum = lastNum + 1;
      transaction.set(counterRef, { lastNumber: nextNum });
      return nextNum;
    });
    return `GDA${String(newNumber).padStart(4, '0')}`;
  } catch (error) {
    return `GDA${Date.now().toString().slice(-4)}`;
  }
}

// ==========================================================
// 5️⃣ MAIN FORM SUBMISSION
// ==========================================================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById("regBtn");
  submitBtn.disabled = true;
  submitBtn.innerText = "⏳ Saving...";

  try {
    const uniqueCode = await generateCustomerCode();

    // 🔥 Upload all documents (if selected)
    const uploadPromises = [];
    const docFiles = [
      { input: aadharInput, key: 'aadharPhoto' },
      { input: panInput, key: 'panPhoto' },
      { input: voterInput, key: 'voterPhoto' }
    ];
    const uploadedUrls = {};

    for (const item of docFiles) {
      if (item.input.files && item.input.files.length > 0) {
        const url = await uploadToImgBB(item.input.files[0]);
        uploadedUrls[item.key] = url;
      }
    }

    // Basic Photo (Customer)
    let photoUrl = "";
    const photoInput = document.getElementById("customerPhoto");
    if (photoInput && photoInput.files.length > 0) {
      photoUrl = await uploadToImgBB(photoInput.files[0]);
    }

    const customerData = {
      name: document.getElementById("customerName").value.trim(),
      mobile: document.getElementById("mobile").value.trim(),
      guardianName: document.getElementById("guardianName").value.trim(),
      aadhaar: document.getElementById("aadhaar").value.trim(),
      panCard: document.getElementById("panNumber").value.toUpperCase().trim(),
      address: document.getElementById("address").value.trim(),
      loanAmount: Number(loanAmountInput.value),
      planDuration: Number(loanPlanSelect.value),
      totalPayable: Number(totalPayableInput.value),
      totalCollected: 0,
      paidDays: 0,
      dailyEmi: Number(dailyCollectionInput.value),
      photoUrl: photoUrl || "",
      // 🔥 New Document URLs
      aadharPhoto: uploadedUrls.aadharPhoto || "",
      panPhoto: uploadedUrls.panPhoto || "",
      voterPhoto: uploadedUrls.voterPhoto || "",
      status: "Active",
      loanDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
      createdAt: new Date().toISOString(),
      customerCode: uniqueCode
    };

    await addDoc(collection(db, "customers"), customerData);
    alert(`✅ Customer ${uniqueCode} registered successfully!`);
    window.location.href = "customer-list.html";

  } catch (err) {
    alert("❌ Error: " + err.message);
    submitBtn.disabled = false;
    submitBtn.innerText = "💾 Save Registration";
  }
});
