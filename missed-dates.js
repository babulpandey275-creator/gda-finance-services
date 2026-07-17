// ==========================================================
// 🚀 GDA FINANCE - MISSED DATES (AMOUNT-BASED + OLDEST FIRST)
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

        // 2. 🔥🔥🔥 हर (Each) – कस्टमर (Customer) – के (Of) – लिए (For) – कुल (Total) – जमा (Deposited) – राशि (Amount) – निकालें (Calculate)
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

            const dailyEmi = Number(cust.dailyEmi || cust.emi || 0);
            
            // 🔥🔥🔥 **नया (New) – अमाउंट (Amount) – बेस्ड (Based) – लॉजिक (Logic)** 🔥🔥🔥
            // 1. कुल (Total) – जमा (Deposited) – राशि (Amount) – लें (Get)
            const totalPaid = paidAmountMap.get(id) || 0;
            
            // 2. कितने (How many) – दिनों (Days) – का (Of) – पैसा (Money) – जमा (Deposited) – हुआ (Was) – है (Is)?
            // Math.min(totalDays, Math.floor(totalPaid / dailyEmi)) – यह (This) – सुनिश्चित (Ensure) – करेगा (Will) – कि (That) – दिनों (Days) – की (Of) – संख्या (Number) – आज (Today) – से (From) – ज़्यादा (More) – न (Not) – हो (Be) – सके (Can)!
            let effectivePaidDays = Math.min(totalDays, Math.floor(totalPaid / dailyEmi));
            
            // 3. 🔥🔥🔥 **पुरानी (Oldest)** – तारीखों (Dates) – को (To) – **पहले (First)** – क्लियर (Clear) – करें (Do)!
            const missedDates = [];
            // लूप (Loop) – effectivePaidDays – से (From) – शुरू (Start) – करें (Do) – क्योंकि (Because) – उससे (Than that) – पहले (Before) – के (Of) – दिन (Days) – पेड (Paid) – माने (Consider) – जाएंगे (Will be)!
            for (let i = effectivePaidDays; i < totalDays; i++) {
                const d = new Date(loanDate);
                d.setDate(d.getDate() + i);
                const dateStr = d.toISOString().split('T')[0];
                missedDates.push(dateStr);
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
            loadingEl.innerText = "✅ सभी ने समय पर (या जमा करके) पेमेंट कर लिया है!";
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
