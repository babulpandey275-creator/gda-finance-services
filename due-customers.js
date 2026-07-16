// ==========================================================
// 🚀 GDA FINANCE - DUE CUSTOMER LIST ENGINE (BACKLOG RECOVERY)
// ==========================================================

import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const dueList = document.getElementById("dueList");
const dueCounter = document.getElementById("dueCounter");

async function loadDueCustomers() {
    try {
        const querySnapshot = await getDocs(collection(db, "customers"));
        let htmlContent = "";
        let pendingCount = 0;

        querySnapshot.forEach((doc) => {
            const cust = doc.data();
            
            // अगर अकाउंट बंद है तो आगे बढ़ें
            if (cust.status === "Closed") return;

            // 1. तारीख का हिसाब (लोन शुरू होने से आज तक)
            const loanDate = new Date(cust.loanDate);
            const today = new Date();
            
            // दिनों का अंतर
            let daysElapsed = Math.floor((today - loanDate) / (1000 * 60 * 60 * 24));
            if (daysElapsed < 0) daysElapsed = 0;
            
            // 2. कैलकुलेशन
            const dailyEmi = Number(cust.dailyEmi || cust.emi || 0);
            const expectedAmt = daysElapsed * dailyEmi;
            
            // मान लिया कि आपने कलेक्शन रिकॉर्ड में 'totalCollected' को हर बार अपडेट किया है
            const totalPaid = Number(cust.totalCollected || 0);
            const currentDue = Math.max(0, expectedAmt - totalPaid);

            // 3. अगर बकाया है, तो टेबल रो बनाएं (आज पेमेंट किया है या नहीं, ये भी देख सकते हैं)
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

        // 4. रिजल्ट डिस्प्ले करें
        if (htmlContent === "") {
            dueList.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px;">✅ सब कुछ क्लियर है, कोई बकाया नहीं!</td></tr>`;
            if (dueCounter) dueCounter.innerText = "Pending Due List (0)";
        } else {
            dueList.innerHTML = htmlContent;
            if (dueCounter) dueCounter.innerText = `Pending Due List (${pendingCount})`;
        }

    } catch (err) {
        console.error("Error loading due list:", err);
        dueList.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">डेटा लोड करने में गलती हुई।</td></tr>`;
    }
}

// रन करें
loadDueCustomers();
