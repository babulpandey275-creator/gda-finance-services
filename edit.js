// ==========================================================
// 🚀 GDA FINANCE - EDIT CUSTOMER (FIXED PHOTO UPLOAD)
// ==========================================================

import { db, auth } from "./firebase.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const IMGBB_API_KEY = "5230b9fc28c784e9c389bcf09cb56dd2";
const ADMIN_PASSWORD = "GDA@2026";
const urlParams = new URLSearchParams(window.location.search);
const custId = urlParams.get("id");

const form = document.getElementById("editForm");
const photoInput = document.getElementById("customerPhoto");
const photoPreview = document.getElementById("photoPreview");
const updateBtn = document.getElementById("updateBtn");

const loanAmount = document.getElementById("loanAmount");
const loanPlan = document.getElementById("loanPlan");
const totalAmount = document.getElementById("totalAmount");
const emi = document.getElementById("emi");

// कैलकुलेशन (Calculation)
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

// =========================================================
// 1️⃣ फोटो (Photo) – प्रीव्यू (Preview)
// =========================================================
photoInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            photoPreview.src = e.target.result;
        };
        reader.readAsDataURL(this.files[0]);
    }
});

// =========================================================
// 2️⃣ ImgBB – अपलोड (Upload) – फंक्शन (Function)
// =========================================================
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
        throw new Error("फोटो (Photo) अपलोड (Upload) – नहीं (Not) – हो (Be) – पाया (Able) – " + err.message);
    }
}

// =========================================================
// 3️⃣ लोड (Load) – और (And) – अपडेट (Update)
// =========================================================
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

    // ✅ डेटा (Data) – लोड (Load) – करें (Do)
    try {
        const docSnap = await getDoc(doc(db, "customers", custId));
        if (docSnap.exists()) {
            const data = docSnap.data();
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
            if (data.photoUrl) {
                photoPreview.src = data.photoUrl;
            }
        } else {
            alert("❌ कस्टमर नहीं मिला!");
            window.location.href = "customer-list.html";
        }
    } catch (err) {
        console.error("Error loading data:", err);
        alert("❌ डेटा लोड करने में गलती: " + err.message);
    }

    // =========================================================
    // 4️⃣ फॉर्म (Form) – सबमिट (Submit)
    // =========================================================
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // 🔐 Admin Password – चेक (Check)
        const pass = prompt("🔑 Update करने के लिए Admin Password डालें:");
        if (pass !== ADMIN_PASSWORD) {
            if (pass !== null) alert("❌ गलत पासवर्ड!");
            return;
        }

        updateBtn.disabled = true;
        updateBtn.innerText = "⏳ Updating...";

        try {
            let photoUrl = photoPreview.src;

            // 🔥 अगर (If) – नई (New) – फोटो (Photo) – चुनी (Selected) – है (Is)
            if (photoInput.files && photoInput.files.length > 0) {
                const file = photoInput.files[0];
                if (file.size > 20 * 1024 * 1024) {
                    throw new Error("फोटो (Photo) – 20MB – से (From) – बड़ी (Larger) – है (Is)! – कृपया (Please) – छोटी (Smaller) – फोटो (Photo) – चुनें (Select) – करें (Do)!");
                }
                photoUrl = await uploadToImgBB(file);
            }

            // ✅ डेटा (Data) – अपडेट (Update) – करें (Do)
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

            if (photoUrl) {
                updateData.photoUrl = photoUrl;
            }

            await updateDoc(doc(db, "customers", custId), updateData);

            alert("✅ कस्टमर (Customer) – डेटा (Data) – सफलतापूर्वक (Successfully) – अपडेट (Updated) – हो (Be) – गया (Has been) – है (Is)!");
            window.location.href = "customer-list.html";

        } catch (err) {
            console.error("Update Error:", err);
            alert("❌ एरर (Error): " + err.message);
            updateBtn.disabled = false;
            updateBtn.innerText = "🔄 Update Profile";
        }
    });

});
