import { db } from "./firebase.js"; 
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const loanAmountInput = document.getElementById("loanAmount");
const loanPlanSelect = document.getElementById("loanPlan");
const totalPayableInput = document.getElementById("totalPayable");
const dailyCollectionInput = document.getElementById("dailyCollection");
const photoInput = document.getElementById('customerPhoto');
const photoPreview = document.getElementById('photoPreview');

// कैलकुलेशन फंक्शन
function calculate() {
    const amt = parseFloat(loanAmountInput.value) || 0;
    const days = parseInt(loanPlanSelect.value) || 60;
    const total = amt + (amt * 0.20); // 20% interest
    totalPayableInput.value = Math.round(total);
    dailyCollectionInput.value = Math.round(total / days);
}

// इवेंट लिसनर्स
loanAmountInput.addEventListener('input', calculate);
loanPlanSelect.addEventListener('change', calculate);

// फोटो प्रिव्यू
photoInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        photoPreview.src = URL.createObjectURL(this.files[0]);
    }
});

// फॉर्म सबमिट हैंडलर
document.getElementById("regForm").onsubmit = async (e) => {
    e.preventDefault();
    try {
        // Firebase में डेटा सेव करें
        await addDoc(collection(db, "customers"), {
            name: document.getElementById("customerName").value,
            mobile: document.getElementById("mobile").value,
            panCard: document.getElementById("panNumber").value.toUpperCase(),
            loanAmount: Number(loanAmountInput.value),
            planDuration: Number(loanPlanSelect.value),
            totalPayable: Number(totalPayableInput.value),
            dailyCollection: Number(dailyCollectionInput.value),
            
            // ये फील्ड्स customer-list.js के लिए जरूरी हैं
            status: "Active",
            loanDate: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString()
        });
        
        alert("✅ कस्टमर सफलतापूर्वक रजिस्टर हो गया!");
        
        // सीधे कस्टमर लिस्ट पेज पर भेजें
        window.location.href = "customer-list.html";
        
    } catch (err) { 
        alert("⚠️ एरर: " + err.message); 
    }
};
