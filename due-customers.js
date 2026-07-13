// ==========================================================
// 🚀 GDA FINANCE - DUE CUSTOMERS ENGINE (NEW REFRESHED)
// ==========================================================

import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const dueList = document.getElementById("dueList");

async function loadDueCustomers() {
    try {
        // आज की तारीख (IST)
        const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        // 1. आज का पेमेंट डेटा लाएं
        const collectSnapshot = await getDocs(collection(db, "collections"));
        const paidTodayIds = [];
        
        collectSnapshot.forEach(doc => {
            if (doc.data().date === todayIST) {
                paidTodayIds.push(doc.data().customerId);
            }
        });

        // 2. कस्टमर डेटा लोड करें
        const querySnapshot = await getDocs(collection(db, "customers"));
        let htmlContent = "";

        querySnapshot.forEach((doc) => {
            const cust = doc.data();
            
            // अगर अकाउंट बंद है या आज पेमेंट कर दिया है, तो उसे लिस्ट में न दिखाएं
            if (cust.status === "Closed" || paidTodayIds.includes(doc.id)) return;

            // पेंडिंग ड्यू कैलकुलेशन
            const loanDate = new Date(cust.loanDate);
            const today = new Date();
            let daysElapsed = Math.floor((today - loanDate) / (1000 * 60 * 60 * 24)) + 1;
            if (daysElapsed < 1) daysElapsed = 1;
            
            const expectedAmt = daysElapsed * Number(cust.dailyEmi || cust.emi || 0);
            const totalPaid = Number(cust.paidAmount || 0);
            const currentDue = Math.max(0, expectedAmt - totalPaid);

            // अगर बकाया है, तो टेबल रो बनाएं
            if (currentDue > 0) {
                htmlContent += `
                <tr>
                    <td><strong>${cust.name}</strong><br><small>${cust.customerCode || 'GDA'}</small></td>
                    <td>${cust.mobile || 'N/A'}</td>
                    <td>₹${cust.dailyEmi || cust.emi}</td>
                    <td style="color:red; font-weight:bold;">₹${currentDue}</td>
                    <td>${cust.loanDate}</td>
                    <td>
                        <a href="collection.html?id=${doc.id}" class="btn" style="background:var(--success); padding:5px 10px; font-size:12px;">Collect</a>
                    </td>
                </tr>`;
            }
        });

        // 3. रिजल्ट डिस्प्ले करें
        if (htmlContent === "") {
            dueList.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px;">✅ आज कोई बकाया नहीं है!</td></tr>`;
        } else {
            dueList.innerHTML = htmlContent;
        }

    } catch (err) {
        console.error("Error:", err);
        dueList.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">डेटा लोड करने में गलती हुई।</td></tr>`;
    }
}

// फंक्शन रन करें
loadDueCustomers();
