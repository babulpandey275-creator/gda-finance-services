// ==========================================
// 🚀 GDA FINANCE - CLEAN REGISTRATION CODE
// ==========================================

import { db } from "./firebase.js"; 
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    // ... (कैमरा और UI लॉजिक वही रखें जो पहले था)

    // 💾 SAVE ROUTINE WITH CLEAN PAYLOAD
    if (saveBtn) {
        saveBtn.onclick = async (e) => {
            e.preventDefault();
            
            const name = document.getElementById("customerName").value.trim();
            const mobile = document.getElementById("mobileNumber").value.trim();
            const address = document.getElementById("address").value.trim();

            if (!name || !mobile || !address || !loanAmountInput.value) {
                alert("Please fill out all mandatory fields.");
                return;
            }

            if (!capturedBlobUri) {
                alert("⚠️ Customer verification photo is mandatory!");
                return;
            }

            saveBtn.disabled = true;
            saveBtn.innerText = "⏳ Saving...";

            try {
                const idDetails = await generateNextGdaId();
                const loanAmount = Number(loanAmountInput.value);
                const planDuration = Number(loanPlanSelect.value) || 60;
                const emi = Number(emiInput.value);
                const totalLoanValue = loanAmount + (loanAmount * 0.20);

                // 🎯 CLEAN DATA OBJECT (No duplicates, No extra fields)
                const newCustomerData = {
                    name: name,
                    mobile: mobile,
                    address: address,
                    aadhaarCard: "[Aadhaar Redacted]", // Security: Redacted
                    panCard: document.getElementById("panNumber")?.value.trim().toUpperCase() || "",
                    loanAmount: loanAmount,
                    planDuration: planDuration,
                    dailyEmi: emi,
                    totalCollection: totalLoanValue,
                    remainingAmount: totalLoanValue,
                    paidAmount: 0,
                    paidDays: 0,
                    totalCollected: 0,
                    loanDate: document.getElementById("loanDate").value,
                    status: "Active",
                    customerCode: idDetails.member_id,
                    member_no: idDetails.member_no,
                    createdAt: new Date().toISOString(),
                    customerPhoto: capturedBlobUri 
                };

                const docRef = await addDoc(collection(db, "customers"), newCustomerData);

                if (streamInstance) streamInstance.getTracks().forEach(track => track.stop());

                alert(`🎉 Registered Successfully! ID: ${idDetails.member_id}`);
                window.location.href = `disbursement-bond.html?id=${docRef.id}`;
            } catch (err) {
                console.error(err);
                alert("Error: " + err.message);
                saveBtn.disabled = false;
                saveBtn.innerText = "💰 Disburse Loan & Save";
            }
        };
    }

    await startRearCamera();
});
