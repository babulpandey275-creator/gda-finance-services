import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

function getTodayIST() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}
function parseDateIST(dateStr) {
    if (!dateStr) return null;
    const parts = String(dateStr).split('-');
    if (parts.length === 3) return new Date(Number(parts[0]), Number(parts[1])-1, Number(parts[2]));
    return new Date(dateStr);
}

const listEl = document.getElementById("missedList");
const loadingEl = document.getElementById("missedLoading");

async function loadMissedDates() {
    if (!listEl ||!loadingEl) return;
    try {
        const [custSnap, colSnap] = await Promise.all([
            getDocs(collection(db, "customers")),
            getDocs(collection(db, "collections"))
        ]);

        // Customer wise har date ko kitna paisa diya - SUM karo
        const paidAmountMap = new Map(); // customerId -> { '2026-07-29': 500 }
        const totalPaidMap = new Map(); // customerId -> total paid
        colSnap.forEach(doc => {
            const d = doc.data();
            const cId = d.customerId;
            const dateStr = (d.collectionDate || d.date || "").split('T')[0];
            const amt = Number(d.amount || 0);
            if (!cId ||!dateStr) return;
            if (!paidAmountMap.has(cId)) paidAmountMap.set(cId, {});
            if (!paidAmountMap.get(cId)[dateStr]) paidAmountMap.get(cId)[dateStr] = 0;
            paidAmountMap.get(cId)[dateStr] += amt;

            if (!totalPaidMap.has(cId)) totalPaidMap.set(cId, 0);
            totalPaidMap.set(cId, totalPaidMap.get(cId) + amt);
        });

        let html = "";
        let totalMissedCustomers = 0;
        const todayStr = getTodayIST();
        const todayDate = parseDateIST(todayStr);

        custSnap.forEach(doc => {
            const cust = doc.data();
            const id = doc.id;
            if (cust.status === "Closed") return;

            const loanDateObj = parseDateIST(cust.loanDate);
            if (!loanDateObj) return;
            const dailyEmi = Number(cust.dailyEmi || 0);
            if (dailyEmi <= 0) return;

            let diffDays = Math.floor((todayDate - loanDateObj) / (1000*60*60*24));
            if (diffDays < 0) diffDays = 0;

            const dailyPaidObj = paidAmountMap.get(id) || {};
            const missedDates = [];
            let credit = 0; // Extra paisa jo agle din ke liye bachega

            for (let i = 0; i <= diffDays; i++) {
                const d = new Date(loanDateObj);
                d.setDate(d.getDate() + i);
                const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

                const paidToday = dailyPaidObj[dateStr] || 0;
                credit += paidToday;

                if (credit >= dailyEmi) {
                    credit -= dailyEmi; // Din ka hisab clear, bacha hua credit agle din ke liye
                } else {
                    // Paisa kam hai to ye date missed
                    missedDates.push({ date: dateStr, due: dailyEmi - credit });
                    credit = 0;
                }
            }

            if (missedDates.length > 0) {
                totalMissedCustomers++;
                // Total bacha hua amount = missedDates ka sum
                const totalDue = missedDates.reduce((s, x) => s + x.due, 0);
                const missedDatesOnly = missedDates.map(m => m.date).join(', ');

                html += `
                    <div class="missed-item" onclick="showMissedDetails('${cust.name}', ${totalDue}, '${missedDatesOnly}')">
                        <div style="line-height:1.4;">
                            <div style="font-weight:700;">${cust.name} <span style="font-weight:400;font-size:11px;color:#666;">(${cust.customerCode || ''})</span></div>
                            <div style="font-size:12px;color:#dc2626;">📅 Missed: ${missedDates.length} din | Pending: ₹${totalDue}</div>
                            <div style="font-size:11px;color:#888;">${missedDatesOnly}</div>
                        </div>
                        <span class="badge" style="background:#fee2e2;color:#dc2626;padding:4px 8px;border-radius:12px;font-size:11px;">₹${totalDue}</span>
                    </div>
                `;
            }
        });

        if (totalMissedCustomers === 0) {
            loadingEl.innerText = "✅ Sabhi ne time pe payment kiya hai!";
            listEl.innerHTML = "";
        } else {
            loadingEl.innerText = `📌 ${totalMissedCustomers} customer ke pending din:`;
            listEl.innerHTML = html;
        }

        window.showMissedDetails = (name, amount, dates) => {
            alert(`📋 ${name}\nPending: ₹${amount}\nMissed Dates:\n • ${dates.split(', ').join('\n • ')}`);
        };

    } catch (err) {
        console.error(err);
        loadingEl.innerText = "❌ Error: " + err.message;
    }
}
document.addEventListener('DOMContentLoaded', loadMissedDates);
