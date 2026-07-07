// इम्पोर्ट में updateDoc, doc, increment को जोड़े
import { db } from './firebase.js';
import { collection, getDocs, addDoc, serverTimestamp, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// ... (बाकी कोड वही रहेगा - loadCustomers, renderCustomer, selectCustomer)

// 3. पेमेंट कलेक्ट करना (अपडेटेड फंक्शन)
document.getElementById("collectBtn").onclick = async () => {
    const customerId = document.getElementById("collectBtn").dataset.customerId;
    const amount = Number(document.getElementById("paymentAmount").value);
    const mode = document.getElementById("paymentMode").value;
    const note = document.getElementById("note").value;

    if (!customerId) { alert("कृपया पहले एक ग्राहक चुनें!"); return; }
    if (isNaN(amount) || amount <= 0) { alert("कृपया सही राशि डालें!"); return; }

    try {
        // A. कलेक्शन की हिस्ट्री में एंट्री करें
        await addDoc(collection(db, "collections"), {
            customerId: customerId,
            amount: amount,
            paymentMode: mode,
            note: note,
            date: serverTimestamp()
        });

        // B. ग्राहक की शेष राशि (remainingAmount) को अपडेट करें
        const customerRef = doc(db, "customers", customerId);
        await updateDoc(customerRef, {
            remainingAmount: increment(-amount), // पुरानी राशि में से माइनस करें
            paidDays: increment(1)               // 'paidDays' को 1 बढ़ाएं
        });

        alert("पेमेंट सफलतापूर्वक जमा हो गया और बकाया अपडेट हो गया!");
        location.reload(); // पेज रिफ्रेश करें ताकि नई वैल्यू दिखे
    } catch (e) {
        console.error("Error updating: ", e);
        alert("कुछ तकनीकी समस्या हुई, कृपया फिर से प्रयास करें।");
