import { db, storage } from "./firebase.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

const urlParams = new URLSearchParams(window.location.search);
const custId = urlParams.get('id');

// डेटा लोड करने वाला फंक्शन
async function loadCustomerData() {
    if (!custId) return;
    try {
        const docRef = doc(db, "customers", custId);
        const docSnap = await getDoc(docRef);

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
    } catch (err) {
        console.error("डेटा लोड एरर:", err);
    }
}

// अपडेट प्रोफाइल फंक्शन
document.getElementById("editForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const photoInput = document.getElementById("customerPhoto");
    
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
        // फोटो अपलोड लॉजिक
        if (photoInput.files && photoInput.files[0]) {
            const file = photoInput.files[0];
            const storageRef = ref(storage, 'customers/' + custId);
            await uploadBytes(storageRef, file);
            updateData.customerPhoto = await getDownloadURL(storageRef);
        }

        // डेटाबेस अपडेट
        await updateDoc(doc(db, "customers", custId), updateData);
        alert("✅ प्रोफाइल अपडेट हो गई!");
        window.location.href = "index.html";
    } catch (err) {
        alert("❌ एरर: " + err.message);
    }
});

loadCustomerData();
