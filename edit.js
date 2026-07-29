// ==========================================================
// 🚀 GDA FINANCE - EDIT CUSTOMER (WITH DOCUMENTS)
// ==========================================================

import { db, auth } from "./firebase.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const IMGBB_API_KEY = "5230b9fc28c784e9c389bcf09cb56dd2";
const ADMIN_PASSWORD = "GDA@2026";

// URL से Customer ID लें
const urlParams = new URLSearchParams(window.location.search);
const custId = urlParams.get("id");

console.log("🔍 Edit Page Loaded. Customer ID:", custId);

// DOM Elements
const form = document.getElementById("editForm");
const loadingIndicator = document.getElementById("loadingIndicator");
const updateBtn = document.getElementById("updateBtn");

// Main Photo
const photoInput = document.getElementById("customerPhoto");
const photoPreview = document.getElementById("photoPreview");

// Loan Calculation
const loanAmount = document.getElementById("loanAmount");
const loanPlan = document.getElementById("loanPlan");
const totalAmount = document.getElementById("totalAmount");
const emi = document.getElementById("emi");

// Document Inputs & Previews
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
        // Hide placeholder if exists
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
// 4️⃣ IMGBB UPLOAD
// ============================================================
async function uploadToImgBB(file) {
  try {
    const formData = new FormData();
    formData.append("image", file);
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
    console.error("Upload Error:", err);
    throw new Error("फोटो अपलोड नहीं हो पाया: " + err.message);
  }
}

// ============================================================
// 5️⃣ LOAD CUSTOMER DATA
// ============================================================
auth.onAuthStateChanged(async (user) => {
  console.log("🔐 Auth State Changed. User:", user ? "Logged In" : "Not Logged In");

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

  console.log("📡 Fetching customer data for ID:", custId);

  try {
    const docSnap = await getDoc(doc(db, "customers", custId));
    console.log("📄 Firestore Response - exists:", docSnap.exists());

    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log("✅ Customer Data Loaded:", data);

      // Fill text fields
      document.getElementById("customerName").value = data.name || "";
      document.getElementById("mobileNumber").value = data.mobile || "";
      document.getElementById("guardianName").value = data.guardianName || "";
      document.getElementById("aadhaar").value = data.aadhaar || "";
      document.getElementById("address").value = data.address || "";
      document.getElementById("panNumber").value = data.panCard || "";
      loanAmount.value = data.loanAmount || "";
      loanPlan.value = data.planDuration || "60";
      document.getElementById("loanDate").value = data.loanDate || "";
      calculateValues();

      // Main Photo
      if (data.photoUrl) {
        photoPreview.src = data.photoUrl;
      }

      // 📁 Document Photos (Aadhar, PAN, Voter)
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

      // Show form, hide loading
      loadingIndicator.style.display = "none";
      form.style.display = "block";
      console.log("✅ Form displayed successfully.");

    } else {
      console.error("❌ Customer not found in Firestore!");
      loadingIndicator.innerHTML = `
        <span style="font-size:32px;">❌</span>
        <span style="color:#DC2626;">Customer not found in database.</span>
        <button onclick="window.location.href='customer-list.html'" style="margin-top:12px; padding:10px 20px; border-radius:10px; border:none; background:#0F172A; color:#fff; font-weight:700; cursor:pointer;">← Back to List</button>
      `;
    }
  } catch (err) {
    console.error("🔥 Error loading customer data:", err);
    loadingIndicator.innerHTML = `
      <span style="font-size:32px;">❌</span>
      <span style="color:#DC2626;">Error: ${err.message}</span>
      <button onclick="window.location.reload()" style="margin-top:12px; padding:10px 20px; border-radius:10px; border:none; background:#0F172A; color:#fff; font-weight:700; cursor:pointer;">🔄 Retry</button>
    `;
  }
});

// ============================================================
// 6️⃣ FORM SUBMIT (UPDATE) – अब डॉक्यूमेंट्स के साथ
// ============================================================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const pass = prompt("🔑 Update करने के लिए Admin Password डालें:");
  if (pass !== ADMIN_PASSWORD) {
    if (pass !== null) alert("❌ गलत पासवर्ड!");
    return;
  }

  updateBtn.disabled = true;
  updateBtn.innerText = "⏳ Updating...";

  try {
    // Main Photo Upload (if changed)
    let photoUrl = photoPreview.src;
    if (photoInput.files && photoInput.files.length > 0) {
      const file = photoInput.files[0];
      if (file.size > 20 * 1024 * 1024) {
        throw new Error("फोटो 20MB से बड़ी है! कृपया छोटी फोटो चुनें!");
      }
      photoUrl = await uploadToImgBB(file);
    }

    // 📁 Document Uploads (if changed)
    const docUrls = { aadharPhoto: null, panPhoto: null, voterPhoto: null };
    for (const [key, { input }] of Object.entries(docInputs)) {
      if (input.files && input.files.length > 0) {
        const file = input.files[0];
        if (file.size > 20 * 1024 * 1024) {
          throw new Error(`डॉक्यूमेंट ${key} 20MB से बड़ी है!`);
        }
        const url = await uploadToImgBB(file);
        // Map key to Firestore field name
        if (key === 'aadhar') docUrls.aadharPhoto = url;
        else if (key === 'pan') docUrls.panPhoto = url;
        else if (key === 'voter') docUrls.voterPhoto = url;
      }
    }

    // Build update object
    const updateData = {
      name: document.getElementById("customerName").value.trim(),
      mobile: document.getElementById("mobileNumber").value.trim(),
      guardianName: document.getElementById("guardianName").value.trim(),
      aadhaar: document.getElementById("aadhaar").value.trim(),
      address: document.getElementById("address").value.trim(),
      panCard: document.getElementById("panNumber").value.toUpperCase().trim(),
      loanAmount: Number(loanAmount.value),
      planDuration: Number(loanPlan.value),
      totalPayable: Number(totalAmount.value),
      dailyEmi: Number(emi.value),
      loanDate: document.getElementById("loanDate").value,
      updatedAt: new Date().toISOString()
    };

    // Add photo if changed
    if (photoUrl) updateData.photoUrl = photoUrl;

    // Add document photos if uploaded
    if (docUrls.aadharPhoto) updateData.aadharPhoto = docUrls.aadharPhoto;
    if (docUrls.panPhoto) updateData.panPhoto = docUrls.panPhoto;
    if (docUrls.voterPhoto) updateData.voterPhoto = docUrls.voterPhoto;

    console.log("📤 Updating customer with data:", updateData);

    await updateDoc(doc(db, "customers", custId), updateData);

    alert("✅ कस्टमर डेटा सफलतापूर्वक अपडेट हो गया!");
    window.location.href = "statement.html?id=" + custId;

  } catch (err) {
    console.error("Update Error:", err);
    alert("❌ एरर: " + err.message);
    updateBtn.disabled = false;
    updateBtn.innerText = "💾 Update Profile";
  }
});
