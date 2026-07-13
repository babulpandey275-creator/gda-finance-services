import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const dueList = document.getElementById("dueList");

async function loadDueCustomers() {
    try {
        const querySnapshot = await getDocs(collection(db, "customers"));
        let htmlContent = "";

        querySnapshot.forEach((doc) => {
            const cust = doc.data();
            if (cust.status === "Closed") return;

            // सही कैलकुलेशन
            const loanDate = new Date(cust.loanDate);
            const today = new Date();
            const diffTime = today - loanDate;
            let daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
            if (daysElapsed < 1) daysElapsed = 1;
            
            const expectedAmt = daysElapsed * Number(cust.dailyEmi || cust.emi || 0);
            const totalPaid = Number(cust.paidAmount || 0);
            const currentDue = Math.max(0, expectedAmt - totalPaid);

            // सिर्फ जिनका बकाया (Due) है, उन्हीं को दिखाएं
            if (currentDue > 0) {
                htmlContent += `
                <tr>
                    <td><strong>${cust.name}</strong><br><small>${cust.customerCode || 'N/A'}</small></td>
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

        if (htmlContent === "") {
            dueList.innerHTML = `<tr><td colspan="6" style="text-align:center;">कोई बकाया (Due) नहीं है!</td></tr>`;
        } else {
            dueList.innerHTML = htmlContent;
        }

    } catch (err) {
        console.error("Error loading dues:", err);
        dueList.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">डेटा लोड करने में गलती हुई।</td></tr>`;
    }
}

loadDueCustomers();
