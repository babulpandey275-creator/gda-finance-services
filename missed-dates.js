// ==========================================================
// 🚀 GDA FINANCE - MISSED DATES (DATE-NORMALIZED)
// ==========================================================

import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// ✅ हेल्पर (Helper) – डेट (Date) – को (To) – YYYY-MM-DD – में (In) – बदलें (Convert)
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
        const [custSnapshot, colSnapshot] = await Promise.all([
            getDocs(collection(db, "customers")),
            getDocs(collection(db, "collections"))
        ]);

        // 🔥 पेड (Paid) – तारीखों (Dates) – को (To) – नॉर्मलाइज़ (Normalize) – करें (Do) – (YYYY-MM-DD)
        const paidMap = new Map();
        colSnapshot.forEach(doc => {
            const data = doc.data();
            const cId = data.customerId;
            if (cId && data.date) {
                const cleanDate = normalizeDate(data.date);
                if (!cleanDate) return;
                if (!paidMap.has(cId)) paidMap.set(cId, new Set());
                paidMap.get(cId).add(cleanDate);
            }
        });

        let html = "";
        let totalMissedCustomers = 0;

        custSnapshot.forEach(doc => {
            const cust = doc.data();
            const id = doc.id;
            if (cust.status === "Closed") return;

            const loanDate = new Date(cust.loanDate);
            const today = new Date();
            let diffDays = Math.floor((today - loanDate) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) diffDays = 0;
            let totalDays = Math.max(0, diffDays) + 1;

            const paidSet = paidMap.get(id) || new Set();
            const missedDates = [];
            const dailyEmi = Number(cust.dailyEmi || cust.emi || 0);

            // 🔥 हर (Each) – तारीख (Date) – को (To) – चेक (Check) – करें (Do)
            for (let i = 0; i < totalDays; i++) {
                const d = new Date(loanDate);
                d.setDate(d.getDate() + i);
                const dateStr = d.toISOString().split('T')[0];
                if (!paidSet.has(dateStr)) {
                    missedDates.push(dateStr);
                }
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

        if (totalMissedCustomers === 0) {
            loadingEl.innerText = "✅ सभी ने समय पर (या सही तारीख पर) पेमेंट कर लिया है!";
            listEl.innerHTML = "";
        } else {
            loadingEl.innerText = `📌 ${totalMissedCustomers} कस्टमर की मिस्ड डेट्स हैं:`;
            listEl.innerHTML = html;
        }

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
