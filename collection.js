// ==========================================
// 🚀 GDA FINANCE - DAILY COLLECTION ENGINE (FIXED MAP & PENALTY)
// ==========================================

import { db } from "./firebase.js"; 
import { collection, getDocs, doc, getDoc, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

// 🧼 Helper function to normalize GDA ID string formatting (e.g., GDA1 -> GDA001)
function normalizeGdaId(idStr) {
    if (!idStr) return "";
    const clean = idStr.toString().trim().toUpperCase();
    const match = clean.match(/^GDA\s*0*(\d+)$/);
    if (match) {
        return "GDA" + match[1].padStart(3, '0');
    }
    return clean;
}

window.addEventListener('DOMContentLoaded', async () => {
    const customerSelect = document.getElementById("customerSelect");
    const customerDetailsBox = document.getElementById("customerDetailsBox");
    const txtEmi = document.getElementById("txtEmi");
    const txtRemaining = document.getElementById("txtRemaining");
    const txtPaidDays = document.getElementById("txtPaidDays");
    const collectAmount = document.getElementById("collectAmount");
    const collectionDate = document.getElementById("collectionDate");
    const submitCollectionBtn = document.getElementById("submitCollectionBtn"); 

    // 🇮🇳 Timezone Synchronizer (IST) - YYYY-MM-DD
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    if (collectionDate) { 
        collectionDate.value = todayIST; 
    }

    // Extract Parameters safely from URL bounds
    const urlParams = new URLSearchParams(window.location.search);
    const urlCustId = urlParams.get('id'); 
    
    let allCustomers = {}; 
    let internalMappingTable = {}; // Maps customerCode back to Firestore document ID

    // 🧮 Live Calculation Stream & Penalty Matrix Engine
    function showCustomerDetails(docId) {
        const cust = allCustomers[docId];
        if (!cust) return;

        const baseLoan = Number(cust.loanAmount || 0);
        // Fallback checks for historical calculations compatibility
        const totalCollected = Number(cust.totalCollected || cust.paidAmount || 0);
        const totalPayableWithInterest = baseLoan + (baseLoan * 0.20);
        const dynamicRemaining = totalPayableWithInterest - totalCollected;
        const emi = Number(cust.dailyEmi || cust.emi || 0);

        let gapDays = 0;
        let penaltyAmount = 0;

        if (cust.loanDate && cust.loanDate < todayIST) {
            const date1 = new Date(todayIST);
            const date2 = new Date(cust.loanDate);
            const diffTime = date1 - date2;
            let totalDaysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            if (totalDaysPassed < 0) totalDaysPassed = 0;

            const paidDaysCount = Number(cust.paidDays || 0);
            gapDays = totalDaysPassed - paidDaysCount;
            if (gapDays < 0) gapDays = 0;

            // Strict Penalty Rule: Fine starts ONLY after 60 gap days
            if (gapDays > 60 && gapDays <= 80) {
                penaltyAmount = (gapDays - 60) * (emi * 0.10);
            } else if (gapDays > 80) {
                penaltyAmount = (20 * (emi * 0.10)) + ((gapDays - 80) * (emi * 0.15));
            }
        }

        const totalPayableNow = dynamicRemaining + penaltyAmount;

        if (txtEmi) txtEmi.textContent = `₹${emi}`;
        if (txtRemaining) {
            if (penaltyAmount > 0) {
                txtRemaining.innerHTML = `₹${Math.round(totalPayableNow)} <span style="font-size:12px; color:#d32f2f; display:block; margin-top:4px;">(Includes Penalty: ₹${Math.round(penaltyAmount)})</span>`;
            } else {
                txtRemaining.textContent = `₹${Math.round(totalPayableNow)}`;
            }
        }
        if (txtPaidDays) txtPaidDays.textContent = `${cust.paidDays || 0} Days`;
        if (collectAmount) collectAmount.value = emi || "";
        if (customerDetailsBox) customerDetailsBox.style.display = "block";
    }

    // 3. Dropdown Stream Aggregator Pipeline with Smart Lookup Sync
    async function loadCustomersDropdown() {
        try {
            const querySnapshot = await getDocs(collection(db, "customers"));
            customerSelect.innerHTML = '<option value="" disabled selected>--- Select Customer ---</option>';
            
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.status !== "Closed") {
                    const docId = docSnap.id;
                    allCustomers[docId] = data;

                    // Store normalizations to capture old variations (GDA1 / GDA001)
                    const cleanCode = normalizeGdaId(data.customerCode);
                    if (cleanCode) {
                        internalMappingTable[cleanCode] = docId;
                    }
                    internalMappingTable[normalizeGdaId(docId)] = docId;

                    const option = document.createElement("option");
                    option.value = docId;
                    option.textContent = `${data.name} (${data.customerCode || 'GDA'})`;
                    customerSelect.appendChild(option);
                }
            });

            // Smart Identification Routing from URL Parameters
            if (urlCustId) {
                const normalizedUrlId = normalizeGdaId(urlCustId);
                // Lookup mapped key from the tracking hash table
                const resolvedDocId = internalMappingTable[normalizedUrlId] || urlCustId;
                
                if (allCustomers[resolvedDocId]) {
                    customerSelect.value = resolvedDocId;
                    showCustomerDetails(resolvedDocId);
                }
            }
        } catch (err) {
            console.error("Data pipeline processing failure: ", err);
            customerSelect.innerHTML = '<option value="" disabled>⚠️ Error loading customer lists.</option>';
        }
    }

    if (customerSelect) {
        customerSelect.onchange = (e) => {
            showCustomerDetails(e.target.value);
        };
    }

    // 4. Collection Entry Submission Pipeline Module
    if (submitCollectionBtn) {
        submitCollectionBtn.onclick = async (e) => {
            e.preventDefault();
            const selectedId = customerSelect.value;
            const amount = Number(collectAmount.value);
            let finalDateStr = todayIST;

            if (collectionDate && collectionDate.value) {
                finalDateStr = collectionDate.value;
            }

            if (!selectedId) {
                alert("⚠️ Please select a valid customer first!");
                return;
            }
            if (!amount || amount <= 0) {
                alert("⚠️ Please enter a valid installment amount!");
                return;
            }

            try {
                submitCollectionBtn.disabled = true;
                submitCollectionBtn.innerText = "⏳ Submitting Installment...";

                const targetCustomerData = allCustomers[selectedId];

                // A. Add Ledger Payment log record entry string
                await addDoc(collection(db, "collections"), {
                    customerId: selectedId,
                    customerCode: targetCustomerData.customerCode || "",
                    customerName: targetCustomerData.name || "",
                    amount: amount,
                    date: finalDateStr,
                    note: "EMI Received",
                    timestamp: new Date()
                });

                // B. Sync Ledger Balance values directly inside Master Document
                const custDocRef = doc(db, "customers", selectedId);
                const custSnap = await getDoc(custDocRef);

                if (custSnap.exists()) {
                    const custData = custSnap.data();
                    
                    const oldCollected = Number(custData.totalCollected || custData.paidAmount || 0);
                    const newTotalCollected = oldCollected + amount;
                    const newPaidDays = Number(custData.paidDays || 0) + 1;
                    
                    const baseLoan = Number(custData.loanAmount || 0);
                    const totalPayable = baseLoan + (baseLoan * 0.20);
                    const newRemaining = totalPayable - newTotalCollected;

                    let updatePayload = {
                        totalCollected: newTotalCollected,
                        paidAmount: newTotalCollected, // Sync old scheme mapping field
                        remainingAmount: newRemaining >= 0 ? newRemaining : 0,
                        paidDays: newPaidDays
                    };

                    if (updatePayload.remainingAmount <= 0) {
                        updatePayload.status = "Closed";
                    }

                    await updateDoc(custDocRef, updatePayload);
                }

                alert("🎉 Installment synchronized and verified successfully!");
                window.location.href = "customer-list.html";

            } catch (err) {
                console.error("Transaction commit failed: ", err);
                alert("⚠️ Technical exception encountered during submission pipeline.");
                submitCollectionBtn.disabled = false;
                submitCollectionBtn.innerText = "💸 Submit Installment";
            }
        };
    }

    await loadCustomersDropdown();
});
