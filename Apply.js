// ==========================================================
// 🚀 GDA FINANCE - PUBLIC LOAN APPLICATION FORM
// Customer khud is link se apna data + documents bhejta hai.
// Yeh seedha "customers" mein NAHI jaata — pehle "applications"
// collection mein "Pending" status ke saath jaata hai, taaki
// staff loan amount set karke approve kare (applications.html).
// ==========================================================

import { db } from "./firebase.js";
import { collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const IMGBB_API_KEY = "5230b9fc28c784e9c389bcf09cb56dd2";

const form = document.getElementById("applyForm");
const applyCard = document.getElementById("applyCard");
const successScreen = document.getElementById("successScreen");

const mobileInput = document.getElementById("mobile");
const aadhaarInput = document.getElementById("aadhaar");
const panNumberInput = document.getElementById("panNumber");

const photoPreview = document.getElementById("photoPreview");
const customerPhotoCamera = document.getElementById("customerPhotoCamera");
const customerPhotoGallery = document.getElementById("customerPhotoGallery");

const aadharInput = document.getElementById("aadharInput");
const panInput = document.getElementById("panInput");
const voterInput = document.getElementById("voterInput");
const aadharPreview = document.getElementById("aadharPreview");
const panPreview = document.getElementById("panPreview");
const voterPreview = document.getElementById("voterPreview");

let selectedPhotoFile = null;

// ===== PHOTO PREVIEW (Camera + Gallery) =====
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

// ===== DOCUMENT PREVIEW =====
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

// ===== IMAGE COMPRESSION =====
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

async function uploadToImgBB(file) {
  const compressed = await compressImage(file);
  const formData = new FormData();
  formData.append("image", compressed);
  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST",
    body: formData
  });
  const result = await response.json();
  if (!result.success) throw new Error("Image upload failed");
  return result.data.url;
}

// ===== VALIDATION =====
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

  return valid;
}

async function checkDuplicate(mobileVal) {
  // customers + applications दोनों में check करें ताकि duplicate entry ना बने
  const custQ = query(collection(db, "customers"), where("mobile", "==", mobileVal));
  const custSnap = await getDocs(custQ);
  if (!custSnap.empty) return "already-customer";

  const appQ = query(collection(db, "applications"), where("mobile", "==", mobileVal), where("status", "==", "Pending"));
  const appSnap = await getDocs(appQ);
  if (!appSnap.empty) return "already-applied";

  return null;
}

// ===== FORM SUBMIT =====
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById("applyBtn");

  if (!validateForm()) {
    alert("कृपया लाल निशान वाले fields सही तरीके से भरें।");
    return;
  }

  const mobileVal = mobileInput.value.trim();
  submitBtn.disabled = true;
  submitBtn.innerText = "⏳ Checking...";

  try {
    const dupCheck = await checkDuplicate(mobileVal);
    if (dupCheck === "already-customer") {
      alert("⚠️ यह मोबाइल नंबर पहले से एक registered customer के नाम पर है। कृपया हमारी शाखा से संपर्क करें।");
      submitBtn.disabled = false;
      submitBtn.innerText = "📤 Application भेजें";
      return;
    }
    if (dupCheck === "already-applied") {
      alert("⚠️ इस मोबाइल नंबर से पहले ही एक application भेजी जा चुकी है। हमारी टीम जल्द संपर्क करेगी।");
      submitBtn.disabled = false;
      submitBtn.innerText = "📤 Application भेजें";
      return;
    }

    const docFiles = [
      { input: aadharInput, key: 'aadharPhoto', label: 'Aadhar Card' },
      { input: panInput, key: 'panPhoto', label: 'PAN Card' },
      { input: voterInput, key: 'voterPhoto', label: 'Voter ID' }
    ];
    const uploadedUrls = {};
    const totalSteps = docFiles.filter(d => d.input.files.length > 0).length + (selectedPhotoFile ? 1 : 0);
    let currentStep = 0;

    let photoUrl = "";
    if (selectedPhotoFile) {
      currentStep++;
      submitBtn.innerText = `⏳ Photo भेज रहे हैं (${currentStep}/${totalSteps})...`;
      photoUrl = await uploadToImgBB(selectedPhotoFile);
    }

    for (const item of docFiles) {
      if (item.input.files && item.input.files.length > 0) {
        currentStep++;
        submitBtn.innerText = `⏳ ${item.label} भेज रहे हैं (${currentStep}/${totalSteps})...`;
        const url = await uploadToImgBB(item.input.files[0]);
        uploadedUrls[item.key] = url;
      }
    }

    submitBtn.innerText = "⏳ Submitting...";

    const applicationData = {
      name: document.getElementById("customerName").value.trim(),
      mobile: mobileVal,
      guardianName: document.getElementById("guardianName").value.trim(),
      aadhaar: aadhaarInput.value.trim(),
      panCard: panNumberInput.value.toUpperCase().trim(),
      address: document.getElementById("address").value.trim(),
      photoUrl: photoUrl || "",
      aadharPhoto: uploadedUrls.aadharPhoto || "",
      panPhoto: uploadedUrls.panPhoto || "",
      voterPhoto: uploadedUrls.voterPhoto || "",
      status: "Pending",
      appliedAt: new Date().toISOString()
    };

    await addDoc(collection(db, "applications"), applicationData);

    // Success screen dikhaao
    applyCard.style.display = "none";
    successScreen.style.display = "block";

  } catch (err) {
    alert("❌ Error: " + err.message);
    submitBtn.disabled = false;
    submitBtn.innerText = "📤 Application भेजें";
  }
});
