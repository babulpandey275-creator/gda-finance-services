// ==========================================================
// 🚀 GDA FINANCE - EDIT ENGINE (FINAL VERSION)
// ==========================================================

import { db } from "./firebase.js"; 
import { doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const custId = urlParams.get('id');

    if (!custId) { window.location.href = "customer-list.html"; return; }

    // 1. Admin Security Gate
    const adminPassword = prompt("🔐 Enter Admin Password:");
    if (adminPassword !== "GDA@2026") { alert("❌ Denied!"); window.location.href = "customer-list.html"; return; }

    // 2. डॉक्यूमेंट पेज के लिए लिंक सेटअप करें
    const manageDocsBtn = document.getElementById("manageDocsBtn");
    if (manageDocsBtn) {
        manageDocsBtn.href = `documents.html?id=${custId}`;
    }

    // 3. डेटा लोड करना
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
            
            // आधार नंबर सुरक्षित (Redacted)
            document.getElementById("aadhaarNumber").value = "[Aadhaar Redacted]";
        } catch (err) { console.error(err); }
    }
    await loadCustomerData();

    // 4. सेव प्रोसेस
    const saveBtn = document.getElementById("saveBtn");
    saveBtn.onclick = async (e) => {
        e.preventDefault();
        saveBtn.disabled = true;
        saveBtn.innerText = "⏳ Saving...";

        try {
            const updatePayload = {
                name: document.getElementById("customerName").value,
                mobile: document.getElementById("mobileNumber").value,
                address: document.getElementById("address").value,
                panCard: document.getElementById("panNumber").value,
                loanAmount: Number(document.getElementById("loanAmount").value),
                planDuration: Number(document.getElementById("loanPlan").value),
                dailyEmi: Number(document.getElementById("emi").value),
                loanDate: document.getElementById("loanDate").value
            };
            
            await updateDoc(doc(db, "customers", custId), updatePayload);
            alert("✅ Record Updated!");
            window.location.href = "customer-list.html";
        } catch (error) {
            alert("⚠️ Error: " + error.message);
            saveBtn.disabled = false;
        }
    };

    // 5. डिलीट प्रोसेस
    document.getElementById("deleteBtn").onclick = async () => {
        if (!confirm("🚨 Permanent Delete?")) return;
        await deleteDoc(doc(db, "customers", custId));
        window.location.href = "customer-list.html";
    };
});
