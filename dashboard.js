import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    const txtTodayCollected = document.getElementById("txtTodayCollected");
    const txtTodayMissed = document.getElementById("txtTodayMissed");
    const txtActiveAccounts = document.getElementById("txtActiveAccounts");
    const txtTodayDemand = document.getElementById("txtTodayDemand");
    const lblDueCount = document.getElementById("lblDueCount");

    // 🇮🇳 भारतीय समय (IST) के अनुसार आज की तारीख (YYYY-MM-DD)
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const todayParts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date());
    const yyyy = todayParts.find(p => p.type === 'year').value;
    const mm = todayParts.find(p => p.type === 'month').value;
    const dd = todayParts.find(p => p.type === 'day').value;
    const todayIST = `${yyyy}-${mm}-${dd}`;

    try {
        // 1. एक्टिव ग्राहकों से आज का कुल टारगेट (Demand) निकालना
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

        // 2. आज की तारीख में कुल जमा वसूली (Collection) निकालना
        const collectSnapshot = await getDocs(collection(db, "collections"));
        let todayCollectedSum = 0;
        let paidCustomerIds = new Set();

        collectSnapshot.forEach(docSnap => {
            const col = docSnap.data();
            if (col.date === todayIST) {
                todayCollectedSum += Number(col.amount || 0);
                if (col.customerId) {
                    paidCustomerIds.add(col.customerId);
                }
            }
        });

        // 3. आज कितने ग्राहक किस्त देने से चूक गए (Due Customers Count)
        let missedCustCount = 0;
        activeCustomers.forEach(cust => {
            if (!paidCustomerIds.has(cust.id)) {
                missedCustCount++;
            }
        });

        // 4. आज की बकाया ड्यू राशि (Demand - Collected)
        const todayMissedSum = totalDemand - todayCollectedSum;

        // 🖥️ UI पर डेटा को लाइव रेंडर करना
        if (txtTodayCollected) {
            txtTodayCollected.innerText = `₹${todayCollectedSum} / ₹${totalDemand}`;
        }
        if (txtTodayDemand) {
            txtTodayDemand.innerText = `₹${totalDemand}`;
        }
        if (txtTodayMissed) {
            txtTodayMissed.innerText = `₹${todayMissedSum > 0 ? todayMissedSum : 0}`;
        }
        if (txtActiveAccounts) {
            txtActiveAccounts.innerText = activeCount;
        }
        if (lblDueCount) {
            lblDueCount.innerText = missedCustCount;
        }

        // 🎯 ड्यू लिस्ट पेज के उपयोग के लिए आज चूकने वाले ग्राहकों की सूची लोकल स्टोरेज में सेव करना
        const dueList = activeCustomers.filter(cust => !paidCustomerIds.has(cust.id));
        localStorage.setItem("todayDueCustomers", JSON.stringify(dueList));

    } catch (err) {
        console.error("डैशबोर्ड लाइव ट्रैकर लोड एरर:", err);
    }
});
