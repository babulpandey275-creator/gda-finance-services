import { db } from "./firebase.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const IMGBB_API_KEY = "5230b9fc28c784e9c389bcf09cb56dd2";
const urlParams = new URLSearchParams(window.location.search);
const custId = urlParams.get("id");

const form = document.getElementById("editForm");
const photoInput = document.getElementById("customerPhoto");
const photoPreview = document.getElementById("photoPreview");
const updateBtn = document.getElementById("updateBtn");

// इनपुट एलिमेंट्स
const loanAmount = document.getElementById("loanAmount");
const loanPlan = document.getElementById("loanPlan");
const totalAmount = document.getElementById("totalAmount");
const emi = document.getElementById("emi");

// कैलकुलेशन फंक्शन: यह 15000 का 18000 और EMI कैलकुलेट करेगा
function calculateValues() {
    const principal = Number(loanAmount.value) || 0;
    const duration = Number(loanPlan.value) || 60;
    
    // आपका लॉजिक: 20% ब्याज (15000 + 3000 = 18000)
    const total = principal + (principal * 0.20); 
    const dailyEmi = duration > 0 ? Math.round(total / duration) : 0;

    totalAmount.value = total;
    emi.value = dailyEmi;
}

// इवेंट लिसनर्स: अमाउंट बदलते ही नीचे का नंबर बदल जाएगा
loanAmount.addEventListener("input", calculateValues);
loanPlan.addEventListener("change", calculateValues);

// 1. डेटा लोड करें
async function loadCustomerData() {
    if (!custId) return;
    try {
        const docSnap = await getDoc(doc(db, "customers", custId));
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById("customerName").value = data.name || "";
            document.getElementById("mobileNumber").value = data.mobile || "";
            document.getElementById("address").value = data.address || "";
            document.getElementById("panNumber").value = data.panCard || "";
            
            // लोन की पुरानी वैल्यूज भरें
            loanAmount.value = data.loanAmount || "";
            loanPlan.value = data.planDuration || "60";
            document.getElementById("loanDate").value = data.loanDate || "";
            
            // डेटा आते ही कैलकुलेशन चलाएं
            calculateValues(); 
            
            if (data.photoUrl) {
                photoPreview.src = data.photoUrl;
            }
        }
    } catch (err) {
        console.error("Error loading data:", err);
    }
}

// 2. नई फोटो चुनने पर प्रिव्यू
photoInput.addEventListener("change", function() {
    if (this.files && this.files[0]) {
        photoPreview.src = URL.createObjectURL(this.files[0]);
    }
});

// ImgBB Upload
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

// 3. Update Profile
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    updateBtn.disabled = true;
    updateBtn.innerText = "Updating...";

    try {
        let photoUrl = photoPreview.src;
        if (photoInput.files.length > 0) {
            photoUrl = await uploadToImgBB(photoInput.files[0]);
        }

        const updateData = {
            name: document.getElementById("customerName").value.trim(),
            mobile: document.getElementById("mobileNumber").value.trim(),
            address: document.getElementById("address").value.trim(),
            panCard: document.getElementById("panNumber").value.toUpperCase().trim(),
            loanAmount: Number(loanAmount.value),
            planDuration: Number(loanPlan.value),
            totalPayable: Number(totalAmount.value), // सही फील्ड में सेव करें
            dailyEmi: Number(emi.value),             // सही फील्ड में सेव करें
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

// पेज लोड होते ही डेटा भरें
loadCustomerData();
