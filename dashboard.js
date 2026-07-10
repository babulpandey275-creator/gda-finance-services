import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    // 🖥️ UI एलिमेंट्स मैपिंग (index.html से कनेक्टेड)
    const txtTodayCollected = document.getElementById("txtTodayCollected");
    const txtTodayMissed = document.getElementById("txtTodayMissed");
    const txtActiveAccounts = document.getElementById("txtActiveAccounts");
    const txtTodayDemand = document.getElementById("txtTodayDemand");
    const lblDueCount = document.getElementById("lblDueCount");

    // 🇮🇳 भारतीय समय (IST) के अनुसार आज की तारीख (YYYY-MM-DD फ़ॉर्मेट में)
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const todayParts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date());
    const yyyy = todayParts.find(p => p.type === 'year').value;
    const mm = todayParts.find(p => p.type === 'month').value;
    const dd = todayParts.find(p => p.type === 'day').value;
    const todayIST = `${yyyy}-${mm}-${dd}`;

    try {
        // 👥 1. फायरबेस से सभी ग्राहकों का डेटा लोड करना
        const custSnapshot = await getDocs(collection(db, "customers"));
        let activeCount = 0;
        let totalDemand = 0;
        let activeCustomers = [];

        custSnapshot.forEach(docSnap => {
            const cust = docSnap.data();
            // केवल सक्रिय खातों (Active Status) को फ़िल्टर करें
            if ((cust.status || "Active") === "Active") {
                activeCount++;
                // ग्राहक की दैनिक EMI को जोड़कर आज का कुल टारगेट (Demand) बनाएं
                totalDemand += Number(cust.dailyEmi || cust.emi || 0);
                // लोकल ट्रैकिंग के लिए आईडी के साथ कस्टमर डेटा स्टोर करें
                activeCustomers.push({ id: docSnap.id, ...cust });
            }
        });

        // 💰 2. फायरबेस से आज की तारीख में जमा हुई कुल वसूली (Collection) निकालना
        const collectSnapshot = await getDocs(collection(db, "collections"));
        let todayCollectedSum = 0;
        let paidCustomerIds = new Set();

        collectSnapshot.forEach(docSnap => {
            const col = docSnap.data();
            // अगर किस्त कलेक्शन की तारीख आज की तारीख (todayIST) से मैच होती है
            if (col.date === todayIST) {
                todayCollectedSum += Number(col.amount || 0);
                
                // ग्राहक की विशिष्ट ID को सेट में डालें ताकि पता चले इसने पैसे दे दिए हैं
                // नोट: अगर आपके डेटाबेस में 'customerId' की जगह 'id' सेव होता है, तो col.id का उपयोग करें
                const cId = col.customerId || col.id;
                if (cId) {
                    paidCustomerIds.add(cId);
                }
            }
        });

        // 🚨 3. आज कितने एक्टिव ग्राहक किस्त देने से चूक गए (Due Customers Count)
        let missedCustCount = 0;
        activeCustomers.forEach(cust => {
            if (!paidCustomerIds.has(cust.id)) {
                missedCustCount++;
            }
        });

        // 🔻 4. आज की बकाया ड्यू राशि का गणित (टारगेट - वसूली)
        const todayMissedSum = totalDemand - todayCollectedSum;

        // 🖥️ डेटा को स्क्रीन पर सुंदर तरीके से दिखाना
        if (txtTodayCollected) {
            // यह दिखाएगा: ₹आज की वसूली / ₹आज का टारगेट
            txtTodayCollected.innerText = `₹${todayCollectedSum} / ₹${totalDemand}`;
        }
        if (txtTodayDemand) {
            txtTodayDemand.innerText = `₹${totalDemand}`;
        }
        if (txtTodayMissed) {
            // अगर वसूली टारगेट से ज़्यादा या बराबर है तो ड्यू ₹0 दिखेगा
            txtTodayMissed.innerText = `₹${todayMissedSum > 0 ? todayMissedSum : 0}`;
        }
        if (txtActiveAccounts) {
            txtActiveAccounts.innerText = activeCount;
        }
        if (lblDueCount) {
            // Pending Due List (X) वाले बटन के ब्रैकेट में छूटे हुए लोगों की संख्या दिखेगी
            lblDueCount.innerText = missedCustCount;
        }

        // 🎯 [सुरक्षित बैकअप]: आज चूकने वाले ग्राहकों की सूची लोकल स्टोरेज में डालना
        // ताकि जब आप लाल बटन दबाएं तो यह डेटा सीधे ड्यू लिस्ट पेज पर दिखाई दे
        const dueList = activeCustomers.filter(cust => !paidCustomerIds.has(cust.id));
        localStorage.setItem("todayDueCustomers", JSON.stringify(dueList));

    } catch (err) {
        console.error("डैशबोर्ड लाइव ट्रैकर लोड करने में एरर आया:", err);
    }
});
