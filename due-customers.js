// ==========================================================
// 🚀 GDA FINANCE - DUE CUSTOMER LIST ENGINE (CLEAN & UPDATED)
// ==========================================================

import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const dueList = document.getElementById("dueList");
const dueCounter = document.getElementById("dueCounter"); // सुनिश्चित करें कि HTML में यह ID मौजूद है

async function loadDueCustomers() {
    try {
        // आज की तारीख (IST)
        const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        // 1. आज का पेमेंट डेटा लाएं (ताकि पता चले किसने आज पेमेंट कर दिया)
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
        let pendingCount = 0; // पेंडिंग कस्टमर्स की गिनती के लिए

        querySnapshot.forEach((doc) => {
            const cust = doc.data();
            
            // अगर अकाउंट बंद है या आज पेमेंट कर दिया है, तो उसे लिस्ट में न दिखाएं
            if (cust.status === "Closed" || paidTodayIds.includes(doc.id)) return;

            // पेंडिंग ड्यू कैलकुलेशन
            const loanDate = new Date(cust.loanDate);
            const today = new Date();
            let daysElapsed = Math.floor((today - loanDate) / (1000 * 60 * 60 * 24)) + 1;
            if (daysElapsed < 1) daysElapsed = 1;
            
            // EMI कैलकुलेशन
            const dailyEmi = Number(cust.dailyEmi || cust.emi || 0);
            const expectedAmt = daysElapsed * dailyEmi;
            const totalPaid = Number(cust.paidAmount || cust.totalCollected || 0);
            const currentDue = Math.max(0, expectedAmt - totalPaid);

            // अगर बकाया है, तो टेबल रो बनाएं
            if (currentDue > 0) {
                pendingCount++; // काउंटर अपडेट करें
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

        // 3. रिजल्ट डिस्प्ले करें
        if (htmlContent === "") {
            dueList.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px;">✅ आज कोई बकाया नहीं है!</td></tr>`;
            if (dueCounter) dueCounter.innerText = "Pending Due List (0)";
        } else {
            dueList.innerHTML = htmlContent;
            // हेडिंग में संख्या दिखाएं
            if (dueCounter) dueCounter.innerText = `Pending Due List (${pendingCount})`;
        }

    } catch (err) {
        console.error("Error loading due list:", err);
        dueList.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">डेटा लोड करने में गलती हुई।</td></tr>`;
    }
}

// फंक्शन रन करें
loadDueCustomers();
