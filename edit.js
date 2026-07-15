import { db, storage } from "./firebase.js";
import { doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

const urlParams = new URLSearchParams(window.location.search);
const custId = urlParams.get('id');

// 1. डेटा लोड करने का फंक्शन
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
            document.getElementById("totalAmount").value = data.totalAmount || "";
            document.getElementById("emi").value = data.emi || "";
        }
    } catch (err) { console.error("Load Error:", err); }
}

// 2. अपडेट प्रोफाइल (Submit Handler)
const form = document.getElementById("editForm");
form.addEventListener("submit", async (e) => {
    e.preventDefault();

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
        loanDate: document.getElementById("loanDate").value,
        totalAmount: document.getElementById("totalAmount").value,
        emi: document.getElementById("emi").value
    };

    try {
        if (photoInput.files && photoInput.files[0]) {
            const storageRef = ref(storage, 'customers/' + custId);
            await uploadBytes(storageRef, photoInput.files[0]);
            updateData.customerPhoto = await getDownloadURL(storageRef);
        }

        await updateDoc(doc(db, "customers", custId), updateData);
        alert("✅ प्रोफाइल अपडेट हो गई!");
        window.location.href = "customer-list.html"; 
    } catch (err) {
        alert("❌ एरर: " + err.message);
        updateBtn.innerText = "💾 Update Profile";
        updateBtn.disabled = false;
    }
});

// 3. डिलीट बटन का फंक्शन
document.getElementById("deleteBtn").addEventListener("click", async () => {
    if (confirm("⚠️ क्या आप वाकई इस कस्टमर को डिलीट करना चाहते हैं?")) {
        try {
            await deleteDoc(doc(db, "customers", custId));
            alert("🗑️ कस्टमर डिलीट हो गया!");
            window.location.href = "customer-list.html";
        } catch (err) { alert("❌ एरर: " + err.message); }
    }
});

loadCustomerData();
