import { db } from "./firebase.js"; 
import { collection, addDoc, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get('id'); 
const loanAmountInput = document.getElementById("loanAmount");
const loanPlanSelect = document.getElementById("loanPlan");
const totalAmountInput = document.getElementById("totalAmount");
const emiInput = document.getElementById("emi");

// कैलकुलेशन फंक्शन (20% ब्याज)
function calculateLoan() {
    const amt = parseFloat(loanAmountInput.value) || 0;
    const days = parseInt(loanPlanSelect.value) || 60;
    const total = amt + (amt * 0.20);
    totalAmountInput.value = total;
    emiInput.value = (total / days).toFixed(2);
}

loanAmountInput.addEventListener('input', calculateLoan);
loanPlanSelect.addEventListener('change', calculateLoan);

// अगर Edit ID मौजूद है, तो डेटा लोड करें
if (editId) {
    document.getElementById("formTitle").innerText = "Edit Customer Profile";
    document.getElementById("regBtn").innerText = "Update Registration";
    
    async function loadData() {
        const docSnap = await getDoc(doc(db, "customers", editId));
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById("customerName").value = data.name || "";
            document.getElementById("mobileNumber").value = data.mobile || "";
            document.getElementById("address").value = data.address || "";
            document.getElementById("panNumber").value = data.panCard || "";
            document.getElementById("loanAmount").value = data.loanAmount || "";
            document.getElementById("loanPlan").value = data.planDuration || "60";
            document.getElementById("loanDate").value = data.loanDate || "";
            calculateLoan();
        }
    }
    loadData();
}

// फॉर्म सबमिट लॉजिक
document.getElementById("regForm").onsubmit = async (e) => {
    e.preventDefault();
    const data = {
        name: document.getElementById("customerName").value,
        mobile: document.getElementById("mobileNumber").value,
        address: document.getElementById("address").value,
        panCard: document.getElementById("panNumber").value.toUpperCase(),
        loanAmount: Number(loanAmountInput.value),
        planDuration: Number(loanPlanSelect.value),
        totalAmountToPay: Number(totalAmountInput.value),
        dailyEmi: Number(emiInput.value),
        loanDate: document.getElementById("loanDate").value
    };

    try {
        if (editId) {
            await updateDoc(doc(db, "customers", editId), data);
            alert("✅ Record Updated Successfully!");
        } else {
            data.createdAt = new Date().toISOString();
            await addDoc(collection(db, "customers"), data);
            alert("🎉 Registered Successfully!");
        }
        window.location.href = "customers.html";
    } catch (err) {
        alert("⚠️ Error: " + err.message);
    }
};
