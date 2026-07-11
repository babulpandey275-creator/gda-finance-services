
import { db } from './firebase-config.js'; 
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // आज की तारीख ऑटोमैटिक सेट करने के लिए
    const dateInput = document.getElementById('inpRegDate');
    if (dateInput && !dateInput.value) {
        const localDate = new Date();
        const offset = localDate.getTimezoneOffset();
        const adjustedDate = new Date(localDate.getTime() - (offset * 60 * 1000));
        dateInput.value = adjustedDate.toISOString().split('T')[0];
    }

    // फॉर्म सबमिशन हैंडलर
    const regForm = document.getElementById('registrationForm');
    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = document.getElementById('btnSubmitReg');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = "⏳ सेव हो रहा है...";
            }

            // आपके HTML फ़ील्ड्स के अनुसार डेटा उठाना
            const name = document.getElementById('inpCustomerName')?.value.trim();
            const phone = document.getElementById('inpCustomerPhone')?.value.trim();
            const address = document.getElementById('inpCustomerAddress')?.value.trim();
            const amount = Number(document.getElementById('inpLoanAmount')?.value || 0);
            const interest = Number(document.getElementById('inpInterestAmount')?.value || 0);
            const termDays = Number(document.getElementById('inpLoanTerm')?.value || 0);
            const regDate = document.getElementById('inpRegDate')?.value;

            try {
                // 1. कस्टमर डेटा सेव करना
                const customerRef = await addDoc(collection(db, "customers"), {
                    name: name,
                    phone: phone,
                    address: address,
                    status: "active",
                    createdAt: regDate
                });

                // 2. लोन डेटा सेव करना
                await addDoc(collection(db, "loans"), {
                    customerId: customerRef.id,
                    customerName: name,
                    amount: amount,
                    interest: interest,
                    termDays: termDays,
                    date: regDate,
                    status: "active"
                });

                const dailyEmi = Math.ceil((amount + interest) / termDays);
                alert(`🎉 खाता खुल गया!\nदैनिक EMI: ₹${dailyEmi}`);
                
                window.location.href = "index.html";

            } catch (error) {
                console.error("Error:", error);
                alert("🚨 सेव नहीं हो पाया! इंटरनेट चेक करें।");
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = "➕ Register";
                }
            }
        });
    }
});
