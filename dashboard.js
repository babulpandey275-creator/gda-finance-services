import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    const txtTodayCollected = document.getElementById("txtTodayCollected");
    const txtTodayMissed = document.getElementById("txtTodayMissed");
    const txtActiveAccounts = document.getElementById("txtActiveAccounts");
    const txtTodayDemand = document.getElementById("txtTodayDemand");
    const lblDueCount = document.getElementById("lblDueCount");

    // आज की तारीख (IST)
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const todayParts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date());
    const yyyy = todayParts.find(p => p.type === 'year').value;
    const mm = todayParts.find(p => p.type === 'month').value;
    const dd = todayParts.find(p => p.type === 'day').value;
    const todayIST = `${yyyy}-${mm}-${dd}`;
    const todayObj = new Date();

    try {
        // 1. ग्राहकों का डेटा लाना और ड्यू लिस्ट वाले सेम लॉजिक से ओवरड्यू ग्राहक गिनना
        const custSnapshot = await getDocs(collection(db, "customers"));
        let activeCount = 0;
        let totalDemand = 0;
        let missedCustCount = 0;
        let totalOverdueAmount = 0;

        custSnapshot.forEach(docSnap => {
            const cust = docSnap.data();
            if ((cust.status || "Active") === "Active") {
                activeCount++;
                totalDemand += Number(cust.dailyEmi || cust.emi || 0);

                // ड्यू लिस्ट वाला सेम लॉजिक यहाँ लागू किया
                if (cust.loanDate && cust.status !== "Closed") {
                    const loanAmount = Number(cust.loanAmount || 0);
                    const totalCollectedVal = Number(cust.totalCollected || 0);
                    const totalPayableWithInterest = loanAmount + (loanAmount * 0.20);
                    const dynamicRemaining = totalPayableWithInterest - totalCollectedVal;

                    const loanDate = new Date(cust.loanDate);
                    const diffTime = todayObj - loanDate;
                    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    const paidDays = Number(cust.paidDays || 0);
                    const dueDays = totalDays - paidDays;

                    // अगर उसकी किस्तें बकाया हैं और लोन अमाउंट बचा है
                    if (dueDays > 0 && dynamicRemaining > 0) {
                        missedCustCount++;
                        const emi = Number(cust.emi || 0);
                        totalOverdueAmount += (dueDays * emi);
                    }
                }
            }
        });

        // 2. आज की तारीख में वास्तव में जमा हुई कुल वसूली (Collection) निकालना
        const collectSnapshot = await getDocs(collection(db, "collections"));
        let todayCollectedSum = 0;

        collectSnapshot.forEach(docSnap => {
            const col = docSnap.data();
            if (col.date === todayIST || (col.createdAt && col.createdAt.includes(todayIST))) {
                todayCollectedSum += Number(col.amount || 0);
            }
        });

        // 🖥️ UI पर डेटा दिखाना (आपकी पसंद के अनुसार सटीक आंकड़े)
        if (txtTodayCollected) {
            txtTodayCollected.innerText = `₹${todayCollectedSum} / ₹${totalDemand}`;
        }
        if (txtTodayDemand) {
            txtTodayDemand.innerText = `₹${totalDemand}`;
        }
        if (txtTodayMissed) {
            // आज का ड्यू (टारगेट - आज की वसूली)
            const remainingDue = totalDemand - todayCollectedSum;
            txtTodayMissed.innerText = `₹${remainingDue > 0 ? remainingDue : 0}`;
        }
        if (txtActiveAccounts) {
            txtActiveAccounts.innerText = activeCount;
        }
        if (lblDueCount) {
            // अब यह संख्या सीधे आपके ड्यू लिस्ट पेज के कुल ग्राहकों की संख्या से 100% मैच करेगी
            lblDueCount.innerText = missedCustCount;
        }

    } catch (err) {
        console.error("डैशबोर्ड एरर:", err);
    }
});
