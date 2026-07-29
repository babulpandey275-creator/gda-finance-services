// ==========================================================
// 🚀 GDA FINANCE - REGISTER CUSTOMER (FINAL FIXED)
// ==========================================================

import { db } from "./firebase.js";
import { collection, addDoc, doc, runTransaction } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// 1. SERIAL ID GENERATOR
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

// 2. IMGBB SETUP
const IMGBB_API_KEY = "5230b9fc28c784e9c389bcf09cb56dd2";

// 3. DOM ELEMENTS
const form = document.getElementById("regForm");
const loanAmountInput = document.getElementById("loanAmount");
const loanPlanSelect = document.getElementById("loanPlan");
const totalPayableInput = document.getElementById("totalPayable");
const dailyCollectionInput = document.getElementById("dailyCollection");
const photoInput = document.getElementById("customerPhoto");
const photoPreview = document.getElementById("photoPreview");
const submitBtn = document.getElementById("regBtn");

function calculate() {
    const amt = parseFloat(loanAmountInput.value) || 0;
    const days = parseInt(loanPlanSelect.value) || 60;
    const total = amt + (amt * 0.20);
    totalPayableInput.value = Math.round(total);
    dailyCollectionInput.value = Math.round(total / days);
}
loanAmountInput.addEventListener("input", calculate);
loanPlanSelect.addEventListener("change", calculate);

photoInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
        photoPreview.src = URL.createObjectURL(this.files[0]);
    }
});

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

// 7. MAIN FORM SUBMISSION (FIXED)
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.innerText = "⏳ Saving Data...";
    try {
        const uniqueCode = await generateCustomerCode();
        let photoUrl = "";
        if (photoInput.files.length > 0) {
            photoUrl = await uploadToImgBB(photoInput.files[0]);
        }

        // 🔥 FIX: Saare field ek sath save taaki kahin bhi 0 na dikhe
        const totalPayableVal = Number(totalPayableInput.value);
        const dailyVal = Number(dailyCollectionInput.value);

        const customerData = {
            name: document.getElementById("customerName").value.trim(),
            mobile: document.getElementById("mobile").value.trim(),
            guardianName: document.getElementById("guardianName").value.trim(),
            aadhaar: document.getElementById("aadhaar").value.trim(),
            panCard: document.getElementById("panNumber").value.toUpperCase().trim(),
            loanAmount: Number(loanAmountInput.value),
            planDuration: Number(loanPlanSelect.value),
            totalPayable: totalPayableVal,
            totalCollection: totalPayableVal, // FIX
            dailyCollection: dailyVal, // FIX
            dailyEmi: dailyVal, // FIX - Isi se collection sahi hoga
            totalCollected: 0, // FIX
            paidDays: 0, // FIX
            photoUrl: photoUrl || "",
            status: "Active",
            loanDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
            createdAt: new Date().toISOString(),
            customerCode: uniqueCode
        };

        await addDoc(collection(db, "customers"), customerData);
        alert(`✅ कस्टमर ${uniqueCode} सफलतापूर्वक रजिस्टर हो गया!`);
        window.location.href = "customer-list.html";
    } catch (err) {
        console.error("Submission Error:", err);
        alert("❌ Error: " + err.message);
        submitBtn.disabled = false;
        submitBtn.innerText = "💾 Save Registration";
    }
});
