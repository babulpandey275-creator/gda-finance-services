import { db } from "./firebase.js"; 
import { doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const custId = urlParams.get('id');
    if (!custId) { window.location.href = "customer-list.html"; return; }

    const adminPassword = prompt("🔐 Enter Admin Password:");
    if (adminPassword !== "GDA@2026") { alert("❌ Denied!"); window.location.href = "customer-list.html"; return; }

    const manageDocsBtn = document.getElementById("manageDocsBtn");
    if (manageDocsBtn) manageDocsBtn.href = `documents.html?id=${custId}`;

    const loanAmountInput = document.getElementById("loanAmount");
    const loanPlanInput = document.getElementById("loanPlan");
    const totalAmountInput = document.getElementById("totalAmount");
    const emiInput = document.getElementById("emi");

    function calculate() {
        const amount = Number(loanAmountInput.value);
        const days = Number(loanPlanInput.value);
        if (amount > 0) {
            const total = amount * 1.20; 
            totalAmountInput.value = Math.round(total);
            if (days > 0) {
                emiInput.value = Math.round(total / days);
            }
        }
    }

    loanAmountInput.addEventListener("input", calculate);
    loanPlanInput.addEventListener("input", calculate);

    async function loadCustomerData() {
        try {
            const docSnap = await getDoc(doc(db, "customers", custId));
            if (!docSnap.exists()) return;
            const cust = docSnap.data();
            
            document.getElementById("customerName").value = cust.name || "";
            document.getElementById("mobileNumber").value = cust.mobile || "";
            document.getElementById("address").value = cust.address || "";
            document.getElementById("panNumber").value = cust.panCard || "";
            document.getElementById("loanAmount").value = cust.loanAmount || "";
            document.getElementById("loanPlan").value = cust.planDuration || "";
            document.getElementById("emi").value = cust.dailyEmi || "";
            document.getElementById("loanDate").value = cust.loanDate || "";
            document.getElementById("aadhaarNumber").value = "[Aadhaar Redacted]";
            
            calculate(); // लोड होते ही कैलकुलेशन ट्रिगर होगा
        } catch (err) { console.error(err); }
    }
    await loadCustomerData();

    document.getElementById("saveBtn").onclick = async (e) => {
        e.preventDefault();
        try {
            await updateDoc(doc(db, "customers", custId), {
                name: document.getElementById("customerName").value,
                mobile: document.getElementById("mobileNumber").value,
                address: document.getElementById("address").value,
                panCard: document.getElementById("panNumber").value,
                loanAmount: Number(loanAmountInput.value),
                planDuration: Number(loanPlanInput.value),
                dailyEmi: Number(emiInput.value),
                loanDate: document.getElementById("loanDate").value
            });
            alert("✅ Record Updated!");
            window.location.href = "customer-list.html";
        } catch (err) { alert("⚠️ Error: " + err.message); }
    };

    document.getElementById("deleteBtn").onclick = async () => {
        if (confirm("🚨 Permanent Delete?")) {
            await deleteDoc(doc(db, "customers", custId));
            window.location.href = "customer-list.html";
        }
    };
});
