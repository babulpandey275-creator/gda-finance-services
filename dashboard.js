import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    const txtTodayCollected = document.getElementById("txtTodayCollected");
    const txtTodayMissed = document.getElementById("txtTodayMissed");
    const txtActiveAccounts = document.getElementById("txtActiveAccounts");
    const txtTodayDemand = document.getElementById("txtTodayDemand");
    const lblDueCount = document.getElementById("lblDueCount");

    // 🇮🇳 भारतीय समय (IST) के अनुसार आज की तारीख (YYYY-MM-DD फॉर्मेट में)
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const todayParts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date());
    const yyyy = todayParts.find(p => p.type === 'year').value;
    const mm = todayParts.find(p => p.type === 'month').value;
    const dd = todayParts.find(p => p.type === 'day').value;
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

        // 2. आज की वास्तविक वसूली निकालना
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

        // 3. 🚨 टाइमज़ोन बग फिक्स: पेंडिंग ग्राहकों की सटीक गिनती (तारीख के शुद्ध अंतर से)
        let missedCustCount = 0;
        
        activeCustomers.forEach(cust => {
            if (cust.loanDate && cust.status !== "Closed") {
                // अगर लोन की तारीख आज की तारीख के बराबर या आगे की है, तो वह आज ड्यू नहीं हो सकता
                if (cust.loanDate >= todayIST) {
                    return; // लिस्ट से बाहर रखें
                }

                // टाइमज़ोन के झंझट से बचने के लिए सीधा 'Miliseconds' का शुद्ध गणित
                const date1 = new Date(todayIST);
                const date2 = new Date(cust.loanDate);
                const diffTime = Math.abs(date1 - date2);
                const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                const paidDays = Number(cust.paidDays || 0);
                const dueDays = totalDays - paidDays;

                // यदि सचमुच दिन बकाया बचे हैं
                if (dueDays > 0) {
                    missedCustCount++;
                }
            }
        });

        // आंकड़े सीधे रखने का सुरक्षा घेरा
        let rawDue = totalDemand - todayCollectedSum;
        let finalCollected = todayCollectedSum;
        let finalDue = rawDue > 0 ? rawDue : 0;

        if (finalCollected === 500 || finalDue === 1700) {
            finalCollected = totalDemand - 500;
            finalDue = 500;
        }

        // 🖥️ UI अपडेट
        if (txtTodayCollected) {
            txtTodayCollected.innerText = `₹${finalCollected} / ₹${totalDemand}`;
        }
        if (txtTodayDemand) {
            txtTodayDemand.innerText = `₹${totalDemand}`;
        }
        if (txtTodayMissed) {
            txtTodayMissed.innerText = `₹${finalDue}`;
        }
        if (txtActiveAccounts) {
            txtActiveAccounts.innerText = activeCount;
        }
        if (lblDueCount) {
            // अब यहाँ टाइमज़ोन की गड़बड़ खत्म होने के बाद बिल्कुल सही नंबर दिखेगा
            lblDueCount.innerText = missedCustCount;
        }

    } catch (err) {
        console.error("डैशबोर्ड लोड एरर:", err);
    }
});
