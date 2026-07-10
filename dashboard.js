import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    const txtTodayCollected = document.getElementById("txtTodayCollected");
    const txtTodayMissed = document.getElementById("txtTodayMissed");
    const txtActiveAccounts = document.getElementById("txtActiveAccounts");
    const txtTodayDemand = document.getElementById("txtTodayDemand");
    const lblDueCount = document.getElementById("lblDueCount");

    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const todayParts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date());
    const yyyy = todayParts.find(p => p.type === 'year').value;
    const mm = todayParts.find(p => p.type === 'month').value;
    const dd = todayParts.find(p => p.type === 'day').value;
    const todayIST = `${yyyy}-${mm}-${dd}`;

    try {
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

        const collectSnapshot = await getDocs(collection(db, "collections"));
        let todayCollectedSum = 0;
        let paidCustomerIds = new Set();

        collectSnapshot.forEach(docSnap => {
            const col = docSnap.data();
            if (col.date === todayIST) {
                todayCollectedSum += Number(col.amount || 0);
                const cId = col.customerId || col.id;
                if (cId) {
                    paidCustomerIds.add(cId);
                }
            }
        });

        let missedCustCount = 0;
        activeCustomers.forEach(cust => {
            if (!paidCustomerIds.has(cust.id)) {
                missedCustCount++;
            }
        });

        // 🔥 यहाँ सुधार किया: आज का ड्यू = कुल टारगेट - आज की वसूली
        const todayMissedSum = totalDemand - todayCollectedSum;

        // 🖥️ UI पर एकदम सीधा और सही डेटा दिखाना
        if (txtTodayCollected) {
            // अब यह सही दिखाएगा: ₹1700 / ₹2200
            txtTodayCollected.innerText = `₹${todayCollectedSum} / ₹${totalDemand}`;
        }
        if (txtTodayDemand) {
            txtTodayDemand.innerText = `₹${totalDemand}`;
        }
        if (txtTodayMissed) {
            // अब यहाँ सही बकाया दिखेगा: ₹500
            txtTodayMissed.innerText = `₹${todayMissedSum > 0 ? todayMissedSum : 0}`;
        }
        if (txtActiveAccounts) {
            txtActiveAccounts.innerText = activeCount;
        }
        if (lblDueCount) {
            lblDueCount.innerText = missedCustCount;
        }

        const dueList = activeCustomers.filter(cust => !paidCustomerIds.has(cust.id));
        localStorage.setItem("todayDueCustomers", JSON.stringify(dueList));

    } catch (err) {
        console.error("डैशबोर्ड लाइव ट्रैकर लोड करने में एरर आया:", err);
    }
});
