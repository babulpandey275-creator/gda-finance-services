// ==========================================
// 🚀 GDA FINANCE - DAILY COLLECTION ENGINE
// ==========================================

import { db } from "./firebase.js"; 
import { collection, getDocs, doc, getDoc, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

// 🧼 ID Normalizer
function normalizeGdaId(idStr) {
    if (!idStr) return "";
    const clean = idStr.toString().trim().toUpperCase();
    const match = clean.match(/^GDA\s*0*(\d+)$/);
    if (match) return "GDA" + match[1].padStart(3, '0');
    return clean;
}

window.addEventListener('DOMContentLoaded', async () => {
    const customerSelect = document.getElementById("customerSelect");
    const collectAmount = document.getElementById("collectAmount");
    const collectionDate = document.getElementById("collectionDate");
    const submitCollectionBtn = document.getElementById("submitCollectionBtn");

    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    if (collectionDate) collectionDate.value = todayIST;

    let allCustomers = {};

    // 1. लोड कस्टमर ड्रॉपडाउन
    async function loadCustomersDropdown() {
        try {
            const querySnapshot = await getDocs(collection(db, "customers"));
            customerSelect.innerHTML = '<option value="" disabled selected>--- Select Customer ---</option>';
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.status !== "Closed") {
                    allCustomers[docSnap.id] = data;
                    const option = document.createElement("option");
                    option.value = docSnap.id;
                    option.textContent = `${data.name} (${data.customerCode || 'GDA'})`;
                    customerSelect.appendChild(option);
                }
            });
        } catch (err) { console.error("Error:", err); }
    }

    // 2. सबमिट कलेक्शन (यह सबसे जरूरी है)
    if (submitCollectionBtn) {
        submitCollectionBtn.onclick = async (e) => {
            e.preventDefault();
            const selectedId = customerSelect.value;
            const amount = Number(collectAmount.value);
            const date = collectionDate.value || todayIST;

            if (!selectedId || !amount || amount <= 0) {
                alert("⚠️ कृपया सही जानकारी भरें!");
                return;
            }

            try {
                submitCollectionBtn.disabled = true;
                
                // A. कलेक्शन लॉग्स में एंट्री करें
                await addDoc(collection(db, "collections"), {
                    customerId: selectedId,
                    amount: amount,
                    date: date,
                    note: "EMI Received",
                    timestamp: new Date()
                });

                // B. कस्टमर का मास्टर डेटा अपडेट करें (Due Amount सही करने के लिए)
                const custDocRef = doc(db, "customers", selectedId);
                const custSnap = await getDoc(custDocRef);
                
                if (custSnap.exists()) {
                    const data = custSnap.data();
                    const oldCollected = Number(data.totalCollected || data.paidAmount || 0);
                    const newTotalCollected = oldCollected + amount;
                    const newPaidDays = Number(data.paidDays || 0) + 1;

                    await updateDoc(custDocRef, {
                        totalCollected: newTotalCollected,
                        paidAmount: newTotalCollected, // पुरानी स्कीम के लिए
                        paidDays: newPaidDays
                    });
                }

                alert("🎉 पैसा सफलतापूर्वक जमा हो गया!");
                window.location.href = "customer-list.html";
            } catch (err) {
                alert("⚠️ Error: " + err.message);
                submitCollectionBtn.disabled = false;
            }
        };
    }

    await loadCustomersDropdown();
});
