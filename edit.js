import { db } from "./firebase.js"; 
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const custId = urlParams.get('id');

    if (!custId) {
        alert("ग्राहक ID नहीं मिली!");
        window.location.href = "customer-list.html";
        return;
    }

    const adminPassword = prompt("🔐 सुरक्षा Lock: ग्राहक का डेटा एडिट करने के लिए एडमिन पासवर्ड डालें:");
    if (adminPassword !== "GDA@2026") {
        alert("❌ गलत पासवर्ड!");
        window.location.href = "customer-list.html";
        return;
    }

    async function loadCustomerData() {
        try {
            const docSnap = await getDoc(doc(db, "customers", custId));
            if (!docSnap.exists()) {
                alert("ग्राहक रिकॉर्ड नहीं मिला!");
                window.location.href = "customer-list.html";
                return;
            }
            const cust = docSnap.data();
            if(document.getElementById("customerName")) document.getElementById("customerName").value = cust.name || "";
            if(document.getElementById("mobileNumber")) document.getElementById("mobileNumber").value = cust.mobile || "";
            if(document.getElementById("address")) document.getElementById("address").value = cust.address || "";
            if(document.getElementById("customerPhoto")) document.getElementById("customerPhoto").value = cust.customerPhoto || "";
            if(document.getElementById("aadhaarNumber")) document.getElementById("aadhaarNumber").value = cust.aadharCard || cust.aadhaar || "";
            if(document.getElementById("panNumber")) document.getElementById("panNumber").value = cust.panCard || "";
            if(document.getElementById("loanAmount")) document.getElementById("loanAmount").value = cust.loanAmount || "";
            if(document.getElementById("loanPlan")) document.getElementById("loanPlan").value = cust.planDuration || "";
            if(document.getElementById("emi")) document.getElementById("emi").value = cust.dailyEmi || cust.emi || "";
            if(document.getElementById("loanDate")) document.getElementById("loanDate").value = cust.loanDate || "";
        } catch (err) { alert("⚠️ डेटा लोड एरर।"); }
    }
    await loadCustomerData();

    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) {
        saveBtn.onclick = async (e) => {
            e.preventDefault();
            const name = document.getElementById("customerName").value.trim();
            const mobile = document.getElementById("mobileNumber").value.trim();
            const address = document.getElementById("address").value.trim();
            const photo = document.getElementById("customerPhoto").value.trim();
            const aadhaar = document.getElementById("aadhaarNumber").value.trim();
            const pan = document.getElementById("panNumber").value.trim().toUpperCase();
            const loanAmount = Number(document.getElementById("loanAmount").value);
            const planDuration = Number(document.getElementById("loanPlan").value);
            const emi = Number(document.getElementById("emi").value);
            const loanDate = document.getElementById("loanDate").value;

            try {
                saveBtn.disabled = true;
                saveBtn.innerText = "⏳ अपडेट हो रहा है...";
                await updateDoc(doc(db, "customers", custId), {
                    name, mobile, address, customerPhoto: photo || null, aadharCard: aadhaar, aadhaar, panCard: pan,
                    loanAmount, planDuration, duration: planDuration, dailyEmi: emi, emi, totalCollection: loanAmount + (loanAmount * 0.20), loanDate
                });
                alert("🎉 डेटा अपडेट हो गया!");
                window.location.href = "customer-list.html";
            } catch (error) {
                alert("⚠️ अपडेट एरर।");
                saveBtn.disabled = false;
                saveBtn.innerText = "💰 अपडेट सुरक्षित करें";
            }
        };
    }

    const deleteBtn = document.getElementById("deleteBtn");
    if (deleteBtn) {
        deleteBtn.onclick = async (e) => {
            e.preventDefault();
            if (!confirm("🚨 क्या आप वाकई इस ग्राहक को डिलीट करना चाहते हैं? हिस्ट्री साफ हो जाएगी!")) return;
            try {
                deleteBtn.disabled = true;
                const q = query(collection(db, "collections"), where("customerId", "==", custId));
                const querySnapshot = await getDocs(q);
                const deletePromises = [];
                querySnapshot.forEach((cDoc) => deletePromises.push(deleteDoc(doc(db, "collections", cDoc.id))));
                await Promise.all(deletePromises);
                await deleteDoc(doc(db, "customers", custId));
                alert("🎉 पूरी हिस्ट्री साफ कर दी गई है!");
                window.location.href = "customer-list.html";
            } catch (error) { alert("⚠️ डिलीट समस्या आई।"); }
        };
    }
});
