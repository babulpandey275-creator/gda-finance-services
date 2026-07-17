// ==========================================================
// 🚀 GDA FINANCE - EDIT CUSTOMER (FIXED: NO LOGOUT ISSUE)
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

// =========================================================
// 1️⃣ कैलकुलेशन (Calculation) – वैसा ही (Same)
// =========================================================
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
// 2️⃣ फोटो प्रीव्यू (Photo Preview) – वैसा ही (Same)
// =========================================================
photoInput.addEventListener("change", function() {
    if (this.files && this.files[0]) {
        photoPreview.src = URL.createObjectURL(this.files[0]);
    }
});

// =========================================================
// 3️⃣ ImgBB अपलोड (Upload) – वैसा ही (Same)
// =========================================================
async function uploadToImgBB(file) {
    const formData = new FormData();
    formData.append("image", file);
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData
    });
    const result = await response.json();
    if (!result.success) throw new Error("Photo Upload Failed");
    return result.data.url;
}

// =========================================================
// 4️⃣ डेटा लोड (Load Data) और अपडेट (Update) – अब `onAuthStateChanged` के साथ
// =========================================================
auth.onAuthStateChanged(async (user) => {
    // 🔥 अगर यूज़र (User) लॉगिन (Login) नहीं है – तुरंत (Immediately) रीडायरेक्ट (Redirect)
    if (!user) {
        alert("❌ कृपया पहले लॉगिन करें!");
        window.location.href = "login.html";
        return;
    }

    // ✅ अगर URL में Customer ID नहीं है – वापस (Back) भेजें
    if (!custId) {
        alert("❌ Customer ID नहीं मिली!");
        window.location.href = "customer-list.html";
        return;
    }

    // ✅ डेटा लोड (Load) करें
    try {
        const docSnap = await getDoc(doc(db, "customers", custId));
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // 🔥 सारे (All) फील्ड्स (Fields) भरें – जिसमें Guardian और Aadhaar भी शामिल (Included) हैं
            document.getElementById("customerName").value = data.name || "";
            document.getElementById("mobileNumber").value = data.mobile || "";
            document.getElementById("guardianName").value = data.guardianName || "";
            document.getElementById("aadhaar").value = data.aadhaar || "";
            document.getElementById("address").value = data.address || "";
            document.getElementById("panNumber").value = data.panCard || "";
            
            loanAmount.value = data.loanAmount || "";
            loanPlan.value = data.planDuration || "60";
            document.getElementById("loanDate").value = data.loanDate || "";
            
            calculateValues(); // EMI कैलकुलेट (Calculate) करें
            
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
    // 5️⃣ फॉर्म सबमिट (Form Submit) – `GDA@2026` पासवर्ड (Password) के साथ
    // =========================================================
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // 🔐 Admin Password चेक (Check) – GDA@2026
        const pass = prompt("🔑 Update करने के लिए Admin Password डालें:");
        if (pass !== ADMIN_PASSWORD) {
            if (pass !== null) alert("❌ गलत पासवर्ड!");
            return;
        }

        updateBtn.disabled = true;
        updateBtn.innerText = "⏳ Updating...";

        try {
            let photoUrl = photoPreview.src;
            if (photoInput.files.length > 0) {
                photoUrl = await uploadToImgBB(photoInput.files[0]);
            }

            // 🔥 सारा (All) डेटा (Data) अपडेट (Update) – जिसमें Guardian और Aadhaar भी शामिल (Included) हैं
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

            if (photoUrl) updateData.photoUrl = photoUrl;

            await updateDoc(doc(db, "customers", custId), updateData);

            alert("✅ कस्टमर डेटा सफलतापूर्वक अपडेट हो गया!");
            window.location.href = "customer-list.html";

        } catch (err) {
            console.error(err);
            alert("❌ Error: " + err.message);
            updateBtn.disabled = false;
            updateBtn.innerText = "Update Profile";
        }
    });

});
