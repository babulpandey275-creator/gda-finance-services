import { db } from "./firebase.js"; 
import { collection, getDocs, doc, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => { 
    const customerSelect = document.getElementById("customerSelect"); 
    const detailsBox = document.getElementById("customerDetailsBox"); 
    const txtEmi = document.getElementById("txtEmi"); 
    const txtRemaining = document.getElementById("txtRemaining"); 
    const txtPaidDays = document.getElementById("txtPaidDays"); 
    const collectAmountInput = document.getElementById("collectAmount"); 
    const collectionDateInput = document.getElementById("collectionDate"); 
    const submitBtn = document.getElementById("submitCollectionBtn"); 
    
    let allCustomersMap = {}; // सारे ग्राहकों का डेटा याद रखने के लिए अस्थायी तिजोरी 

    // 📅 तारीख सेट करना (आज की तारीख ऑटोमैटिक इनपुट में आ जाएगी) 
    const today = new Date().toISOString().split('T')[0]; 
    collectionDateInput.value = today; 

    /* ========================================= 👤 1. फ़ायरबेस से सभी एक्टिव ग्राहक लोड करना ========================================= */ 
    async function loadActiveCustomers() { 
        try { 
            const snap = await getDocs(collection(db, "customers")); 
            customerSelect.innerHTML = `<option value="" disabled selected>-- ग्राहक चुनें --</option>`; 
            
            if (snap.empty) { 
                customerSelect.innerHTML = `<option value="" disabled>कोई सक्रिय ग्राहक नहीं मिला</option>`; 
                return; 
            } 
            
            snap.forEach((docSnap) => { 
                const customer = docSnap.data(); 
                // सिर्फ उन्हीं को दिखाओ जिनका खाता बंद (Closed) नहीं हुआ है 
                if (customer.status !== "Closed") { 
                    allCustomersMap[docSnap.id] = customer; 
                    
                    // ग्राहक की ID अगर GDA001 फॉर्मेट में है तो वही दिखाएं
                    const displayId = customer.member_id || `ID: ${docSnap.id.substring(0, 5)}...`; 
                    const option = document.createElement("option"); 
                    option.value = docSnap.id; 
                    option.textContent = `${customer.name} (${displayId})`; 
                    customerSelect.appendChild(option); 
                } 
            }); 
        } catch (error) { 
            console.error("ग्राहक लिस्ट लोड करने में समस्या:", error); 
            alert("⚠️ ग्राहक सूची लोड करने में समस्या आई। कृपया नेटवर्क चेक करें।"); 
        } 
    } 

    /* ========================================= 📊 2. ग्राहक चुनते ही उसकी जानकारी स्क्रीन पर दिखाना ========================================= */ 
    customerSelect.addEventListener("change", (e) => { 
        const custId = e.target.value; 
        const customer = allCustomersMap[custId]; 
        
        if (customer) { 
            const emi = Number(customer.emi || 0); 
            
            // Dynamic check: 20% ratio system to ensure exact payable amount logic matches statement layout
            const loanAmount = Number(customer.loanAmount || 0);
            const totalPayableWithInterest = loanAmount + (loanAmount * 0.20);
            const totalCollected = Number(customer.totalCollected || 0);
            const remaining = totalPayableWithInterest - totalCollected;
            
            const paidDays = parseInt(customer.paidDays || 0, 10); 

            // वित्तीय डेटा को सुंदर और सटीक फॉर्मेट में दिखाना 
            txtEmi.textContent = `₹${emi.toFixed(2)}`; 
            txtRemaining.textContent = `₹${Math.max(0, remaining).toFixed(2)}`; 
            txtPaidDays.textContent = `${paidDays} दिन`; 

            // डिफ़ॉल्ट रूप से उसकी रोज़ की किस्त की राशि इनपुट बॉक्स में खुद भर जाए 
            collectAmountInput.value = emi; 
            // जानकारी का बॉक्स दिखाएं 
            detailsBox.style.display = "block"; 
        } else { 
            detailsBox.style.display = "none"; 
        } 
    }); 

    /* ========================================= 💸 3. किस्त जमा करने और फ़ायरबेस अपडेट करने का लॉजिक ========================================= */ 
    submitBtn.onclick = async () => { 
        const custId = customerSelect.value; 
        const amount = Number(collectAmountInput.value); 
        const selectDate = collectionDateInput.value; 

        if (!custId) { 
            alert("⚠️ कृपया पहले किसी ग्राहक को चुनें!"); 
            return; 
        } 
        if (isNaN(amount) || amount <= 0) { 
            alert("⚠️ कृपया एक सही और वैध जमा राशि दर्ज करें!"); 
            return; 
        } 
        if (!selectDate) { 
            alert("⚠️ कृपया कलेक्शन की तारीख चुनें!"); 
            return; 
        } 

        const customer = allCustomersMap[custId]; 
        const loanAmount = Number(customer.loanAmount || 0);
        const totalPayableWithInterest = loanAmount + (loanAmount * 0.20);
        const totalCollected = Number(customer.totalCollected || 0);
        const currentRemaining = totalPayableWithInterest - totalCollected;

        if (amount > currentRemaining) { 
            alert(`⚠️ चेतावनी: जमा राशि बकाया राशि (₹${currentRemaining.toFixed(2)}) से ज़्यादा नहीं हो सकती!`); 
            return; 
        } 

        try { 
            submitBtn.disabled = true; 
            submitBtn.innerText = "⏳ किस्त जमा की जा रही है..."; 

            // A. 'collections' कलेक्शन में नया रिकॉर्ड जोड़ना
            // FIXED: Added customer mobile field to ensure layout mapping contains data rows correctly
            await addDoc(collection(db, "collections"), { 
                customerId: custId, 
                memberId: customer.member_id || "", 
                customerName: customer.name, 
                customerMobile: customer.mobile || "-", // FIXED: Added to remove empty hyphens from logs
                amount: amount, 
                date: selectDate, 
                createdAt: new Date().toISOString() 
            }); 

            // B. 'customers' कलेक्शन में ग्राहक का बैलेंस अपडेट करना 
            const newTotalCollected = Number((totalCollected + amount).toFixed(2)); 
            const newRemaining = Number((totalPayableWithInterest - newTotalCollected).toFixed(2)); 
            const newPaidDays = parseInt(customer.paidDays || 0, 10) + 1; 

            // अगर पूरा पैसा वसूल हो गया तो स्टेटस खुद Closed हो जाए 
            const newStatus = newRemaining <= 0 ? "Closed" : "Active"; 
            const custDocRef = doc(db, "customers", custId); 
            
            await updateDoc(custDocRef, { 
                remainingAmount: newRemaining, 
                totalCollected: newTotalCollected, 
                paidDays: newPaidDays, 
                status: newStatus 
            }); 

            alert(`🎉 ${customer.name} की ₹${amount} की किस्त सफलतापूर्वक जमा हो गई है!`); 
            window.location.href = `statement.html?id=${custId}`; 
        } catch (error) { 
            console.error("किस्त जमा करने में तकनीकी एरर:", error); 
            alert("⚠️ नेटवर्क या डेटाबेस समस्या के कारण किस्त सुरक्षित नहीं हो सकी। कृपया दोबारा प्रयास करें।"); 
            submitBtn.disabled = false; 
            submitBtn.innerText = "💸 किस्त जमा करें"; 
        } 
    }; 

    // पेज लोड होते ही रन करें 
    await loadActiveCustomers(); 
});
