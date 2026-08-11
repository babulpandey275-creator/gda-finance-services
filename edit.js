// ==========================================================
// 🚀 GDA FINANCE - EDIT CUSTOMER (register.js जैसा ही standard)
// ==========================================================

import { db, auth } from "./firebase.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const IMGBB_API_KEY = "5230b9fc28c784e9c389bcf09cb56dd2";
const ADMIN_PASSWORD = "GDA@2026";

const urlParams = new URLSearchParams(window.location.search);
const custId = urlParams.get("id");

// DOM Elements
const form = document.getElementById("editForm");
const loadingIndicator = document.getElementById("loadingIndicator");
const updateBtn = document.getElementById("updateBtn");

const photoInput = document.getElementById("customerPhoto");
const photoPreview = document.getElementById("photoPreview");

const loanAmount = document.getElementById("loanAmount");
const loanPlan = document.getElementById("loanPlan");
const totalAmount = document.getElementById("totalAmount");
const emi = document.getElementById("emi");

const mobileInput = document.getElementById("mobileNumber");
const aadhaarInput = document.getElementById("aadhaar");
const panNumberInput = document.getElementById("panNumber");

const docInputs = {
  aadhar: { input: document.getElementById("editAadharInput"), preview: document.getElementById("editAadharPreview") },
  pan: { input: document.getElementById("editPanInput"), preview: document.getElementById("editPanPreview") },
  voter: { input: document.getElementById("editVoterInput"), preview: document.getElementById("editVoterPreview") }
};

// ============================================================
// 1️⃣ CALCULATION
// ============================================================
function calculateValues() {
  const principal = Number(loanAmount.value) || 0;
  const duration = Number(loanPlan.value) || 60;
  const total = principal + (principal * 0.20);
  const dailyEmi = duration > 0 ? Math.round(total / duration) : 0;
  totalAmount.value = total;
  emi.value = dailyEmi;
}
loanAmount.addEventListener("input", calculateValues);
loanPlan.addEventListener("change", calculateValues);

// ============================================================
// 2️⃣ PHOTO PREVIEW (Main)
// ============================================================
photoInput.addEventListener("change", function () {
  if (this.files && this.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      photoPreview.src = e.target.result;
    };
    reader.readAsDataURL(this.files[0]);
  }
});

// ============================================================
// 3️⃣ DOCUMENT PREVIEW (Aadhar, PAN, Voter)
// ============================================================
Object.values(docInputs).forEach(({ input, preview }) => {
  input.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.src = e.target.result;
        preview.style.display = "block";
        const parent = preview.closest('.doc-upload-box');
        if (parent) {
          const placeholder = parent.querySelector('.placeholder');
          if (placeholder) placeholder.style.display = "none";
        }
      };
      reader.readAsDataURL(this.files[0]);
    }
  });
});

// ============================================================
// 4️⃣ IMAGE COMPRESSION (register.js जैसा — धीमे internet पर तेज़ upload)
// ============================================================
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

// ============================================================
// 5️⃣ IMGBB UPLOAD (अब compress करके भेजता है)
// ============================================================
async function uploadToImgBB(file) {
  try {
    const compressed = await compressImage(file);
    const formData = new FormData();
    formData.append("image", compressed);
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: formData
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error("ImgBB Error: " + (result.status_txt || "Unknown error"));
    }
    return result.data.url;
  } catch (err) {
    console.error("Upload Error:", err.message);
    throw new Error("फोटो अपलोड नहीं हो पाया: " + err.message);
  }
}

// ============================================================
// 6️⃣ VALIDATION (register.js जैसे ही नियम)
// ============================================================
function markField(el, invalid) {
  if (!el) return;
  el.style.borderColor = invalid ? "#DC2626" : "";
  el.style.boxShadow = invalid ? "0 0 0 3px rgba(220,38,38,0.08)" : "";
}

function validateForm() {
  let valid = true;

  const mobileVal = mobileInput.value.trim();
  const mobileOk = /^[6-9]\d{9}$/.test(mobileVal);
  markField(mobileInput, !mobileOk);
  if (!mobileOk) valid = false;

  const aadhaarVal = aadhaarInput.value.trim();
  if (aadhaarVal && !/^\d{12}$/.test(aadhaarVal)) {
    markField(aadhaarInput, true);
    valid = false;
  } else {
    markField(aadhaarInput, false);
  }

  const panVal = panNumberInput.value.trim().toUpperCase();
  if (panVal && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panVal)) {
    markField(panNumberInput, true);
    valid = false;
  } else {
    markField(panNumberInput, false);
  }

  const amt = Number(loanAmount.value);
  if (!amt || amt < 500) {
    markField(loanAmount, true);
    valid = false;
  } else {
    markField(loanAmount, false);
  }

  return valid;
}

// ============================================================
// 7️⃣ LOAD CUSTOMER DATA (अब बिना sensitive console.log के)
// ============================================================
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    alert("❌ कृपया पहले लॉगिन करें!");
    window.location.href = "login.html";
    return;
  }

  if (!custId) {
    alert("❌ Customer ID नहीं मिली!");
    window.location.href = "customer-list.html";
    return;
  }

  try {
    const docSnap = await getDoc(doc(db, "customers", custId));

    if (docSnap.exists()) {
      const data = docSnap.data();

      document.getElementById("customerName").value = data.name || "";
      mobileInput.value = data.mobile || "";
      document.getElementById("guardianName").value = data.guardianName || "";
      aadhaarInput.value = data.aadhaar || "";
      document.getElementById("address").value = data.address || "";
      panNumberInput.value = data.panCard || "";
      loanAmount.value = data.loanAmount || "";
      loanPlan.value = data.planDuration || "60";
      document.getElementById("loanDate").value = data.loanDate || "";
      calculateValues();

      if (data.photoUrl) {
        photoPreview.src = data.photoUrl;
      }

      if (data.aadharPhoto) {
        docInputs.aadhar.preview.src = data.aadharPhoto;
        docInputs.aadhar.preview.style.display = "block";
        const parent = docInputs.aadhar.preview.closest('.doc-upload-box');
        if (parent) {
          const placeholder = parent.querySelector('.placeholder');
          if (placeholder) placeholder.style.display = "none";
        }
      }
      if (data.panPhoto) {
        docInputs.pan.preview.src = data.panPhoto;
        docInputs.pan.preview.style.display = "block";
        const parent = docInputs.pan.preview.closest('.doc-upload-box');
        if (parent) {
          const placeholder = parent.querySelector('.placeholder');
          if (placeholder) placeholder.style.display = "none";
        }
      }
      if (data.voterPhoto) {
        docInputs.voter.preview.src = data.voterPhoto;
        docInputs.voter.preview.style.display = "block";
        const parent = docInputs.voter.preview.closest('.doc-upload-box');
        if (parent) {
          const placeholder = parent.querySelector('.placeholder');
          if (placeholder) placeholder.style.display = "none";
        }
      }

      loadingIndicator.style.display = "none";
      form.style.display = "block";

    } else {
      loadingIndicator.innerHTML = `
        <span style="font-size:32px;">❌</span>
        <span style="color:#DC2626;">Customer not found in database.</span>
        <button onclick="window.location.href='customer-list.html'" style="margin-top:12px; padding:10px 20px; border-radius:10px; border:none; background:#0F172A; color:#fff; font-weight:700; cursor:pointer;">← Back to List</button>
      `;
    }
  } catch (err) {
    console.error("Error loading customer data:", err.message);
    loadingIndicator.innerHTML = `
      <span style="font-size:32px;">❌</span>
      <span style="color:#DC2626;">Error: ${err.message}</span>
      <button onclick="window.location.reload()" style="margin-top:12px; padding:10px 20px; border-radius:10px; border:none; background:#0F172A; color:#fff; font-weight:700; cursor:pointer;">🔄 Retry</button>
    `;
  }
});

// ============================================================
// 8️⃣ FORM SUBMIT (UPDATE) — validation + compression + progress
// ============================================================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    alert("कृपया लाल निशान वाले fields सही तरीके से भरें।");
    return;
  }

  const pass = prompt("🔑 Update करने के लिए Admin Password डालें:");
  if (pass !== ADMIN_PASSWORD) {
    if (pass !== null) alert("❌ गलत पासवर्ड!");
    return;
  }

  updateBtn.disabled = true;
  updateBtn.innerText = "⏳ Updating...";

  try {
    const docFiles = Object.entries(docInputs).filter(([key, { input }]) => input.files && input.files.length > 0);
    const photoChanged = photoInput.files && photoInput.files.length > 0;
    const totalSteps = docFiles.length + (photoChanged ? 1 : 0);
    let currentStep = 0;

    let photoUrl = photoPreview.src;
    if (photoChanged) {
      const file = photoInput.files[0];
      if (file.size > 20 * 1024 * 1024) {
        throw new Error("फोटो 20MB से बड़ी है! कृपया छोटी फोटो चुनें!");
      }
      currentStep++;
      updateBtn.innerText = `⏳ Uploading Photo (${currentStep}/${totalSteps})...`;
      photoUrl = await uploadToImgBB(file);
    }

    const docLabels = { aadhar: 'Aadhar Card', pan: 'PAN Card', voter: 'Voter ID' };
    const docUrls = { aadharPhoto: null, panPhoto: null, voterPhoto: null };
    for (const [key, { input }] of docFiles) {
      const file = input.files[0];
      if (file.size > 20 * 1024 * 1024) {
        throw new Error(`डॉक्यूमेंट ${docLabels[key]} 20MB से बड़ी है!`);
      }
      currentStep++;
      updateBtn.innerText = `⏳ Uploading ${docLabels[key]} (${currentStep}/${totalSteps})...`;
      const url = await uploadToImgBB(file);
      if (key === 'aadhar') docUrls.aadharPhoto = url;
      else if (key === 'pan') docUrls.panPhoto = url;
      else if (key === 'voter') docUrls.voterPhoto = url;
    }

    updateBtn.innerText = "⏳ Finalizing...";

    const updateData = {
      name: document.getElementById("customerName").value.trim(),
      mobile: mobileInput.value.trim(),
      guardianName: document.getElementById("guardianName").value.trim(),
      aadhaar: aadhaarInput.value.trim(),
      address: document.getElementById("address").value.trim(),
      panCard: panNumberInput.value.toUpperCase().trim(),
      loanAmount: Number(loanAmount.value),
      planDuration: Number(loanPlan.value),
      totalPayable: Number(totalAmount.value),
      dailyEmi: Number(emi.value),
      loanDate: document.getElementById("loanDate").value,
      updatedAt: new Date().toISOString()
    };

    if (photoUrl) updateData.photoUrl = photoUrl;
    if (docUrls.aadharPhoto) updateData.aadharPhoto = docUrls.aadharPhoto;
    if (docUrls.panPhoto) updateData.panPhoto = docUrls.panPhoto;
    if (docUrls.voterPhoto) updateData.voterPhoto = docUrls.voterPhoto;

    await updateDoc(doc(db, "customers", custId), updateData);

    alert("✅ कस्टमर डेटा सफलतापूर्वक अपडेट हो गया!");
    window.location.href = "statement.html?id=" + custId;

  } catch (err) {
    console.error("Update Error:", err.message);
    alert("❌ एरर: " + err.message);
    updateBtn.disabled = false;
    updateBtn.innerText = "💾 Update Profile";
  }
});
