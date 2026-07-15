import { db } from "./firebase.js"; 
import { doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const custId = urlParams.get('id');
    
    if (!custId) { 
        window.location.href = "customer-list.html"; 
        return; 
    }

    // एडमिन पासवर्ड सुरक्षा
    const adminPassword = prompt("🔐 Enter Admin Password:");
    if (adminPassword !== "GDA@2026") { 
        alert("❌ Denied!"); 
        window.location.href = "customer-list.html"; 
        return; 
    }

    const loanAmountInput = document.getElementById("loanAmount");
    const loanPlanInput = document.getElementById("loanPlan");
    const totalAmountInput = document.getElementById("totalAmount");
    const emiInput = document.getElementById("emi");

    // कैलकुलेशन फंक्शन (20% ब्याज के साथ)
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
    loanPlanInput.addEventListener("change", calculate);

    // कस्टमर डेटा लोड करना
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
            document.getElementById("loanPlan").value = cust.planDuration || "60";
            document.getElementById("loanDate").value = cust.loanDate || "";
            
            // आधार नंबर को सुरक्षित रखने के लिए रेडाक्टेड स्ट्रिंग दिखाएं
            document.getElementById("aadhaarNumber").value = "[Aadhaar Redacted]";
            
            calculate(); // लोड होते ही कैलकुलेशन अपडेट करें
        } catch (err) { 
            console.error("Error loading data:", err); 
        }
    }
    await loadCustomerData();

    // अपडेट फंक्शन
    document.getElementById("updateBtn").onclick = async (e) => {
        e.preventDefault();
        try {
            await updateDoc(doc(db, "customers", custId), {
                name: document.getElementById("customerName").value,
                mobile: document.getElementById("mobileNumber").value,
                address: document.getElementById("address").value,
                panCard: document.getElementById("panNumber").value,
                loanAmount: Number(loanAmountInput.value),
                planDuration: Number(loanPlanInput.value),
                totalAmountToPay: Number(totalAmountInput.value), // अपडेट में यह भी जोड़ें
                dailyEmi: Number(emiInput.value),
                loanDate: document.getElementById("loanDate").value
            });
            alert("✅ Record Updated Successfully!");
            window.location.href = "customer-list.html";
        } catch (err) { 
            alert("⚠️ Error: " + err.message); 
        }
    };

    // डिलीट फंक्शन
    document.getElementById("deleteBtn").onclick = async () => {
        if (confirm("🚨 क्या आप वाकई इस रिकॉर्ड को डिलीट करना चाहते हैं?")) {
            await deleteDoc(doc(db, "customers", custId));
            alert("🗑️ Record Deleted!");
            window.location.href = "customer-list.html";
        }
    };
});
