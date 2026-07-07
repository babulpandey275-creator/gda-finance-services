import { db } from "./firebase.js"; 
import { doc, getDoc, updateDoc, addDoc, collection } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

// पेज पूरी तरह लोड होने के बाद कोड चले (DOMContentLoaded से टॉप-लेवल await का एरर ठीक हो जाएगा)
window.addEventListener('DOMContentLoaded', async () => {
    
    const params = new URLSearchParams(window.location.search); 
    const id = params.get("id"); 
    
    if (!id) {
        alert("कस्टमर ID नहीं मिली!");
        return;
    }

    // 📅 तारीख वाले इनपुट बॉक्स में आज की तारीख डिफ़ॉल्ट रूप से सेट करना
    const dateInput = document.getElementById("paymentDate");
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0]; // आज की तारीख (YYYY-MM-DD)
    }

    const ref = doc(db, "customers", id); 
    let c = {};

    try {
        const snap = await getDoc(ref); 
        if (!snap.exists()) { 
            alert("Customer not found"); 
            throw new Error("Customer not found"); 
        } 
        
        c = snap.data(); 
        
        // HTML में डेटा दिखाना
        document.getElementById("name").textContent = c.name || ""; 
        document.getElementById("loan").textContent = c.loan || "0"; 
        document.getElementById("emi").textContent = c.emi || "0"; 
        document.getElementById("remaining").textContent = c.remainingAmount ?? c.loan; 
        
        // EMI ऑटो-फिल करना
        document.getElementById("amount").value = c.emi || ""; 
        
        // स्टेटमेंट बटन का लिंक सेट करना
        document.getElementById("statementBtn").href = "statement.html?id=" + id; 
        
    } catch (err) {
        console.error("डेटा लोड करने में समस्या:", err);
        alert("ग्राहक की जानकारी लोड नहीं हो पाई।");
        return;
    }

    // कलेक्शन सेव करने का लॉजिक
    document.getElementById("saveBtn").onclick = async () => { 
        const amount = Number(document.getElementById("amount").value); 
        
        // इनपुट फील्ड से एजेंट द्वारा चुनी गई तारीख उठाना (बैक-डेट या करंट डेट)
        const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];

        if (!amount || amount <= 0) { 
            alert("Please Enter Valid Amount"); 
            return; 
        } 
        
        const currentRemaining = c.remainingAmount ?? c.loan;
        if (amount > currentRemaining) { 
            alert("Amount is greater than Remaining Amount"); 
            return; 
        } 

        const remaining = Math.max(0, currentRemaining - amount); 
        const paidDays = (c.paidDays || 0) + Math.floor(amount / c.emi); 

        try {
            // A. कलेक्शन की हिस्ट्री में एंट्री सेव करना
            await addDoc(collection(db, "collections"), { 
                customerId: id, 
                customerName: c.name, 
                mobile: c.mobile, 
                loan: c.loan, 
                emi: c.emi, 
                amount: amount, 
                paidDays: paidDays, 
                remainingAmount: remaining, 
                date: selectedDate, // <-- अब यहाँ सिस्टम की जगह एजेंट की चुनी तारीख (बैक-डेट) सेव होगी
                createdAt: new Date() // रिकॉर्ड के लिए कि एंट्री असल में किस समय कंप्यूटर में डाली गई
            }); 

            // B. कस्टमर का मुख्य डेटाबेस (बकाया राशि) अपडेट करना
            await updateDoc(ref, { 
                remainingAmount: remaining, 
                paidDays: paidDays, 
                totalCollected: (c.totalCollected || 0) + amount 
            }); 

            document.getElementById("remaining").textContent = remaining; 
            alert("✅ Collection Saved Successfully"); 
            location.reload(); 
            
        } catch (error) {
            console.error("कलेक्शन सेव करने में एरर:", error);
            alert("कलेक्शन सुरक्षित नहीं हो सका: " + error.message);
        }
    };
});
