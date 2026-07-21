// ==========================================================
// 🚀 GDA FINANCE - MISSED DATES (AMOUNT-BASED + OLDEST FIRST)
// ==========================================================

import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// ✅ डेट (Date) – को (To) – YYYY-MM-DD – में (In) – बदलने (Convert) – का (Of) – फंक्शन (Function)
function normalizeDate(dateStr) {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().split('T')[0];
    } catch {
        return null;
    }
}

const listEl = document.getElementById("missedList");
const loadingEl = document.getElementById("missedLoading");

async function loadMissedDates() {
    if (!listEl || !loadingEl) return;

    try {
        // 1️⃣ सारा (All) – डेटा (Data) – लोड (Load) – करें (Do) – (जैसे (Like) – कलेक्शन (Collection) – हिस्ट्री (History) – में (In) – होता (Is) – है (Is))
        const [custSnapshot, colSnapshot] = await Promise.all([
            getDocs(collection(db, "customers")),
            getDocs(collection(db, "collections"))
        ]);

        // 2️⃣ हर (Each) – कस्टमर (Customer) – की (Of) – कुल (Total) – जमा (Deposited) – राशि (Amount) – निकालें (Calculate) – (बिल्कुल (Exactly) – वैसे (Same) – जैसे (As) – हिस्ट्री (History) – में (In) – दिखती (Shows) – है (Is))
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

        // 3️⃣ हर (Each) – कस्टमर (Customer) – पर (On) – लूप (Loop) – करें (Do)
        custSnapshot.forEach(doc => {
            const cust = doc.data();
            const id = doc.id;
            if (cust.status === "Closed") return;

            const loanDate = new Date(cust.loanDate);
            const today = new Date();
            let diffDays = Math.floor((today - loanDate) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) diffDays = 0;
            let totalDays = Math.max(0, diffDays) + 1;

            const dailyEmi = Number(cust.dailyEmi || cust.emi || 0);
            const totalPaid = paidAmountMap.get(id) || 0;

            // 🔥🔥🔥 4. कितने (How many) – दिनों (Days) – का (Of) – पैसा (Money) – जमा (Deposited) – हुआ (Was) – है (Is)?
            // यह (This) – पूरी (Completely) – तरह (Way) – से (From) – कलेक्शन (Collection) – हिस्ट्री (History) – पर (On) – आधारित (Based) – है (Is)!
            let effectivePaidDays = Math.min(totalDays, Math.floor(totalPaid / dailyEmi));

            // 5. मिस्ड (Missed) – तारीखें (Dates) – निकालें (Calculate) – (पुरानी (Oldest) – से (From) – शुरू (Start) – करें (Do))
            const missedDates = [];
            for (let i = effectivePaidDays; i < totalDays; i++) {
                const d = new Date(loanDate);
                d.setDate(d.getDate() + i);
                const dateStr = d.toISOString().split('T')[0];
                missedDates.push(dateStr);
            }

            if (missedDates.length > 0) {
                totalMissedCustomers++;
                const missedStr = missedDates.join(', ');
                const missedAmount = missedDates.length * dailyEmi;

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

        // 6. यूआई (UI) – अपडेट (Update) – करें (Do)
        if (totalMissedCustomers === 0) {
            loadingEl.innerText = "✅ सभी ने समय पर (या जमा करके) पेमेंट कर लिया है!";
            listEl.innerHTML = "";
        } else {
            loadingEl.innerText = `📌 ${totalMissedCustomers} कस्टमर की मिस्ड डेट्स हैं:`;
            listEl.innerHTML = html;
        }

        // 7. Alert – दिखाने (Showing) – के (For) – लिए (For) – ग्लोबल (Global) – फंक्शन (Function)
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
