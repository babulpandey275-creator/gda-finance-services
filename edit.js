import { db } from "./firebase.js";
import { doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// URL से कस्टमर की ID निकालें
const urlParams = new URLSearchParams(window.location.search);
const custId = urlParams.get('id');

const editForm = document.getElementById("editForm");

// 1. डेटा लोड करें (जब पेज खुले)
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
    } catch (err) {
        console.error("डेटा लोड करने में समस्या:", err);
    }
}

// 2. अपडेट करने का फंक्शन (Update बटन दबाने पर)
editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        await updateDoc(doc(db, "customers", custId), {
            name: document.getElementById("customerName").value,
            mobile: document.getElementById("mobileNumber").value,
            address: document.getElementById("address").value,
            panNumber: document.getElementById("panNumber").value,
            loanAmount: document.getElementById("loanAmount").value,
            loanPlan: document.getElementById("loanPlan").value,
            totalAmount: document.getElementById("totalAmount").value,
            emi: document.getElementById("emi").value,
            loanDate: document.getElementById("loanDate").value
        });
        alert("✅ कस्टमर डिटेल्स अपडेट हो गई!");
        window.location.href = "index.html"; // अपडेट के बाद डैशबोर्ड पर भेजें
    } catch (err) {
        alert("❌ एरर: " + err.message);
    }
});

// 3. डिलीट करने का फंक्शन (Delete बटन दबाने पर)
document.getElementById("deleteBtn").addEventListener("click", async () => {
    if (confirm("⚠️ क्या आप वाकई इस कस्टमर को डिलीट करना चाहते हैं?")) {
        try {
            await deleteDoc(doc(db, "customers", custId));
            alert("✅ कस्टमर डिलीट हो गया!");
            window.location.href = "index.html"; // डिलीट के बाद डैशबोर्ड पर भेजें
        } catch (err) {
            alert("❌ एरर: " + err.message);
        }
    }
});

// पेज लोड होते ही डेटा लोड करें
loadCustomerData();
