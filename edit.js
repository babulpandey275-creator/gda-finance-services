import { db, storage } from "./firebase.js";
import { doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

const urlParams = new URLSearchParams(window.location.search);
const custId = urlParams.get('id');
const editForm = document.getElementById("editForm");

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
            document.getElementById("panNumber").value = data.panNumber || "";
            document.getElementById("loanAmount").value = data.loanAmount || 0;
            document.getElementById("loanPlan").value = data.loanPlan || "60";
            document.getElementById("totalAmount").value = data.totalAmount || 0;
            document.getElementById("emi").value = data.emi || 0;
            document.getElementById("loanDate").value = data.loanDate || "";
        }
    } catch (err) { console.error("Error:", err); }
}

editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const photoInput = document.getElementById("customerPhoto");
    let updateData = {
        name: document.getElementById("customerName").value,
        mobile: document.getElementById("mobileNumber").value,
        address: document.getElementById("address").value,
        panNumber: document.getElementById("panNumber").value,
        loanAmount: document.getElementById("loanAmount").value,
        loanPlan: document.getElementById("loanPlan").value,
        totalAmount: document.getElementById("totalAmount").value,
        emi: document.getElementById("emi").value,
        loanDate: document.getElementById("loanDate").value
    };

    try {
        if (photoInput.files && photoInput.files[0]) {
            const file = photoInput.files[0];
            const storageRef = ref(storage, 'customers/' + custId);
            await uploadBytes(storageRef, file);
            const photoUrl = await getDownloadURL(storageRef);
            updateData.customerPhoto = photoUrl;
        }
        await updateDoc(doc(db, "customers", custId), updateData);
        alert("✅ डिटेल्स और फोटो अपडेट हो गई!");
        window.location.href = "index.html";
    } catch (err) { alert("❌ एरर: " + err.message); }
});

document.getElementById("deleteBtn").addEventListener("click", async () => {
    if (confirm("⚠️ क्या आप वाकई डिलीट करना चाहते हैं?")) {
        try {
            await deleteDoc(doc(db, "customers", custId));
            alert("✅ कस्टमर डिलीट हो गया!");
            window.location.href = "index.html";
        } catch (err) { alert("❌ एरर: " + err.message); }
    }
});

loadCustomerData();
