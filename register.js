import { db } from "./firebase.js"; 
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', () => {

    const loanAmountInput = document.getElementById("loanAmount");
    const loanPlanInput = document.getElementById("loanPlan");
    
    const interestInput = document.getElementById("interest");
    const totalCollectionInput = document.getElementById("totalCollection");
    const dailyCollectionInput = document.getElementById("dailyCollection");
    const remainingAmountInput = document.getElementById("remainingAmount");
    
    const saveBtn = document.getElementById("saveBtn");
    const resetBtn = document.getElementById("resetBtn");
    const form = document.getElementById("customerForm");

    // 🎯 तत्काल (Instant) लाइव ऑटो-कैलकुलेशन फंक्शन
    function calculateLoanValues() {
        const loanAmount = Number(loanAmountInput.value);
        const planDays = Number(loanPlanInput.value);

        if (!loanAmount || loanAmount <= 0 || !planDays) {
            interestInput.value = "₹0";
            totalCollectionInput.value = "₹0";
            dailyCollectionInput.value = "₹0";
            remainingAmountInput.value = "₹0";
            return;
        }

        // ब्याज नियम: 20% flat
        const interest = Math.round(loanAmount * 0.20);
        const totalCollection = loanAmount + interest;
        const dailyCollection = Math.round(totalCollection / planDays);

        // UI डिस्प्ले अपडेट करना
        interestInput.value = `₹${interest}`;
        totalCollectionInput.value = `₹${totalCollection}`;
        dailyCollectionInput.value = `₹${dailyCollection}`;
        remainingAmountInput.value = `₹${totalCollection}`; // शुरुआत में Remaining = Total Collection
    }

    // इनपुट बॉक्स या ड्रॉपडाउन बदलते ही तुरंत गणना एक्टिवेट करें
    loanAmountInput.addEventListener("input", calculateLoanValues);
    loanPlanInput.addEventListener("change", calculateLoanValues);

    // 🧹 रीसेट बटन का लॉजिक
    resetBtn.onclick = () => {
        form.reset();
        calculateLoanValues();
    };

    // 💾 डेटाबेस में सेव करने और सुरक्षा जांच का लॉजिक
    saveBtn.onclick = async () => {
        const name = document.getElementById("customerName").value.trim();
        const mobile = document.getElementById("mobileNumber").value.trim();
        const address = document.getElementById("address").value.trim();
        const aadhaar = document.getElementById("aadhaarNumber").value.trim();
        const loanAmount = Number(loanAmountInput.value);
        const planDays = Number(loanPlanInput.value);

        // 🛡️ वैलिडेशन गार्ड्स
        if (!name || !mobile || !address || !aadhaar || !loanAmount || !planDays) {
            alert("⚠️ कृपया सभी फ़ील्ड्स को सही तरीके से भरें!");
            return;
        }

        if (mobile.length !== 10) {
            alert("⚠️ मोबाइल नंबर पूरे 10 अंकों का होना चाहिए!");
            return;
        }

        if (aadhaar.length !== 12) {
            alert("⚠️ आधार नंबर पूरे 12 अंकों का होना चाहिए!");
            return;
        }

        // कैलकुलेटेड वैल्यूज को नंबर फॉर्मेट में निकालना
        const interest = Math.round(loanAmount * 0.20);
        const totalCollection = loanAmount + interest;
        const dailyEmi = Math.round(totalCollection / planDays);

        try {
            saveBtn.disabled = true;
            saveBtn.innerText = "Saving...";

            // फ़ायरबेस डेटाबेस के 'customers' कलेक्शन में एंट्री भेजना
            await addDoc(collection(db, "customers"), {
                name: name,
                mobile: mobile,
                address: address,
                aadhaar: aadhaar,
                loan: loanAmount,
                planDays: planDays,
                interest: interest,
                totalCollection: totalCollection,
                emi: dailyEmi,
                remainingAmount: totalCollection,
                paidDays: 0,
                totalCollected: 0,
                status: "Active",
                loanDate: new Date().toISOString().split('T')[0] // आज का डेट स्टैम्प
            });

            alert("🎉 ग्राहक का खाता सफलतापूर्वक पंजीकृत हो गया है!");
            window.location.href = "customer-list.html"; // वापस लिस्ट पर भेजें

        } catch (error) {
            console.error("सेव करने में समस्या आई: ", error);
            alert("❌ एरर: डेटाबेस में सुरक्षित नहीं किया जा सका।");
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<span class="material-symbols-outlined">verified_user</span> Save Customer';
        }
    };
});
