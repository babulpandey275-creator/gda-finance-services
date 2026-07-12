import { db } from "./firebase.js"; 
import { collection, getDocs, doc, getDoc, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => { 
    const customerSelect = document.getElementById("customerSelect"); 
    const customerDetailsBox = document.getElementById("customerDetailsBox"); 
    const txtEmi = document.getElementById("txtEmi"); 
    const txtRemaining = document.getElementById("txtRemaining"); 
    const txtPaidDays = document.getElementById("txtPaidDays"); 
    const collectAmount = document.getElementById("collectAmount"); 
    const collectionDate = document.getElementById("collectionDate"); 
    const submitCollectionBtn = document.getElementById("submitCollectionBtn"); 

    // 🇮🇳 Timezone Synchronizer (IST) - Format: YYYY-MM-DD
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const todayParts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date());
    const yyyy = todayParts.find(p => p.type === 'year').value;
    const mm = todayParts.find(p => p.type === 'month').value;
    const dd = todayParts.find(p => p.type === 'day').value;
    const todayIST = `${yyyy}-${mm}-${dd}`;

    if (collectionDate) { 
        collectionDate.value = todayIST; 
    } 

    // Extract Parameter Bounds from URL
    const urlParams = new URLSearchParams(window.location.search); 
    const urlCustId = urlParams.get('id'); 
    let allCustomers = {}; 

    // 🧮 Live Calculation Stream mapping for User Interface rendering
    function showCustomerDetails(id) { 
        const cust = allCustomers[id]; 
        if (!cust) return; 

        const baseLoan = Number(cust.loanAmount || 0); 
        const totalCollected = Number(cust.totalCollected || 0); 
        const totalPayableWithInterest = baseLoan + (baseLoan * 0.20); 
        const dynamicRemaining = totalPayableWithInterest - totalCollected; 
        const emi = Number(cust.dailyEmi || cust.emi || 0);

        // Gap Tracker Analysis Configuration
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

            // Late Penalty Matrix Processing Core Logic
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

    // 3. Dropdown Stream Aggregator Pipeline
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
                    option.textContent = `${data.name} (${data.mobile || ''})`; 
                    customerSelect.appendChild(option); 
                } 
            }); 

            if (urlCustId && allCustomers[urlCustId]) { 
                customerSelect.value = urlCustId; 
                showCustomerDetails(urlCustId); 
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

    // 4. Collection Entry Submission Module
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

                // A. Add Entry Stream to Collections Collection
                await addDoc(collection(db, "collections"), { 
                    customerId: selectedId, 
                    amount: amount, 
                    date: finalDateStr, 
                    note: "EMI Received", 
                    timestamp: new Date() 
                }); 

                // B. Synchronize Master Ledger Balance Fields
                const custDocRef = doc(db, "customers", selectedId); 
                const custSnap = await getDoc(custDocRef); 
                if (custSnap.exists()) { 
                    const custData = custSnap.data(); 
                    const newTotalCollected = Number(custData.totalCollected || 0) + amount; 
                    const newPaidDays = Number(custData.paidDays || 0) + 1; 
                    const baseLoan = Number(custData.loanAmount || 0); 
                    const totalPayable = baseLoan + (baseLoan * 0.20); 
                    const newRemaining = totalPayable - newTotalCollected; 

                    await updateDoc(custDocRef, { 
                        totalCollected: newTotalCollected, 
                        remainingAmount: newRemaining >= 0 ? newRemaining : 0, 
                        paidDays: newPaidDays 
                    }); 
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
