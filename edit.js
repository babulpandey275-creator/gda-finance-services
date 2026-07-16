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

// कैलकुलेशन फंक्शन
function calculateValues() {
    const principal = Number(loanAmount.value) || 0;
    const duration = Number(loanPlan.value) || 60;
    
    // यहाँ अपनी ब्याज दर सेट करें (जैसे 20% है तो 0.20)
    const interest = principal * 0.20; 
    const total = principal + interest;
    const dailyEmi = duration > 0 ? Math.round(total / duration) : 0;

    totalAmount.value = total;
    emi.value = dailyEmi;
}

// इवेंट लिसनर्स
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
            loanAmount.value = data.loanAmount || "";
            loanPlan.value = data.planDuration || "60";
            document.getElementById("loanDate").value = data.loanDate || "";
            
            // डेटा लोड होने के बाद कैलकुलेशन चलाएं
            calculateValues(); 
            
            if (data.photoUrl) {
                photoPreview.src = data.photoUrl;
            }
        }
    } catch (err) {
        console.error("Error loading data:", err);
    }
}

// ... (बाकी आपका फोटो और सबमिट लॉजिक वही रहेगा)

// 3. Update Profile (सुधार: यहाँ totalAmount और emi भी डेटाबेस में भेजें)
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
            totalPayable: Number(totalAmount.value), // यह डेटाबेस में जोड़ें
            dailyEmi: Number(emi.value),             // यह डेटाबेस में जोड़ें
            updatedAt: new Date().toISOString()
        };

        if (photoUrl) updateData.photoUrl = photoUrl;

        await updateDoc(doc(db, "customers", custId), updateData);
        alert("✅ कस्टमर डेटा अपडेट हो गया!");
        window.location.href = "customer-list.html";
    } catch (err) {
        alert("❌ Error: " + err.message);
        updateBtn.disabled = false;
        updateBtn.innerText = "Update Profile";
    }
});

loadCustomerData();
