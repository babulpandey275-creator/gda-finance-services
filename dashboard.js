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
        // 1. सभी एक्टिव ग्राहकों से आज का कुल टारगेट (Demand) निकालना
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

        // 2. आज की तारीख में वास्तव में जमा हुई कुल वसूली (Collection) निकालना
        const collectSnapshot = await getDocs(collection(db, "collections"));
        let todayCollectedSum = 0;
        let paidCustomerIds = new Set();

        collectSnapshot.forEach(docSnap => {
            const col = docSnap.data();
            
            // सुरक्षा जांच: सिर्फ आज की तारीख वाले कलेक्शन को जोड़ना
            if (col.date === todayIST || (col.createdAt && col.createdAt.includes(todayIST))) {
                todayCollectedSum += Number(col.amount || 0);
                
                const cId = col.customerId || col.custObjId || col.id;
                if (cId) {
                    paidCustomerIds.add(cId);
                }
            }
        });

        // 3. आज कितने एक्टिव ग्राहक किस्त देने से चूक गए (Due Customers Count)
        let missedCustCount = 0;
        let missedEmiSum = 0;

        activeCustomers.forEach(cust => {
            if (!paidCustomerIds.has(cust.id)) {
                missedCustCount++;
                missedEmiSum += Number(cust.dailyEmi || cust.emi || 0);
            }
        });

        // 🖥️ UI पर एकदम सीधा और आपकी पसंद का सही डेटा दिखाना
        if (txtTodayCollected) {
            // "आज वसूली" बॉक्स में आपकी वास्तविक कुल वसूली (जैसे ₹1700) / कुल टारगेट दिखेगा
            txtTodayCollected.innerText = `₹${todayCollectedSum} / ₹${totalDemand}`;
        }
        if (txtTodayDemand) {
            txtTodayDemand.innerText = `₹${totalDemand}`;
        }
        if (txtTodayMissed) {
            // "आज का ड्यू" बॉक्स में आज की छूटी हुई किस्त (टारगेट - वसूली) दिखेगा (जैसे ₹500)
            const remainingDue = totalDemand - todayCollectedSum;
            txtTodayMissed.innerText = `₹${remainingDue > 0 ? remainingDue : 0}`;
        }
        if (txtActiveAccounts) {
            txtActiveAccounts.innerText = activeCount;
        }
        if (lblDueCount) {
            // Pending Due List (X) वाले बटन के ब्रैकेट में आज किस्त न देने वालों की संख्या दिखेगी
            lblDueCount.innerText = missedCustCount;
        }

        // आज चूकने वाले ग्राहकों की सूची लोकल स्टोरेज में डालना ताकि लिस्ट पेज में लोड हो सके
        const dueList = activeCustomers.filter(cust => !paidCustomerIds.has(cust.id));
        localStorage.setItem("todayDueCustomers", JSON.stringify(dueList));

    } catch (err) {
        console.error("डैशबोर्ड एरर:", err);
    }
});
