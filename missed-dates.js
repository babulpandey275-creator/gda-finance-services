// ==========================================================
// 🚀 GDA FINANCE - MISSED DATES (DATE-WISE EXACT MATCH)
// ==========================================================

import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const listEl = document.getElementById("missedList");
const loadingEl = document.getElementById("missedLoading");

async function loadMissedDates() {
    if (!listEl || !loadingEl) return;

    try {
        // 1. सारा (All) डेटा (Data) – एक (One) साथ (Together) – लोड (Load) – करें (Do)
        const [custSnapshot, colSnapshot] = await Promise.all([
            getDocs(collection(db, "customers")),
            getDocs(collection(db, "collections"))
        ]);

        // 2. 🔥🔥🔥 पेड (Paid) – तारीखों (Dates) – का (Of) – मैप (Map) – बनाएँ (Create) – (customerId -> Set of Dates)
        const paidMap = new Map();
        colSnapshot.forEach(doc => {
            const data = doc.data();
            const cId = data.customerId;
            if (cId && data.date) {
                // ✅ डेट (Date) – को (To) – साफ (Clean) – करें (Do) – (सिर्फ (Only) YYYY-MM-DD – ही (Only) – लें (Take))
                const cleanDate = data.date.split('T')[0]; // अगर (If) – समय (Time) – जुड़ा (Attached) – है (Is) – तो (Then) – हटाएँ (Remove)!
                if (!paidMap.has(cId)) paidMap.set(cId, new Set());
                paidMap.get(cId).add(cleanDate);
            }
        });

        let html = "";
        let totalMissedCustomers = 0;

        // 3. हर (Each) – कस्टमर (Customer) – पर (On) – लूप (Loop) – करें (Do)
        custSnapshot.forEach(doc => {
            const cust = doc.data();
            const id = doc.id;
            
            // अगर (If) – अकाउंट (Account) – बंद (Closed) – है (Is) – तो (Then) – छोड़ें (Skip)
            if (cust.status === "Closed") return;

            const loanDate = new Date(cust.loanDate);
            const today = new Date();
            
            // कितने (How many) – दिन (Days) – हुए (Passed) – हैं (Are)?
            let diffDays = Math.floor((today - loanDate) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) diffDays = 0;
            // 🔥 +1 – इसलिए (So that) – आज (Today) – का (Of) – दिन (Day) – भी (Also) – गिना (Counted) – जाए (Be)!
            let totalDays = Math.max(0, diffDays) + 1; 

            // इस (This) – कस्टमर (Customer) – की (Of) – पेड (Paid) – तारीखें (Dates) – लें (Get)
            const paidSet = paidMap.get(id) || new Set();
            const missedDates = [];
            const dailyEmi = Number(cust.dailyEmi || cust.emi || 0);

            // 🔥🔥🔥 **तारीख (Date) – आधारित (Based) – सटीक (Exact) – मिलान (Match)** 🔥🔥🔥
            // लोन (Loan) – शुरू (Start) – होने (Happening) – वाली (That) – तारीख (Date) – से (From) – आज (Today) – तक (Till) – हर (Each) – तारीख (Date) – चेक (Check) – करें (Do)!
            for (let i = 0; i < totalDays; i++) {
                const d = new Date(loanDate);
                d.setDate(d.getDate() + i);
                const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
                
                // ✅ अगर (If) – इस (This) – तारीख (Date) – पर (On) – पेमेंट (Payment) – **नहीं (Not)** – है (Is) – तो (Then) – मिस्ड (Missed) – में (In) – डालें (Add)!
                if (!paidSet.has(dateStr)) {
                    missedDates.push(dateStr);
                }
            }

            // अगर (If) – कोई (Any) – मिस्ड (Missed) – तारीख (Date) – है (Is) – तो (Then) – लिस्ट (List) – में (In) – दिखाएं (Show)
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

        // 4. यूआई (UI) – अपडेट (Update) – करें (Do)
        if (totalMissedCustomers === 0) {
            loadingEl.innerText = "✅ सभी ने समय पर (या सही तारीख पर) पेमेंट कर लिया है!";
            listEl.innerHTML = "";
        } else {
            loadingEl.innerText = `📌 ${totalMissedCustomers} कस्टमर की मिस्ड डेट्स हैं:`;
            listEl.innerHTML = html;
        }

        // 5. Alert – दिखाने (Showing) – के (For) – लिए (For) – ग्लोबल (Global) – फंक्शन (Function)
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
