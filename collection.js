// ==========================================================
// 🚀 GDA FINANCE - DAILY COLLECTION ENGINE
// ==========================================================

import { db } from "./firebase.js"; 
import { collection, getDocs, doc, getDoc, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    const customerSelect = document.getElementById("customerSelect");
    const collectAmount = document.getElementById("collectAmount");
    const collectionDate = document.getElementById("collectionDate");
    const submitCollectionBtn = document.getElementById("submitCollectionBtn");
    
    // UI Elements
    const detailsBox = document.getElementById("customerDetailsBox");
    const txtEmi = document.getElementById("txtEmi");
    const txtRemaining = document.getElementById("txtRemaining");
    const txtPaidDays = document.getElementById("txtPaidDays");

    // आज की तारीख का सही फॉर्मेट सेट करना
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
                
                const dailyEmi = Number(data.dailyEmi || 0);
                const totalTarget = Number(data.totalCollection || 0);
                const collectedSoFar = Number(data.totalCollected || 0);
                
                const remaining = Math.max(0, totalTarget - collectedSoFar);
                const paidDays = Number(data.paidDays || 0);

                // UI Update
                collectAmount.value = dailyEmi;
                txtEmi.innerText = `₹${dailyEmi}`;
                txtRemaining.innerText = `₹${collectedSoFar} / ₹${totalTarget}`;
                txtPaidDays.innerText = `${paidDays} Days`;
                
                detailsBox.style.display = "block";
            }
        } catch (err) {
            console.error("Data fetch error:", err);
        }
    });

    // 3. सबमिट कलेक्शन (सटीक अपडेट)
    if (submitCollectionBtn) {
        submitCollectionBtn.onclick = async () => {
            const selectedId = customerSelect.value;
            const amount = Number(collectAmount.value);
            // डेट फॉर्मेट को सुरक्षित किया गया ताकि यह YYYY-MM-DD में ही रहे
            const date = new Date(collectionDate.value).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

            if (!selectedId || !amount || amount <= 0) {
                alert("⚠️ कृपया सही जानकारी भरें!");
                return;
            }

            try {
                submitCollectionBtn.disabled = true;
                submitCollectionBtn.innerText = "⏳ Saving...";
                
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
                    paidDays: Number(data.paidDays || 0) + 1
                });

                alert("✅ पैसा सफलतापूर्वक जमा हो गया!");
                window.location.href = "customer-list.html";
            } catch (err) {
                alert("⚠️ Error: " + err.message);
                submitCollectionBtn.disabled = false;
                submitCollectionBtn.innerText = "Submit Collection";
            }
        };
    }

    // इनिशियलाइज़
    await loadCustomersDropdown();
    
    // URL ID Auto-fill
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('id');
    if (idFromUrl) {
        customerSelect.value = idFromUrl;
        customerSelect.dispatchEvent(new Event('change'));
    }
});
