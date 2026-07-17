// ==========================================================
// 🚀 GDA FINANCE - REGISTER CUSTOMER (FINAL: IMGBB + SERIAL ID + GUARDIAN + AADHAAR)
// ==========================================================

import { db } from "./firebase.js";
import { collection, addDoc, doc, runTransaction } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// =========================================================
// 🔥 1. SERIAL ID GENERATOR (GDA001, GDA002, GDA003...)
// =========================================================
async function generateCustomerCode() {
    const counterRef = doc(db, "metadata", "customerCounter");
    try {
        const newNumber = await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(counterRef);
            let lastNum = 0;
            if (snap.exists()) {
                lastNum = snap.data().lastNumber || 0;
            }
            const nextNum = lastNum + 1;
            transaction.set(counterRef, { lastNumber: nextNum });
            return nextNum;
        });
        return `GDA${String(newNumber).padStart(4, '0')}`;
    } catch (error) {
        console.error("Counter Error: ", error);
        return `GDA${Date.now().toString().slice(-4)}`;
    }
}

// =========================================================
// 2. IMGBB SETUP (भविष्य में Firebase Storage से बदल सकते हैं)
// =========================================================
const IMGBB_API_KEY = "5230b9fc28c784e9c389bcf09cb56dd2";

// =========================================================
// 3. DOM ELEMENTS
// =========================================================
const form = document.getElementById("regForm");
const loanAmountInput = document.getElementById("loanAmount");
const loanPlanSelect = document.getElementById("loanPlan");
const totalPayableInput = document.getElementById("totalPayable");
const dailyCollectionInput = document.getElementById("dailyCollection");
const photoInput = document.getElementById("customerPhoto");
const photoPreview = document.getElementById("photoPreview");
const submitBtn = document.getElementById("regBtn");

// =========================================================
// 4. LOAN CALCULATION (20% Interest)
// =========================================================
function calculate() {
    const amt = parseFloat(loanAmountInput.value) || 0;
    const days = parseInt(loanPlanSelect.value) || 60;
    const total = amt + (amt * 0.20);
    totalPayableInput.value = Math.round(total);
    dailyCollectionInput.value = Math.round(total / days);
}

loanAmountInput.addEventListener("input", calculate);
loanPlanSelect.addEventListener("change", calculate);

// =========================================================
// 5. PHOTO PREVIEW
// =========================================================
photoInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
        photoPreview.src = URL.createObjectURL(this.files[0]);
    }
});

// =========================================================
// 6. IMGBB UPLOAD FUNCTION
// =========================================================
async function uploadToImgBB(file) {
    const formData = new FormData();
    formData.append("image", file);
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData
    });
    const result = await response.json();
    if (!result.success) throw new Error("Photo upload failed: " + result.status_txt);
    return result.data.url;
}

// =========================================================
// 7. ✅ MAIN FORM SUBMISSION (FINAL: GUARDIAN + REAL AADHAAR)
// =========================================================
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    submitBtn.disabled = true;
    submitBtn.innerText = "⏳ Saving Data...";

    try {
        // Serial ID जनरेट करें
        const uniqueCode = await generateCustomerCode();

        // फोटो अपलोड (अगर चुनी है)
        let photoUrl = "";
        if (photoInput.files.length > 0) {
            photoUrl = await uploadToImgBB(photoInput.files[0]);
        }

        // 🔥🔥🔥 Data Object – अब Guardian Name और Real Aadhaar शामिल हैं
        const customerData = {
            name: document.getElementById("customerName").value.trim(),
            mobile: document.getElementById("mobile").value.trim(),
            guardianName: document.getElementById("guardianName").value.trim(), // 🔥 नया (New) फील्ड (Field)
            aadhaar: document.getElementById("aadhaar").value.trim(), // 🔥 अब रीयल (Real) नंबर (Number) सेव (Save) होगा
            panCard: document.getElementById("panNumber").value.toUpperCase().trim(),
            loanAmount: Number(loanAmountInput.value),
            planDuration: Number(loanPlanSelect.value),
            totalPayable: Number(totalPayableInput.value),
            dailyCollection: Number(dailyCollectionInput.value),
            photoUrl: photoUrl || "",
            status: "Active",
            loanDate: new Date().toISOString().split("T")[0],
            createdAt: new Date().toISOString(),
            customerCode: uniqueCode // GDA001, GDA002...
        };

        // Firestore में सेव करें
        await addDoc(collection(db, "customers"), customerData);

        alert(`✅ कस्टमर ${uniqueCode} सफलतापूर्वक रजिस्टर हो गया!`);
        window.location.href = "customer-list.html";

    } catch (err) {
        console.error("Submission Error:", err);
        alert("❌ Error: " + err.message);
        submitBtn.disabled = false;
        submitBtn.innerText = "📥 Save Registration";
    }
});
