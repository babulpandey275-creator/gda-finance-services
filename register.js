import { db } from "./firebase.js"; 
import { collection, addDoc, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get('id'); 
const loanAmountInput = document.getElementById("loanAmount");
const loanPlanSelect = document.getElementById("loanPlan");
const totalAmountInput = document.getElementById("totalAmount");
const emiInput = document.getElementById("emi");
const saveBtn = document.getElementById("regBtn");

// कैलकुलेशन लॉजिक: 20% ब्याज जोड़ना
function calculateValues() {
    const principal = parseFloat(loanAmountInput.value);
    const days = parseInt(loanPlanSelect.value);
    
    if (principal > 0) {
        const total = principal + (principal * 0.20);
        totalAmountInput.value = total;
        emiInput.value = (total / days).toFixed(2);
    }
}

loanAmountInput.addEventListener('input', calculateValues);
loanPlanSelect.addEventListener('change', calculateValues);

// Edit Mode के लिए डेटा लोड करना
if (editId) {
    document.getElementById("formTitle").innerText = "Edit Customer";
    loadExistingData(editId);
}

async function loadExistingData(id) {
    const docSnap = await getDoc(doc(db, "customers", id));
    if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById("customerName").value = data.name;
        document.getElementById("mobileNumber").value = data.mobile;
        document.getElementById("address").value = data.address;
        document.getElementById("aadhaarNumber").value = data.aadhaarCard !== "[Aadhaar Redacted]" ? data.aadhaarCard : "";
        document.getElementById("panNumber").value = data.panCard;
        loanAmountInput.value = data.loanAmount;
        loanPlanSelect.value = data.planDuration;
        totalAmountInput.value = data.totalAmountToPay;
        emiInput.value = data.dailyEmi;
        document.getElementById("loanDate").value = data.loanDate;
    }
}

// फॉर्म सबमिट करना
document.getElementById("regForm").onsubmit = async (e) => {
    e.preventDefault();
    saveBtn.disabled = true;
    saveBtn.innerText = "Saving...";

    const customerData = {
        name: document.getElementById("customerName").value.trim(),
        mobile: document.getElementById("mobileNumber").value.trim(),
        address: document.getElementById("address").value.trim(),
        aadhaarCard: document.getElementById("aadhaarNumber").value.trim() || "[Aadhaar Redacted]",
        panCard: document.getElementById("panNumber").value.trim().toUpperCase(),
        loanAmount: Number(loanAmountInput.value),
        planDuration: Number(loanPlanSelect.value),
        totalAmountToPay: Number(totalAmountInput.value),
        dailyEmi: Number(emiInput.value),
        loanDate: document.getElementById("loanDate").value
    };

    try {
        if (editId) {
            await updateDoc(doc(db, "customers", editId), customerData);
            alert("Updated Successfully!");
        } else {
            customerData.status = "Active";
            customerData.createdAt = new Date().toISOString();
            await addDoc(collection(db, "customers"), customerData);
            alert("Registered Successfully!");
        }
        window.location.href = "customers.html";
    } catch (err) {
        alert("Error: " + err.message);
        saveBtn.disabled = false;
        saveBtn.innerText = "Save Registration";
    }
};
