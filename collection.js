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

    // 🇮🇳 भारतीय समय (IST) के अनुसार आज की तारीख (YYYY-MM-DD फॉर्मेट में)
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const todayParts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date());
    const yyyy = todayParts.find(p => p.type === 'year').value;
    const mm = todayParts.find(p => p.type === 'month').value;
    const dd = todayParts.find(p => p.type === 'day').value;
    const todayIST = `${yyyy}-${mm}-${dd}`;

    if (collectionDate) { 
        collectionDate.value = todayIST; 
    } 

    // URL से ग्राहक की ID निकालना 
    const urlParams = new URLSearchParams(window.location.search); 
    const urlCustId = urlParams.get('id'); 
    let allCustomers = {}; 

    // 🧮 2. चुने हुए ग्राहक की लाइव जानकारी और लेट फाइन स्क्रीन पर दिखाना 
    function showCustomerDetails(id) { 
        const cust = allCustomers[id]; 
        if (!cust) return; 

        const baseLoan = Number(cust.loanAmount || 0); 
        const totalCollected = Number(cust.totalCollected || 0); 
        const totalPayableWithInterest = baseLoan + (baseLoan * 0.20); 
        const dynamicRemaining = totalPayableWithInterest - totalCollected; 
        const emi = Number(cust.dailyEmi || cust.emi || 0);

        // लेट फाइन (Penalty) और गैप दिन की गणना
        let gapDays = 0;
        let penaltyAmount = 0;

        if (cust.loanDate && cust.loanDate < todayIST) {
            const date1 = new Date(todayIST);
            const date2 = new Date(cust.loanDate);
            const diffTime = Math.abs(date1 - date2);
            const totalDaysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            const paidDaysCount = Number(cust.paidDays || 0);
            gapDays = totalDaysPassed - paidDaysCount;
            if (gapDays < 0) gapDays = 0;

            // 60-80 दिन पर 10% रोज, 80+ दिन पर 15% रोज का फाइन नियम
            if (gapDays > 60 && gapDays <= 80) {
                penaltyAmount = (gapDays - 60) * (emi * 0.10);
            } else if (gapDays > 80) {
                penaltyAmount = (20 * (emi * 0.10)) + ((gapDays - 80) * (emi * 0.15));
            }
        }

        const totalPayableNow = dynamicRemaining + penaltyAmount;

        if (txtEmi) txtEmi.textContent = `₹${emi}`; 
        
        // स्क्रीन पर कुल बकाया (मूल + जुर्माना) दिखाना
        if (txtRemaining) {
            if (penaltyAmount > 0) {
                txtRemaining.innerHTML = `₹${Math.round(totalPayableNow)} <span style="font-size:12px; color:#d32f2f; display:block; margin-top:4px;">(शामिल लेट फाइन: ₹${Math.round(penaltyAmount)})</span>`;
            } else {
                txtRemaining.textContent = `₹${Math.round(totalPayableNow)}`;
            }
        }
        
        if (txtPaidDays) txtPaidDays.textContent = `${cust.paidDays || 0} दिन`; 
        if (collectAmount) collectAmount.value = emi || ""; 
        if (customerDetailsBox) customerDetailsBox.style.display = "block"; 
    } 

    // 3. डेटाबेस से सभी एक्टिव ग्राहकों को ड्रापडाउन में लोड करना 
    async function loadCustomersDropdown() { 
        try { 
            const querySnapshot = await getDocs(collection(db, "customers")); 
            customerSelect.innerHTML = '<option value="" disabled selected>--- ग्राहक चुनें ---</option>'; 
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
            console.error("कस्टमर लोड एरर:", err); 
            customerSelect.innerHTML = '<option value="" disabled>⚠️ डेटा लोड करने में एरर</option>'; 
        } 
    } 

    if (customerSelect) { 
        customerSelect.onchange = (e) => { 
            showCustomerDetails(e.target.value); 
        }; 
    } 

    // 4. किस्त जमा करने का बटन क्लिक एक्शन 
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
                alert("⚠️ कृपया पहले किसी ग्राहक को चुनें!"); 
                return; 
            } 
            if (!amount || amount <= 0) { 
                alert("⚠️ कृपया सही किस्त राशि दर्ज करें!"); 
                return; 
            } 

            try { 
                submitCollectionBtn.disabled = true; 
                submitCollectionBtn.innerText = "⏳ जमा हो रहा है..."; 

                // A. कलेक्शन टेबल में एंट्री सेव करना
                await addDoc(collection(db, "collections"), { 
                    customerId: selectedId, 
                    amount: amount, 
                    date: finalDateStr, 
                    note: "EMI Received", 
                    timestamp: new Date() 
                }); 

                // B. कस्टमर के मास्टर रिकॉर्ड को अपडेट करना
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

                alert("🎉 किस्त सफलतापूर्वक जमा हो गई है!"); 
                window.location.href = "customer-list.html"; 
            } catch (err) { 
                console.error("किस्त जमा एरर:", err); 
                alert("⚠️ किस्त जमा करने में तकनीकी समस्या आई।"); 
                submitCollectionBtn.disabled = false; 
                submitCollectionBtn.innerText = "💸 किस्त जमा करें"; 
            } 
        }; 
    } 

    await loadCustomersDropdown(); 
});
