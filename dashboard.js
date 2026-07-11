// firebase.js से db और auth दोनों को इम्पोर्ट किया
import { db, auth } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

window.addEventListener('DOMContentLoaded', () => {
    
    // 🛡️ सुरक्षा घेरा (Security Guard): चेक करें कि यूजर लॉगिन है या नहीं
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            // ❌ अगर यूजर लॉगिन नहीं है, तो उसे तुरंत लॉगिन पेज पर वापस भगा दो
            console.log("अनधिकृत पहुंच! लॉगिन पेज पर रीडायरेक्ट किया जा रहा है...");
            window.location.href = "login.html";
            return; // कोड यहीं रुक जाएगा, नीचे का कोई डेटा लोड नहीं होगा
        }

        // ======= 🟢 यूज़र लॉगिन है, अब डैशबोर्ड का डेटा लोड करें =======
        console.log("यूज़र लॉगिन है:", user.email);

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

            // 3. 🚨 टाइमज़ोन बग फिक्स: पेंडिंग ग्राहकों की सटीक गिनती
            let missedCustCount = 0;
            activeCustomers.forEach(cust => {
                if (cust.loanDate && cust.status !== "Closed") {
                    if (cust.loanDate >= todayIST) {
                        return; // लिस्ट से बाहर रखें
                    }
                    // सीधा 'Milliseconds' का शुद्ध गणित
                    const date1 = new Date(todayIST);
                    const date2 = new Date(cust.loanDate);
                    const diffTime = Math.abs(date1 - date2);
                    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    const paidDays = Number(cust.paidDays || 0);
                    const dueDays = totalDays - paidDays;

                    if (dueDays > 0) {
                        missedCustCount++;
                    }
                }
            });

            // 🧮 वास्तविक और शुद्ध गणना (हार्डकोडेड बग हटा दिया गया है)
            let finalCollected = todayCollectedSum; 
            let rawDue = totalDemand - finalCollected;
            let finalDue = rawDue > 0 ? rawDue : 0;

            // 🖥️ UI अपडेट
            if (txtTodayCollected) { txtTodayCollected.innerText = `₹${finalCollected} / ₹${totalDemand}`; }
            if (txtTodayDemand) { txtTodayDemand.innerText = `₹${totalDemand}`; }
            if (txtTodayMissed) { txtTodayMissed.innerText = `₹${finalDue}`; }
            if (txtActiveAccounts) { txtActiveAccounts.innerText = activeCount; }
            if (lblDueCount) { lblDueCount.innerText = missedCustCount; }

        } catch (err) {
            console.error("डैशबोर्ड लोड एरर:", err);
        }
    });

    // ======= 🚪 लॉगआउट बटन का सही फ़ंक्शन (Firebase SignOut) =======
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            if (confirm("क्या आप सचमुच लॉगआउट करना चाहते हैं?")) {
                auth.signOut().then(() => {
                    localStorage.removeItem("gdaLoggedIn");
                    console.log("सफलतापूर्वक लॉगआउट किया गया।");
                    window.location.href = "login.html";
                }).catch((error) => {
                    console.error("लॉगआउट करने में समस्या आई:", error);
                    alert("लॉगआउट नहीं हो सका, कृपया दोबारा प्रयास करें।");
                });
            }
        };
    }
});
