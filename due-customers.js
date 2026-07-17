// ==========================================================
// 🚀 GDA FINANCE - DUE CUSTOMER LIST (FINAL FIXED VERSION)
// ==========================================================

import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const dueList = document.getElementById("dueList");
const dueCounter = document.getElementById("dueCounter");

async function loadDueCustomers() {
    try {
        // सारे कस्टमर लोड करें (userId फ़िल्टर नहीं, ताकि पुराने वाले भी दिखें)
        const querySnapshot = await getDocs(collection(db, "customers"));
        let htmlContent = "";
        let pendingCount = 0;

        querySnapshot.forEach((doc) => {
            const cust = doc.data();
            
            // अगर अकाउंट बंद (Closed) है तो आगे बढ़ें
            if (cust.status === "Closed") return;

            // 1. तारीख का हिसाब (लोन शुरू होने से आज तक)
            const loanDate = new Date(cust.loanDate);
            const today = new Date();
            
            // 🔥🔥🔥 यही वह FIX है (सिर्फ एक लाइन का बदलाव)
            // अब अगर आज (17 तारीख) को लोन दिया, तो daysElapsed = 0 + 1 = 1 होगा,
            // यानी आज का EMI (पहली किस्त) भी Due लिस्ट में दिखेगा!
            let diffDays = Math.floor((today - loanDate) / (1000 * 60 * 60 * 24));
            let daysElapsed = Math.max(0, diffDays) + 1; 
            
            // 2. बाकी सारा कैलकुलेशन (बिल्कुल आपका पुराना, एक अक्षर नहीं बदला)
            const dailyEmi = Number(cust.dailyEmi || cust.emi || 0);
            const expectedAmt = daysElapsed * dailyEmi;
            const totalPaid = Number(cust.totalCollected || 0);
            const currentDue = Math.max(0, expectedAmt - totalPaid);

            // 3. अगर बकाया है, तो टेबल में दिखाएं
            if (currentDue > 0) {
                pendingCount++;
                htmlContent += `
                <tr>
                    <td><strong>${cust.name}</strong><br><small>${cust.customerCode || 'GDA'}</small></td>
                    <td>${cust.mobile || 'N/A'}</td>
                    <td>₹${dailyEmi}</td>
                    <td style="color:red; font-weight:bold;">₹${currentDue}</td>
                    <td>${cust.loanDate}</td>
                    <td>
                        <a href="collection.html?id=${doc.id}" class="btn" style="background:var(--success); padding:5px 10px; font-size:12px;">Collect</a>
                    </td>
                </tr>`;
            }
        });

        // 4. रिजल्ट डिस्प्ले (बिल्कुल आपका पुराना)
        if (htmlContent === "") {
            dueList.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px;">✅ सब कुछ क्लियर है, कोई बकाया नहीं!</td></tr>`;
            if (dueCounter) dueCounter.innerText = "Pending Due List (0)";
        } else {
            dueList.innerHTML = htmlContent;
            if (dueCounter) dueCounter.innerText = `Pending Due List (${pendingCount})`;
        }

    } catch (err) {
        console.error("Error loading due list:", err);
        dueList.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">❌ डेटा लोड करने में गलती: ${err.message}</td></tr>`;
    }
}

// रन करें
loadDueCustomers();
