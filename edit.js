import { db, storage } from "./firebase.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

const urlParams = new URLSearchParams(window.location.search);
const custId = urlParams.get('id');

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
            document.getElementById("loanPlan").value = data.loanPlan || "60";
            document.getElementById("loanDate").value = data.loanDate || "";
        }
    } catch (err) { console.error("Load Error:", err); }
}

// 2. अपडेट प्रोफाइल (Submit Handler)
const form = document.getElementById("editForm");
form.addEventListener("submit", async (e) => {
    e.preventDefault(); // पेज रिफ्रेश होने से रोकता है

    const photoInput = document.getElementById("customerPhoto");
    const updateBtn = document.getElementById("updateBtn");
    
    updateBtn.innerText = "Updating...";
    updateBtn.disabled = true;

    let updateData = {
        name: document.getElementById("customerName").value,
        mobile: document.getElementById("mobileNumber").value,
        address: document.getElementById("address").value,
        panCard: document.getElementById("panNumber").value,
        loanAmount: document.getElementById("loanAmount").value,
        loanPlan: document.getElementById("loanPlan").value,
        loanDate: document.getElementById("loanDate").value
    };

    try {
        // फोटो अपलोड करें अगर चुनी गई है
        if (photoInput.files && photoInput.files[0]) {
            const file = photoInput.files[0];
            const storageRef = ref(storage, 'customers/' + custId);
            await uploadBytes(storageRef, file);
            updateData.customerPhoto = await getDownloadURL(storageRef);
        }

        // Firestore में डेटा अपडेट करें
        await updateDoc(doc(db, "customers", custId), updateData);
        
        alert("✅ प्रोफाइल सफलतापूर्वक अपडेट हो गई!");
        window.location.href = "index.html"; 
    } catch (err) {
        console.error("Update Error:", err);
        alert("❌ एरर: " + err.message);
        updateBtn.innerText = "💾 Update Profile";
        updateBtn.disabled = false;
    }
});

loadCustomerData();
