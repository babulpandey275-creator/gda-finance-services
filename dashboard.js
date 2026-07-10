import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    const txtTodayCollected = document.getElementById("txtTodayCollected");
    const txtTodayMissed = document.getElementById("txtTodayMissed");
    const txtActiveAccounts = document.getElementById("txtActiveAccounts");
    const txtTodayDemand = document.getElementById("txtTodayDemand");
    const lblDueCount = document.getElementById("lblDueCount");

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayIST = `${yyyy}-${mm}-${dd}`;

    try {
        // 1. ग्राहकों से कुल डिमांड निकालना
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

        // 2. आज की वसूली निकालना
        const collectSnapshot = await getDocs(collection(db, "collections"));
        let todayCollectedSum = 0;
        let paidCustomerIds = new Set();

        collectSnapshot.forEach(docSnap => {
            const col = docSnap.data();
            const colDate = col.date || "";
            if (colDate === todayIST || colDate.includes(todayIST)) {
                todayCollectedSum += Number(col.amount || col.emiPaid || 0);
                const cId = col.customerId || col.id;
                if (cId) paidCustomerIds.add(cId);
            }
        });

        // 3. पेंडिंग ग्राहकों की संख्या
        let missedCustCount = 0;
        activeCustomers.forEach(cust => {
            if (!paidCustomerIds.has(cust.id)) {
                missedCustCount++;
            }
        });

        // 🚨 आंकड़े उल्टे हो रहे थे, इसलिए यहाँ वैल्यू को आपस में सही बॉक्स में सेट किया 🚨
        const calculatedDue = totalDemand - todayCollectedSum;
        const finalDue = calculatedDue > 0 ? calculatedDue : 0;

        // UI पर रेंडरिंग - बॉक्स आपस में स्विच किए गए ताकि डिस्प्ले सही हो
        if (txtTodayCollected) {
            // वसूली वाले डिब्बे में आपकी वास्तविक वसूली (1700) दिखाई देगी
            txtTodayCollected.innerText = `₹${todayCollectedSum} / ₹${totalDemand}`;
        }
        if (txtTodayDemand) {
            txtTodayDemand.innerText = `₹${totalDemand}`;
        }
        if (txtTodayMissed) {
            // ड्यू वाले डिब्बे में बचा हुआ ड्यू (500) दिखाई देगा
            txtTodayMissed.innerText = `₹${finalDue}`;
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
