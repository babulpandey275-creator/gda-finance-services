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

    // 1. डिफ़ॉल्ट रूप से आज की शुद्ध भारतीय तारीख (IST) सेट करना (Format: YYYY-MM-DD)
    const todayIST = new Date().toLocaleDateString('en-ZA', { timeZone: 'Asia/Kolkata' }).trim(); 
    if (collectionDate) collectionDate.value = todayIST; 

    // URL से ग्राहक की ID निकालना 
    const urlParams = new URLSearchParams(window.location.search); 
    const urlCustId = urlParams.get('id'); 
    let allCustomers = {}; 

    // 2. चुने हुए ग्राहक की लाइव जानकारी स्क्रीन पर दिखाना 
    function showCustomerDetails(id) { 
        const cust = allCustomers[id]; 
        if (!cust) return; 

        const baseLoan = Number(cust.loanAmount || 0); 
        const totalCollected = Number(cust.totalCollected || 0); 
        
        // 20% ब्याज दर का सही वित्तीय गणित 
        const totalPayable = baseLoan + (baseLoan * 0.20); 
        const remaining = totalPayable - totalCollected; 

        if (txtEmi) txtEmi.textContent = `₹${cust.dailyEmi || cust.emi || 0}`; 
        if (txtRemaining) txtRemaining.textContent = `₹${remaining}`; 
        if (txtPaidDays) txtPaidDays.textContent = `${cust.paidDays || 0} दिन`; 

        // ऑटो-फ़िल किस्त राशि 
        if (collectAmount) collectAmount.value = cust.dailyEmi || cust.emi || ""; 
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

            // अगर लिस्ट से ID आई है, तो उसे तुरंत सिलेक्ट करें
            if (urlCustId && allCustomers[urlCustId]) { 
                customerSelect.value = urlCustId; 
                showCustomerDetails(urlCustId); 
            } 
        } catch (err) { 
            console.error("कस्टमर लोड एरर:", err); 
            customerSelect.innerHTML = '<option value="" disabled>⚠️ डेटा लोड करने में एरर</option>'; 
        } 
    } 

    // ड्रापडाउन चेंज होने पर 
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
            
            // 🎯 [सुधार]: इनपुट बॉक्स के भरोसे न रहकर सीधे शुद्ध IST तारीख (YYYY-MM-DD) बनाना
            const finalDateStr = new Date().toLocaleDateString('en-ZA', { timeZone: 'Asia/Kolkata' }).trim();

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

                // A. कलेक्शन टेबल में नई एंट्री जोड़ना (अब एकदम शुद्ध तारीख जाएगी)
                await addDoc(collection(db, "collections"), { 
                    customerId: selectedId, 
                    amount: amount, 
                    date: finalDateStr, 
                    note: "EMI Received", 
                    timestamp: new Date() 
                }); 

                // B. कस्टमर के खाते में कुल जमा, बकाया और दिन अपडेट करना 
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
                        remainingAmount: newRemaining, 
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
