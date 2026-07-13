import { db } from "./firebase.js"; 
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const custId = urlParams.get('id');

    if (!custId) {
        alert("Customer validation parameter not found!");
        window.location.href = "customer-list.html";
        return;
    }

    async function loadBondData() {
        try {
            const docSnap = await getDoc(doc(db, "customers", custId));
            if (!docSnap.exists()) {
                alert("No records available for this customer ledger profile!");
                window.location.href = "customer-list.html";
                return;
            }

            const cust = docSnap.data();

            // Mapping parameters cleanly into English fields
            if(document.getElementById("bondName")) document.getElementById("bondName").innerText = cust.name || "-";
            if(document.getElementById("bondId")) document.getElementById("bondId").innerText = cust.customerCode || "GDA" + custId.substring(0,4).toUpperCase();
            if(document.getElementById("bondMobile")) document.getElementById("bondMobile").innerText = cust.mobile || "-";
            if(document.getElementById("bondDate")) document.getElementById("bondDate").innerText = cust.loanDate || "-";
            
            // सुरक्षा अपडेट: संवेदनशील सरकारी आईडी को यहाँ हमेशा रेडैक्ट (Redact) करें
            if(document.getElementById("bondAadhar")) document.getElementById("bondAadhar").innerText = "[Aadhaar Redacted]";
            
            if(document.getElementById("bondPan")) document.getElementById("bondPan").innerText = cust.panCard || "-";
            if(document.getElementById("bondAddress")) document.getElementById("bondAddress").innerText = cust.address || "-";
            
            const loanAmount = Number(cust.loanAmount) || 0;
            if(document.getElementById("bondAmount")) document.getElementById("bondAmount").innerText = `₹${loanAmount}`;
            
            const rawDuration = cust.planDuration || cust.duration || "60";
            if(document.getElementById("bondPlan")) document.getElementById("bondPlan").innerText = `${rawDuration} Days`;
            
            const emi = Number(cust.dailyEmi || cust.emi || 0);
            if(document.getElementById("bondEmi")) document.getElementById("bondEmi").innerText = `₹${emi}`;
            
            const totalPayable = loanAmount + (loanAmount * 0.20);
            if(document.getElementById("bondTotalPayable")) document.getElementById("bondTotalPayable").innerText = `₹${Math.round(totalPayable)}`;

        } catch (error) {
            console.error("Bond Data Loading Core Exception: ", error);
            alert("⚠️ Error synchronizing system details.");
        }
    }

    const btnPrintBond = document.getElementById("btnPrintBond");
    if (btnPrintBond) {
        btnPrintBond.onclick = () => {
            window.print();
        };
    }

    await loadBondData();
});
