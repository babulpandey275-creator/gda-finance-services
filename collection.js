// ==========================================================
// 🚀 GDA FINANCE - DAILY COLLECTION ENGINE (FINAL VERSION)
// ==========================================================

import { db } from "./firebase.js"; 
import { collection, getDocs, doc, getDoc, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    const customerSelect = document.getElementById("customerSelect");
    const collectAmount = document.getElementById("collectAmount");
    const collectionDate = document.getElementById("collectionDate");
    const submitCollectionBtn = document.getElementById("submitCollectionBtn");
    
    // HTML Elements for Dynamic Info
    const detailsBox = document.getElementById("customerDetailsBox");
    const txtEmi = document.getElementById("txtEmi");
    const txtRemaining = document.getElementById("txtRemaining");
    const txtPaidDays = document.getElementById("txtPaidDays");

    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    if (collectionDate) collectionDate.value = todayIST;

    // 1. लोड कस्टमर ड्रॉपडाउन
    async function loadCustomersDropdown() {
        try {
            const querySnapshot = await getDocs(collection(db, "customers"));
            customerSelect.innerHTML = '<option value="" disabled selected>--- Select Customer ---</option>';
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.status !== "Closed") {
                    const option = document.createElement("option");
                    option.value = docSnap.id;
                    option.textContent = `${data.name} (${data.customerCode || 'GDA'})`;
                    customerSelect.appendChild(option);
                }
            });
        } catch (err) {
            console.error("Error loading customers:", err);
        }
    }

    // 2. कस्टमर चुनने पर डेटा लोड करना
    customerSelect.addEventListener('change', async (e) => {
        const selectedId = e.target.value;
        if (!selectedId) return;

        try {
            const custDoc = await getDoc(doc(db, "customers", selectedId));
            if (custDoc.exists()) {
                const data = custDoc.data();
                
                // डेटा कैलकुलेशन
                const dailyEmi = Number(data.dailyEmi || data.emi || 0);
                const totalLoan = Number(data.totalLoanAmount || 0);
                const totalCollected = Number(data.totalCollected || data.paidAmount || 0);
                const remaining = totalLoan - totalCollected;
                const paidDays = Number(data.paidDays || 0);

                // UI Update
                collectAmount.value = dailyEmi;
                txtEmi.innerText = `₹${dailyEmi}`;
                txtRemaining.innerText = `₹${totalLoan} / ₹${remaining}`;
                txtPaidDays.innerText = `${paidDays} Days`;
                
                // Box Show करें
                detailsBox.style.display = "block";
            }
        } catch (err) {
            console.error("Data fetch error:", err);
        }
    });

    // 3. सबमिट कलेक्शन
    if (submitCollectionBtn) {
        submitCollectionBtn.onclick = async () => {
            const selectedId = customerSelect.value;
            const amount = Number(collectAmount.value);
            const date = collectionDate.value;

            if (!selectedId || !amount || amount <= 0) {
                alert("⚠️ कृपया सही जानकारी भरें!");
                return;
            }

            try {
                submitCollectionBtn.disabled = true;
                
                // कलेक्शन लॉग में एंट्री
                await addDoc(collection(db, "collections"), {
                    customerId: selectedId,
                    amount: amount,
                    date: date,
                    note: "EMI Received",
                    timestamp: new Date()
                });

                // कस्टमर मास्टर डेटा अपडेट
                const custRef = doc(db, "customers", selectedId);
                const snap = await getDoc(custRef);
                const data = snap.data();
                
                await updateDoc(custRef, {
                    totalCollected: Number(data.totalCollected || 0) + amount,
                    paidAmount: Number(data.totalCollected || 0) + amount, // पुराने सपोर्ट के लिए
                    paidDays: Number(data.paidDays || 0) + 1
                });

                alert("✅ पैसा सफलतापूर्वक जमा हो गया!");
                window.location.href = "customer-list.html";
            } catch (err) {
                alert("⚠️ Error: " + err.message);
                submitCollectionBtn.disabled = false;
            }
        };
    }

    // सबसे पहले ड्रॉपडाउन लोड करें
    await loadCustomersDropdown();
    
    // URL ID Auto-fill
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('id');
    if (idFromUrl) {
        customerSelect.value = idFromUrl;
        customerSelect.dispatchEvent(new Event('change'));
    }
});
