import { db } from "./firebase.js"; 
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const loanAmountInput = document.getElementById("loanAmount");
const loanPlanInput = document.getElementById("loanPlan");
const emiInput = document.getElementById("emi");
const saveBtn = document.getElementById("regBtn");

// Auto-Calculate EMI (20% Interest)
function calculateEMI() {
    const amount = parseFloat(loanAmountInput.value);
    const days = parseInt(loanPlanInput.value);

    if (amount > 0 && days > 0) {
        const totalAmount = amount + (amount * 0.20); 
        emiInput.value = (totalAmount / days).toFixed(2);
    } else {
        emiInput.value = "";
    }
}

loanAmountInput.addEventListener('input', calculateEMI);
loanPlanInput.addEventListener('input', calculateEMI);

// Form Submission
document.getElementById("regForm").onsubmit = async (e) => {
    e.preventDefault();
    
    saveBtn.disabled = true;
    saveBtn.innerText = "⏳ Saving...";

    const newCustomerData = {
        name: document.getElementById("customerName").value.trim(),
        mobile: document.getElementById("mobileNumber").value.trim(),
        address: document.getElementById("address").value.trim(),
        aadhaarCard: "[Aadhaar Redacted]", // Security: Redacted
        panCard: document.getElementById("panNumber").value.trim().toUpperCase(),
        loanAmount: Number(loanAmountInput.value),
        planDuration: Number(loanPlanInput.value),
        dailyEmi: Number(emiInput.value),
        loanDate: document.getElementById("loanDate").value,
        status: "Active",
        createdAt: new Date().toISOString()
    };

    try {
        await addDoc(collection(db, "customers"), newCustomerData);
        alert("🎉 Registered Successfully!");
        window.location.href = "disbursement-bond.html";
    } catch (err) {
        console.error(err);
        alert("Error saving data: " + err.message);
        saveBtn.disabled = false;
        saveBtn.innerText = "💾 Save Registration";
    }
};
