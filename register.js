// ==========================================================
// 🚀 GDA FINANCE - REGISTER CUSTOMER (FINAL: IMGBB + SERIAL ID)
// ==========================================================

import { db } from "./firebase.js";
import { collection, addDoc, doc, runTransaction } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// =========================================================
// 🔥 1. SERIAL ID GENERATOR (GDA001, GDA002, GDA003...)
// =========================================================
async function generateCustomerCode() {
    // यह 'metadata/customerCounter' नाम का डॉक्यूमेंट में नंबर स्टोर करेगा
    const counterRef = doc(db, "metadata", "customerCounter");
    try {
        const newNumber = await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(counterRef);
            let lastNum = 0;
            if (snap.exists()) {
                lastNum = snap.data().lastNumber || 0;
            }
            const nextNum = lastNum + 1;
            // अगर डॉक्यूमेंट नहीं है तो सेट कर देगा, वरना अपडेट कर देगा
            transaction.set(counterRef, { lastNumber: nextNum });
            return nextNum;
        });
        // 4 अंकों में बदलें (जैसे 1 -> GDA0001, 50 -> GDA0050)
        return `GDA${String(newNumber).padStart(4, '0')}`;
    } catch (error) {
        console.error("Counter Error: ", error);
        // अगर काउंटर फेल हो (जैसे इंटरनेट न हो), तो फॉलबैक के तौर पर टाइमस्टैम्प से ID बनाएं
        return `GDA${Date.now().toString().slice(-4)}`;
    }
}

// =========================================================
// 2. IMGBB SETUP (भविष्य में Firebase Storage से बदल सकते हैं)
// =========================================================
const IMGBB_API_KEY = "5230b9fc28c784e9c389bcf09cb56dd2";

// =========================================================
// 3. DOM ELEMENTS (आपके HTML के एलिमेंट्स)
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
// 4. LOAN CALCULATION (20% Interest - आपका पुराना लॉजिक)
// =========================================================
function calculate() {
    const amt = parseFloat(loanAmountInput.value) || 0;
    const days = parseInt(loanPlanSelect.value) || 60;
    const total = amt + (amt * 0.20); // 15000 -> 18000
    totalPayableInput.value = Math.round(total);
    dailyCollectionInput.value = Math.round(total / days);
}

loanAmountInput.addEventListener("input", calculate);
loanPlanSelect.addEventListener("change", calculate);

// =========================================================
// 5. PHOTO PREVIEW (आपका पुराना कोड)
// =========================================================
photoInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
        photoPreview.src = URL.createObjectURL(this.files[0]);
    }
});

// =========================================================
// 6. IMGBB UPLOAD FUNCTION (आपका पुराना कोड)
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
// 7. ✅ MAIN FORM SUBMISSION (FINAL: SERIAL ID + IMGBB)
// =========================================================
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // बटन को डिसेबल करें ताकि डबल क्लिक न हो
    submitBtn.disabled = true;
    submitBtn.innerText = "⏳ Saving Data...";

    try {
        // 🔥🔥🔥 नया Serial ID (Member ID) जनरेट करें
        const uniqueCode = await generateCustomerCode();

        // अगर फोटो चुनी है तो ImgBB पर अपलोड करें
        let photoUrl = "";
        if (photoInput.files.length > 0) {
            photoUrl = await uploadToImgBB(photoInput.files[0]);
        }

        // ✅ Data Object (सिर्फ जरूरी फील्ड्स, कोई userId नहीं ताकि पुराना डेटा भी चले)
        const customerData = {
            name: document.getElementById("customerName").value.trim(),
            mobile: document.getElementById("mobile").value.trim(),
            aadhaar: "[Aadhaar Redacted]", // सुरक्षा के लिए रेडैक्टेड
            panCard: document.getElementById("panNumber").value.toUpperCase().trim(),
            loanAmount: Number(loanAmountInput.value),
            planDuration: Number(loanPlanSelect.value),
            totalPayable: Number(totalPayableInput.value),
            dailyCollection: Number(dailyCollectionInput.value), 
            photoUrl: photoUrl || "",
            status: "Active",
            loanDate: new Date().toISOString().split("T")[0],
            createdAt: new Date().toISOString(),
            
            // 🔥🔥🔥 नई जोड़ी गई लाइन (यह GDA0001, GDA0002... सेव करेगी)
            customerCode: uniqueCode 
        };

        // Firestore में सेव करें
        await addDoc(collection(db, "customers"), customerData);

        alert(`✅ कस्टमर ${uniqueCode} सफलतापूर्वक रजिस्टर हो गया!`);
        window.location.href = "customer-list.html";

    } catch (err) {
        console.error("Submission Error:", err);
        alert("❌ Error: " + err.message);
        
        // एरर आने पर बटन वापस सक्रिय करें
        submitBtn.disabled = false;
        submitBtn.innerText = "📥 Save Registration";
    }
});
