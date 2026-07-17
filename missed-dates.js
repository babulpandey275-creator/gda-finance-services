// ==========================================================
// 🚀 GDA FINANCE - MISSED DATES (AMOUNT-BASED / ROLLING BALANCE)
// ==========================================================

import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const listEl = document.getElementById("missedList");
const loadingEl = document.getElementById("missedLoading");

async function loadMissedDates() {
    if (!listEl || !loadingEl) return;

    try {
        // 1. सारा डेटा एक साथ लोड करें
        const [custSnapshot, colSnapshot] = await Promise.all([
            getDocs(collection(db, "customers")),
            getDocs(collection(db, "collections"))
        ]);

        // 2. 🔥 हर कस्टमर की 'कुल जमा राशि (Total Collected)' निकालें
        const paidAmountMap = new Map();
        colSnapshot.forEach(doc => {
            const data = doc.data();
            const cId = data.customerId;
            if (cId) {
                const amount = Number(data.amount) || 0;
                paidAmountMap.set(cId, (paidAmountMap.get(cId) || 0) + amount);
            }
        });

        let html = "";
        let totalMissedCustomers = 0;

        // 3. हर कस्टमर पर लूप करें
        custSnapshot.forEach(doc => {
            const cust = doc.data();
            const id = doc.id;
            if (cust.status === "Closed") return;

            const loanDate = new Date(cust.loanDate);
            const today = new Date();
            const dailyEmi = Number(cust.dailyEmi || cust.emi || 0);
            
            // अगर EMI 0 है तो छोड़ें (Divide by Zero से बचने के लिए)
            if (dailyEmi === 0) return;

            // कुल दिन (आज तक) – इसमें +1 इसलिए कि आज का दिन भी गिना जाए
            let diffDays = Math.floor((today - loanDate) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) diffDays = 0;
            let totalDays = Math.max(0, diffDays) + 1;

            // 🔥🔥🔥 सबसे ज़रूरी बदलाव: कुल जमा राशि (Total Paid) और कुल बकाया (Total Due)
            const totalPaid = paidAmountMap.get(id) || 0;
            
            // कितने दिनों का पैसा जमा हो चुका है? (पूरे दिन, जैसे 2000/200 = 10 दिन)
            const effectivePaidDays = Math.min(totalDays, Math.floor(totalPaid / dailyEmi));

            // Missed Dates: वे दिन जो 'effectivePaidDays' के बाद आते हैं
            const missedDates = [];
            // लूप 'effectivePaidDays' से शुरू करें (क्योंकि उससे पहले के दिन Paid माने जाएंगे)
            for (let i = effectivePaidDays; i < totalDays; i++) {
                const d = new Date(loanDate);
                d.setDate(d.getDate() + i);
                const dateStr = d.toISOString().split('T')[0];
                missedDates.push(dateStr);
            }

            // अगर Missed Dates हैं, तो लिस्ट में दिखाएं
            if (missedDates.length > 0) {
                totalMissedCustomers++;
                const missedStr = missedDates.join(', ');
                const missedAmount = missedDates.length * dailyEmi; // कितना ₹ बाकी है

                html += `
                    <div class="missed-item" onclick="showMissedDetails('${cust.name}', '${missedStr}')">
                        <div>
                            <span class="name">${cust.name}</span>
                            <span style="font-size: 12px; color: var(--text-muted); margin-left: 10px;">
                                📅 Missed: ${missedDates.length} days (₹${missedAmount})
                            </span>
                        </div>
                        <span class="badge">View</span>
                    </div>
                `;
            }
        });

        // 4. UI अपडेट करें
        if (totalMissedCustomers === 0) {
            loadingEl.innerText = "✅ सभी ने समय पर (या जमा करके) पेमेंट कर लिया है!";
            listEl.innerHTML = "";
        } else {
            loadingEl.innerText = `📌 ${totalMissedCustomers} कस्टमर की मिस्ड डेट्स हैं:`;
            listEl.innerHTML = html;
        }

        // Alert दिखाने के लिए ग्लोबल फंक्शन
        window.showMissedDetails = (name, dates) => {
            const dateArray = dates.split(', ');
            const dateList = dateArray.join('\n  • ');
            alert(`📋 ${name} की Missed तारीखें:\n\n  • ${dateList}`);
        };

    } catch (err) {
        console.error("Missed Dates Error:", err);
        loadingEl.innerText = "❌ डेटा लोड नहीं हुआ: " + err.message;
        listEl.innerHTML = "";
    }
}

document.addEventListener('DOMContentLoaded', loadMissedDates);
