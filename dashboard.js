import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    const txtTodayCollected = document.getElementById("txtTodayCollected");
    const txtTodayMissed = document.getElementById("txtTodayMissed");
    const txtActiveAccounts = document.getElementById("txtActiveAccounts");
    const txtTodayDemand = document.getElementById("txtTodayDemand");
    const lblDueCount = document.getElementById("lblDueCount");

    // आज की तारीख का सही फ़ॉर्मेट (YYYY-MM-DD)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayIST = `${yyyy}-${mm}-${dd}`;

    try {
        // 1. ग्राहकों का डेटा लाना
        const custSnapshot = await getDocs(collection(db, "customers"));
        let activeCount = 0;
        let totalDemand = 0;
        let activeCustomers = [];

        custSnapshot.forEach(docSnap => {
            const cust = docSnap.data();
            if ((cust.status || "Active") === "Active") {
                activeCount++;
                totalDemand += Number(cust.dailyEmi || cust.emi || 0);
                activeCustomers.push({ id: docSnap.id, ...cust });
            }
        });

        // 2. आज के दिन हुए कुल कलेक्शन का जोड़ निकालना
        const collectSnapshot = await getDocs(collection(db, "collections"));
        let todayCollectedSum = 0;
        let paidCustomerIds = new Set();

        collectSnapshot.forEach(docSnap => {
            const col = docSnap.data();
            const colDate = col.date || "";
            
            // अगर कलेक्शन की तारीख आज से मैच होती है
            if (colDate === todayIST || colDate.includes(todayIST)) {
                todayCollectedSum += Number(col.amount || col.emiPaid || 0);
                const cId = col.customerId || col.id;
                if (cId) paidCustomerIds.add(cId);
            }
        });

        // 3. आज का वास्तविक छूटा हुआ ड्यू अमाउंट
        let todayMissedSum = totalDemand - todayCollectedSum;
        if (todayMissedSum < 0) todayMissedSum = 0;

        // 4. पेंडिंग (चूके हुए) ग्राहकों की कुल संख्या
        let missedCustCount = 0;
        activeCustomers.forEach(cust => {
            if (!paidCustomerIds.has(cust.id)) {
                missedCustCount++;
            }
        });

        // 🖥️ UI को एकदम सटीक वैल्यू के साथ अपडेट करना
        if (txtTodayCollected) {
            txtTodayCollected.innerText = `₹${todayCollectedSum} / ₹${totalDemand}`;
        }
        if (txtTodayDemand) {
            txtTodayDemand.innerText = `₹${totalDemand}`;
        }
        if (txtTodayMissed) {
            txtTodayMissed.innerText = `₹${todayMissedSum}`;
        }
        if (txtActiveAccounts) {
            txtActiveAccounts.innerText = activeCount;
        }
        if (lblDueCount) {
            lblDueCount.innerText = missedCustCount;
        }

    } catch (err) {
        console.error("डैशबोर्ड लोड एरर:", err);
    }
});
