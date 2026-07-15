import { db } from "./firebase.js"; 
import { collection, addDoc, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get('id'); 

// HTML IDs को वेरिएबल में लिया
const loanAmountInput = document.getElementById("loanAmount");
const loanPlanSelect = document.getElementById("loanPlan");
const totalAmountInput = document.getElementById("totalPayable"); // आपके HTML में ये ID है
const emiInput = document.getElementById("dailyCollection"); // आपके HTML में ये ID है
const saveBtn = document.getElementById("regBtn");

// कैलकुलेशन लॉजिक: 20% ब्याज जोड़ना
function calculateValues() {
    const principal = parseFloat(loanAmountInput.value) || 0;
    const days = parseInt(loanPlanSelect.value) || 60;
    
    if (principal > 0) {
        const total = principal + (principal * 0.20);
        totalAmountInput.value = total;
        emiInput.value = (total / days).toFixed(2);
    }
}

loanAmountInput.addEventListener('input', calculateValues);
loanPlanSelect.addEventListener('change', calculateValues);

// Edit Mode: डेटा लोड करना
if (editId) {
    // फॉर्म टाइटल बदलें
    const formTitle = document.querySelector(".card h3");
    if(formTitle) formTitle.innerText = "Edit Customer Details";
    
    loadExistingData(editId);
}

async function loadExistingData(id) {
    try {
        const docSnap = await getDoc(doc(db, "customers", id));
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById("customerName").value = data.name || "";
            document.getElementById("mobile").value = data.mobile || "";
            document.getElementById("address").value = data.address || "";
            // Aadhaar को रेडाक्टेड ही रखें
            document.getElementById("aadhaar").value = "[Aadhaar Redacted]"; 
            loanAmountInput.value = data.loanAmount || "";
            loanPlanSelect.value = data.planDuration || "60";
            document.getElementById("loanDate").value = data.loanDate || "";
            
            calculateValues();
        }
    } catch (err) {
        console.error("Error loading data:", err);
    }
}

// फॉर्म सबमिट लॉजिक
document.getElementById("regForm").onsubmit = async (e) => {
    e.preventDefault();
    saveBtn.disabled = true;
    saveBtn.innerText = "Saving...";

    const customerData = {
        name: document.getElementById("customerName").value.trim(),
        mobile: document.getElementById("mobile").value.trim(),
        address: document.getElementById("address").value.trim(),
        aadhaar: "[Aadhaar Redacted]", // सुरक्षित रखने के लिए
        loanAmount: Number(loanAmountInput.value),
        planDuration: Number(loanPlanSelect.value),
        totalPayable: Number(totalAmountInput.value),
        dailyCollection: Number(emiInput.value),
        loanDate: document.getElementById("loanDate").value
    };

    try {
        if (editId) {
            await updateDoc(doc(db, "customers", editId), customerData);
            alert("✅ Updated Successfully!");
        } else {
            customerData.createdAt = new Date().toISOString();
            await addDoc(collection(db, "customers"), customerData);
            alert("🎉 Registered Successfully!");
        }
        window.location.href = "customers.html";
    } catch (err) {
        alert("⚠️ Error: " + err.message);
        saveBtn.disabled = false;
        saveBtn.innerText = "💾 Save Registration";
    }
};
