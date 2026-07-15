import { db } from "./firebase.js"; 
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const loanAmountInput = document.getElementById("loanAmount");
const loanPlanSelect = document.getElementById("loanPlan");
const totalPayableInput = document.getElementById("totalPayable");
const dailyCollectionInput = document.getElementById("dailyCollection");
const photoInput = document.getElementById('customerPhoto');
const photoPreview = document.getElementById('photoPreview');

// कैलकुलेशन
function calculate() {
    const amt = parseFloat(loanAmountInput.value) || 0;
    const days = parseInt(loanPlanSelect.value) || 60;
    const total = amt + (amt * 0.20);
    totalPayableInput.value = Math.round(total);
    dailyCollectionInput.value = Math.round(total / days);
}

loanAmountInput.addEventListener('input', calculate);
loanPlanSelect.addEventListener('change', calculate);

// फोटो प्रिव्यू
photoInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        photoPreview.src = URL.createObjectURL(this.files[0]);
    }
});

// सबमिट
document.getElementById("regForm").onsubmit = async (e) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, "customers"), {
            name: document.getElementById("customerName").value,
            mobile: document.getElementById("mobile").value,
            aadhaar: "[Aadhaar Redacted]",
            panCard: document.getElementById("panNumber").value.toUpperCase(),
            loanAmount: Number(loanAmountInput.value),
            planDuration: Number(loanPlanSelect.value),
            totalPayable: Number(totalPayableInput.value),
            dailyCollection: Number(dailyCollectionInput.value),
            createdAt: new Date().toISOString()
        });
        alert("✅ Success!");
        window.location.href = "customers.html";
    } catch (err) { alert("Error: " + err.message); }
};
