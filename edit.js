import { db } from "./firebase.js"; 
import { doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const custId = urlParams.get('id');
    if (!custId) { window.location.href = "customers.html"; return; }

    const loanAmountInput = document.getElementById("loanAmount");
    const loanPlanInput = document.getElementById("loanPlan");
    const totalAmountInput = document.getElementById("totalAmount");
    const emiInput = document.getElementById("emi");

    // कैलकुलेशन फंक्शन
    function calculate() {
        const amount = parseFloat(loanAmountInput.value) || 0;
        const days = parseInt(loanPlanInput.value) || 60;
        const total = amount * 1.20; // 20% interest
        totalAmountInput.value = Math.round(total);
        emiInput.value = Math.round(total / days);
    }

    loanAmountInput.addEventListener("input", calculate);
    loanPlanInput.addEventListener("change", calculate);

    // 1. डेटा लोड करना
    const docSnap = await getDoc(doc(db, "customers", custId));
    if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById("customerName").value = data.name || "";
        document.getElementById("mobileNumber").value = data.mobile || "";
        document.getElementById("address").value = data.address || "";
        document.getElementById("panNumber").value = data.panCard || "";
        document.getElementById("loanAmount").value = data.loanAmount || "";
        document.getElementById("loanPlan").value = data.planDuration || "60";
        document.getElementById("loanDate").value = data.loanDate || "";
        calculate(); // लोड होते ही कैलकुलेट करें
    }

    // 2. अपडेट करना
    document.getElementById("editForm").onsubmit = async (e) => {
        e.preventDefault();
        try {
            await updateDoc(doc(db, "customers", custId), {
                name: document.getElementById("customerName").value,
                mobile: document.getElementById("mobileNumber").value,
                address: document.getElementById("address").value,
                panCard: document.getElementById("panNumber").value.toUpperCase(),
                loanAmount: Number(loanAmountInput.value),
                planDuration: Number(loanPlanInput.value),
                totalAmountToPay: Number(totalAmountInput.value),
                dailyEmi: Number(emiInput.value),
                loanDate: document.getElementById("loanDate").value
            });
            alert("✅ Record Updated!");
            window.location.href = "customers.html";
        } catch (err) { alert("⚠️ Error: " + err.message); }
    };

    // 3. डिलीट करना
    document.getElementById("deleteBtn").onclick = async () => {
        if (confirm("🚨 क्या आप वाकई डिलीट करना चाहते हैं?")) {
            await deleteDoc(doc(db, "customers", custId));
            window.location.href = "customers.html";
        }
    };
});
