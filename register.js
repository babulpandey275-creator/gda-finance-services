// ==========================================================
// 🚀 GDA FINANCE - REGISTER (WITH DOCUMENT UPLOADS)
// ==========================================================

import { db } from "./firebase.js";
import { collection, addDoc, doc, runTransaction, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const IMGBB_API_KEY = "5230b9fc28c784e9c389bcf09cb56dd2";

// DOM Elements
const form = document.getElementById("regForm");
const loanAmountInput = document.getElementById("loanAmount");
const loanPlanSelect = document.getElementById("loanPlan");
const totalPayableInput = document.getElementById("totalPayable");
const dailyCollectionInput = document.getElementById("dailyCollection");
const mobileInput = document.getElementById("mobile");
const aadhaarInput = document.getElementById("aadhaar");
const panNumberInput = document.getElementById("panNumber");

// Photo Elements
const photoPreview = document.getElementById("photoPreview");
const customerPhotoCamera = document.getElementById("customerPhotoCamera");
const customerPhotoGallery = document.getElementById("customerPhotoGallery");

// Document Upload Elements
const aadharInput = document.getElementById("aadharInput");
const panInput = document.getElementById("panInput");
const voterInput = document.getElementById("voterInput");
const aadharPreview = document.getElementById("aadharPreview");
const panPreview = document.getElementById("panPreview");
const voterPreview = document.getElementById("voterPreview");

// 🔥 यहाँ customer की चुनी हुई photo (Camera या Gallery) रखी जाएगी
let selectedPhotoFile = null;

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
// 2️⃣ PHOTO PREVIEW (Camera + Gallery दोनों)
// ==========================================================
function setupPhotoPicker(input) {
  input.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      selectedPhotoFile = this.files[0];
      const reader = new FileReader();
      reader.onload = (e) => { photoPreview.src = e.target.result; };
      reader.readAsDataURL(selectedPhotoFile);
    }
  });
}
setupPhotoPicker(customerPhotoCamera);
setupPhotoPicker(customerPhotoGallery);

// ==========================================================
// 3️⃣ DOCUMENT PHOTO PREVIEW
// ==========================================================
function setupDocPreview(input, previewEl) {
  input.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewEl.src = e.target.result;
        previewEl.style.display = "block";
        const placeholder = previewEl.parentElement.querySelector(".placeholder");
        if (placeholder) placeholder.style.display = "none";
      };
      reader.readAsDataURL(this.files[0]);
    }
  });
}
setupDocPreview(aadharInput, aadharPreview);
setupDocPreview(panInput, panPreview);
setupDocPreview(voterInput, voterPreview);

// ==========================================================
// 4️⃣ IMAGE COMPRESSION
// ==========================================================
function compressImage(file, maxDim = 1000, quality = 0.72) {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          } else {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => resolve(blob ? new File([blob], file.name, { type: "image/jpeg" }) : file),
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

// ==========================================================
// 5️⃣ IMGBB UPLOAD FUNCTION
// ==========================================================
async function uploadToImgBB(file) {
  const compressed = await compressImage(file);
  const formData = new FormData();
  formData.append("image", compressed);
  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST",
    body: formData
  });
  const result = await response.json();
  if (!result.success) throw new Error("ImgBB Upload Failed");
  return result.data.url;
}

// ==========================================================
// 6️⃣ GENERATE CUSTOMER CODE
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
// 7️⃣ VALIDATION
// ==========================================================
function showError(groupId, show) {
  const group = document.getElementById(groupId);
  if (group) group.classList.toggle("invalid", show);
}

function validateForm() {
  let valid = true;

  const mobileVal = mobileInput.value.trim();
  const mobileOk = /^[6-9]\d{9}$/.test(mobileVal);
  showError("mobileGroup", !mobileOk);
  if (!mobileOk) valid = false;

  const aadhaarVal = aadhaarInput.value.trim();
  if (aadhaarVal && !/^\d{12}$/.test(aadhaarVal)) {
    showError("aadhaarGroup", true);
    valid = false;
  } else {
    showError("aadhaarGroup", false);
  }

  const panVal = panNumberInput.value.trim().toUpperCase();
  if (panVal && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panVal)) {
    showError("panGroup", true);
    valid = false;
  } else {
    showError("panGroup", false);
  }

  const amt = Number(loanAmountInput.value);
  if (!amt || amt < 500) {
    showError("loanAmountGroup", true);
    valid = false;
  } else {
    showError("loanAmountGroup", false);
  }

  return valid;
}

// ==========================================================
// 8️⃣ DUPLICATE MOBILE CHECK
// ==========================================================
async function checkDuplicateMobile(mobileVal) {
  const q = query(collection(db, "customers"), where("mobile", "==", mobileVal));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const existing = snap.docs[0].data();
    return existing.name || "Existing Customer";
  }
  return null;
}

// ==========================================================
// 9️⃣ MAIN FORM SUBMISSION
// ==========================================================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById("regBtn");

  if (!validateForm()) {
    alert("कृपया लाल निशान वाले fields सही तरीके से भरें।");
    return;
  }

  const mobileVal = mobileInput.value.trim();
  submitBtn.disabled = true;
  submitBtn.innerText = "⏳ Checking...";

  try {
    const existingName = await checkDuplicateMobile(mobileVal);
    if (existingName) {
      const proceed = confirm(`⚠️ यह मोबाइल नंबर पहले से "${existingName}" के नाम से registered है।\n\nफिर भी नया registration जारी रखें?`);
      if (!proceed) {
        submitBtn.disabled = false;
        submitBtn.innerText = "💾 Register Customer";
        return;
      }
    }

    submitBtn.innerText = "⏳ Saving details...";
    const uniqueCode = await generateCustomerCode();

    const docFiles = [
      { input: aadharInput, key: 'aadharPhoto', label: 'Aadhar Card' },
      { input: panInput, key: 'panPhoto', label: 'PAN Card' },
      { input: voterInput, key: 'voterPhoto', label: 'Voter ID' }
    ];
    const uploadedUrls = {};
    const totalSteps = docFiles.filter(d => d.input.files.length > 0).length + (selectedPhotoFile ? 1 : 0);
    let currentStep = 0;

    if (selectedPhotoFile) {
      currentStep++;
      submitBtn.innerText = `⏳ Uploading Photo (${currentStep}/${totalSteps})...`;
    }
    let photoUrl = "";
    if (selectedPhotoFile) {
      photoUrl = await uploadToImgBB(selectedPhotoFile);
    }

    for (const item of docFiles) {
      if (item.input.files && item.input.files.length > 0) {
        currentStep++;
        submitBtn.innerText = `⏳ Uploading ${item.label} (${currentStep}/${totalSteps})...`;
        const url = await uploadToImgBB(item.input.files[0]);
        uploadedUrls[item.key] = url;
      }
    }

    submitBtn.innerText = "⏳ Finalizing...";

    const customerData = {
      name: document.getElementById("customerName").value.trim(),
      mobile: mobileVal,
      guardianName: document.getElementById("guardianName").value.trim(),
      aadhaar: aadhaarInput.value.trim(),
      panCard: panNumberInput.value.toUpperCase().trim(),
      address: document.getElementById("address").value.trim(),
      loanAmount: Number(loanAmountInput.value),
      planDuration: Number(loanPlanSelect.value),
      totalPayable: Number(totalPayableInput.value),
      totalCollected: 0,
      paidDays: 0,
      dailyEmi: Number(dailyCollectionInput.value),
      photoUrl: photoUrl || "",
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
    submitBtn.innerText = "💾 Register Customer";
  }
});
