import { db } from "./firebase.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const IMGBB_API_KEY = "5230b9fc28c784e9c389bcf09cb56dd2";
const urlParams = new URLSearchParams(window.location.search);
const custId = urlParams.get("id");

const form = document.getElementById("editForm");
const photoInput = document.getElementById("customerPhoto");
const photoPreview = document.getElementById("photoPreview"); // HTML में यह ID होनी चाहिए
const updateBtn = document.getElementById("updateBtn");

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
            document.getElementById("loanAmount").value = data.loanAmount || "";
            document.getElementById("loanPlan").value = data.planDuration || "";
            
            // पुरानी फोटो दिखाएं
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

// ImgBB Upload Function
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
        let photoUrl = "";
        // अगर नई फोटो चुनी गई है तो उसे अपलोड करें
        if (photoInput.files.length > 0) {
            photoUrl = await uploadToImgBB(photoInput.files[0]);
        }

        const updateData = {
            name: document.getElementById("customerName").value.trim(),
            mobile: document.getElementById("mobileNumber").value.trim(),
            address: document.getElementById("address").value.trim(),
            panCard: document.getElementById("panNumber").value.toUpperCase().trim(),
            loanAmount: Number(document.getElementById("loanAmount").value),
            planDuration: Number(document.getElementById("loanPlan").value),
            updatedAt: new Date().toISOString()
        };

        // अगर फोटो बदली है, तो नया लिंक जोड़ें
        if (photoUrl) {
            updateData.photoUrl = photoUrl;
        }

        await updateDoc(doc(db, "customers", custId), updateData);

        alert("✅ कस्टमर डेटा अपडेट हो गया!");
        window.location.href = "customer-list.html";
    } catch (err) {
        console.error(err);
        alert("❌ Error: " + err.message);
        updateBtn.disabled = false;
        updateBtn.innerText = "Update Customer";
    }
});

// पेज लोड होते ही डेटा भरें
loadCustomerData();
