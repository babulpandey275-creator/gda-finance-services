// ==========================================================
// 🚀 GDA FINANCE - MISSED DATES (FINAL FIXED - IST DATE)
// ==========================================================

import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

function getTodayIST() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function parseDateIST(dateStr) {
    if (!dateStr) return null;
    // YYYY-MM-DD ko IST me sahi parse karo
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime())? null : d;
}

const listEl = document.getElementById("missedList");
const loadingEl = document.getElementById("missedLoading");

async function loadMissedDates() {
    if (!listEl ||!loadingEl) return;
    try {
        const [custSnapshot, colSnapshot] = await Promise.all([
            getDocs(collection(db, "customers")),
            getDocs(collection(db, "collections"))
        ]);

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
        const todayStr = getTodayIST();
        const todayDate = parseDateIST(todayStr);

        custSnapshot.forEach(doc => {
            const cust = doc.data();
            const id = doc.id;
            if (cust.status === "Closed") return;

            const loanDateObj = parseDateIST(cust.loanDate);
            if (!loanDateObj) return;

            let diffDays = Math.floor((todayDate - loanDateObj) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) diffDays = 0;
            let totalDays = diffDays + 1; // aaj tak

            const dailyEmi = Number(cust.dailyEmi || cust.emi || cust.dailyCollection || 0);
            if (dailyEmi <= 0) return;

            const totalPaid = paidAmountMap.get(id) || 0;
            let effectivePaidDays = Math.min(totalDays, Math.floor(totalPaid / dailyEmi));

            const missedDates = [];
            for (let i = effectivePaidDays; i < totalDays; i++) {
                const d = new Date(loanDateObj);
                d.setDate(d.getDate() + i);
                // IST me date string banao, UTC nahi
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                missedDates.push(`${yyyy}-${mm}-${dd}`);
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
            loadingEl.innerText = "✅ Sabhi ne time pe payment kar diya hai!";
            listEl.innerHTML = "";
        } else {
            loadingEl.innerText = `📌 ${totalMissedCustomers} customer ki missed dates hain:`;
            listEl.innerHTML = html;
        }

        window.showMissedDetails = (name, dates) => {
            const dateArray = dates.split(', ');
            const dateList = dateArray.join('\n • ');
            alert(`📋 ${name} ki Missed tarikhein:\n\n • ${dateList}`);
        };

    } catch (err) {
        console.error("Missed Dates Error:", err);
        loadingEl.innerText = "❌ Data load nahi hua: " + err.message;
        listEl.innerHTML = "";
    }
}

document.addEventListener('DOMContentLoaded', loadMissedDates);
