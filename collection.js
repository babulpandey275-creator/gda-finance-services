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
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    if (collectionDate) collectionDate.value = todayIST;

    // 1. कस्टमर ड्रॉपडाउन लोड करें
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

    // 2. कस्टमर चुनने पर उसका हिसाब (Paid Days/Amount) दिखाएं
    customerSelect.addEventListener('change', async (e) => {
        const selectedId = e.target.value;
        if (!selectedId) return;

        try {
            const custDoc = await getDoc(doc(db, "customers", selectedId));
            if (custDoc.exists()) {
                const data = custDoc.data();
                
                // EMI ऑटो-फिल
                collectAmount.value = Number(data.dailyEmi || data.emi || 0);

                // हिसाब-किताब के लिए Div बनाना
                let infoDiv = document.getElementById("customerAccountInfo");
                if (!infoDiv) {
                    infoDiv = document.createElement("div");
                    infoDiv.id = "customerAccountInfo";
                    infoDiv.style.marginTop = "15px";
                    infoDiv.style.padding = "12px";
                    infoDiv.style.background = "#f1f5f9";
                    infoDiv.style.borderRadius = "12px";
                    infoDiv.style.fontSize = "14px";
                    infoDiv.style.border = "1px solid #cbd5e1";
                    collectAmount.parentNode.insertBefore(infoDiv, collectAmount);
                }

                const totalLoan = Number(data.totalLoanAmount || 0);
                const totalCollected = Number(data.totalCollected || data.paidAmount || 0);
                const paidDays = Number(data.paidDays || 0);
                const remainingDue = totalLoan - totalCollected;

                infoDiv.innerHTML = `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <span>कुल जमा दिन:</span> <strong>${paidDays} दिन</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <span>कुल जमा राशि:</span> <strong style="color: #15803d;">₹${totalCollected}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>बाकी राशि:</span> <strong style="color: #b91c1c;">₹${remainingDue}</strong>
                    </div>
                `;
            }
        } catch (err) {
            console.error("Error fetching customer info:", err);
        }
    });

    // 3. सबमिट कलेक्शन (पैसा जमा करना)
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
                
                // कलेक्शन लॉग में एंट्री
                await addDoc(collection(db, "collections"), {
                    customerId: selectedId,
                    amount: amount,
                    date: date,
                    note: "EMI Received",
                    timestamp: new Date()
                });

                // कस्टमर मास्टर डेटा अपडेट
                const custDocRef = doc(db, "customers", selectedId);
                const custSnap = await getDoc(custDocRef);
                if (custSnap.exists()) {
                    const data = custSnap.data();
                    const newTotalCollected = Number(data.totalCollected || data.paidAmount || 0) + amount;
                    const newPaidDays = Number(data.paidDays || 0) + 1;
                    
                    await updateDoc(custDocRef, {
                        totalCollected: newTotalCollected,
                        paidAmount: newTotalCollected,
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

    // सबसे पहले ड्रॉपडाउन लोड करें
    await loadCustomersDropdown();

    // URL से ID पकड़कर नाम ऑटो-सेलेक्ट करें
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('id');
    if (idFromUrl) {
        customerSelect.value = idFromUrl;
        customerSelect.dispatchEvent(new Event('change')); // ताकि ऑटो-फिल और हिसाब तुरंत दिखे
    }
});
