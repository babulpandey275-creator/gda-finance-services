import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

function getTodayIST() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}
function parseDateIST(dateStr) {
    if (!dateStr) return null;
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1])-1, Number(parts[2]));
    }
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

        // Har customer ne total kitna diya
        const totalPaidMap = new Map();
        colSnap.forEach(doc => {
            const d = doc.data();
            const cId = d.customerId;
            const amt = Number(d.amount || 0);
            if (!cId) return;
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
            const totalExpectedDays = diffDays + 1;

            const totalPaid = totalPaidMap.get(id) || 0;
            const paidDays = Math.floor(totalPaid / dailyEmi);
            const missedDaysCount = totalExpectedDays - paidDays;

            if (missedDaysCount > 0) {
                totalMissedCustomers++;
                const dueAmount = missedDaysCount * dailyEmi;

                // Number wise date banao - jaise 29, 30, 31 July
                const missedDates = [];
                for (let k = 0; k < missedDaysCount; k++) {
                    const d = new Date(todayDate);
                    d.setDate(d.getDate() - k);
                    const dateStr = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}`;
                    missedDates.push(dateStr);
                }
                const missedStr = missedDates.join(', ');

                html += `
                    <div class="missed-item" onclick="showMissedDetails('${cust.name}', ${dueAmount}, '${missedStr}')">
                        <div>
                            <span class="name">${cust.name}</span>
                            <span style="font-size:12px;color:#666;margin-left:8px;">- ₹${dueAmount} pending</span>
                            <div style="font-size:11px;color:#dc2626;margin-top:2px;">Missed: ${missedDaysCount} din (${missedStr})</div>
                        </div>
                        <span class="badge">₹${dueAmount}</span>
                    </div>
                `;
            }
        });

        if (totalMissedCustomers === 0) {
            loadingEl.innerText = "✅ Sabhi ka payment clear hai!";
            listEl.innerHTML = "";
        } else {
            loadingEl.innerText = `📌 ${totalMissedCustomers} customers pending:`;
            listEl.innerHTML = html;
        }

        window.showMissedDetails = (name, amount, dates) => {
            alert(`📋 ${name}\nPending Amount: ₹${amount}\nMissed Dates (Number wise): ${dates}`);
        };

    } catch (err) {
        console.error(err);
        loadingEl.innerText = "❌ Error: " + err.message;
    }
}

document.addEventListener('DOMContentLoaded', loadMissedDates);
