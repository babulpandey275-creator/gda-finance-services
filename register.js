import { db } from "./firebase.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Configuration
const IMGBB_API_KEY = "5230b9fc28c784e9c389bcf09cb56dd2";

// DOM Elements
const form = document.getElementById("regForm");
const loanAmountInput = document.getElementById("loanAmount");
const loanPlanSelect = document.getElementById("loanPlan");
const totalPayableInput = document.getElementById("totalPayable");
const dailyCollectionInput = document.getElementById("dailyCollection");
const photoInput = document.getElementById("customerPhoto");
const photoPreview = document.getElementById("photoPreview");
const submitBtn = document.getElementById("regBtn");

// 1. Loan Calculation Logic
function calculate() {
    const amt = parseFloat(loanAmountInput.value) || 0;
    const days = parseInt(loanPlanSelect.value) || 60;
    const total = amt + (amt * 0.20); // 20% Interest

    totalPayableInput.value = Math.round(total);
    dailyCollectionInput.value = Math.round(total / days);
}

// Event Listeners for Calculation
loanAmountInput.addEventListener("input", calculate);
loanPlanSelect.addEventListener("change", calculate);

// 2. Photo Preview
photoInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
        photoPreview.src = URL.createObjectURL(this.files[0]);
    }
});

// 3. ImgBB Upload Function
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

// 4. Main Form Submission
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    submitBtn.disabled = true;
    submitBtn.innerText = "Saving Data...";

    try {
        let photoUrl = "";

        // Upload Photo if exists
        if (photoInput.files.length > 0) {
            photoUrl = await uploadToImgBB(photoInput.files[0]);
        }

        // Prepare Data Object
        const customerData = {
            name: document.getElementById("customerName").value.trim(),
            mobile: document.getElementById("mobile").value.trim(),
            aadhaar: "[Aadhaar Redacted]", // सुरक्षा के लिए रेडैक्टेड
            panCard: document.getElementById("panNumber").value.toUpperCase().trim(),
            loanAmount: Number(loanAmountInput.value),
            planDuration: Number(loanPlanSelect.value),
            totalPayable: Number(totalPayableInput.value),
            dailyCollection: Number(dailyCollectionInput.value),
            photoUrl: photoUrl || "", // यह सुनिश्चित करेगा कि फील्ड खाली होने पर भी बने
            status: "Active",
            loanDate: new Date().toISOString().split("T")[0],
            createdAt: new Date().toISOString()
        };

        // Save to Firestore
        await addDoc(collection(db, "customers"), customerData);

        alert("✅ कस्टमर सफलतापूर्वक रजिस्टर हो गया!");
        window.location.href = "customer-list.html";

    } catch (err) {
        console.error("Submission Error:", err);
        alert("❌ Error: " + err.message);
        
        submitBtn.disabled = false;
        submitBtn.innerText = "Save Registration";
    }
});
