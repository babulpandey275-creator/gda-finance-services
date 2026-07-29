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

        // Har customer ke liye usne kin dates ko paisa diya, wo set banao
        const paidDatesMap = new Map(); // customerId -> Set of YYYY-MM-DD
        colSnap.forEach(doc => {
            const d = doc.data();
            const cId = d.customerId;
            const dateStr = d.collectionDate || d.date || d.paymentDate; // aapke collection me jo naam ho
            if (!cId ||!dateStr) return;
            const norm = String(dateStr).split('T')[0]; // 2026-07-29
            if (!paidDatesMap.has(cId)) paidDatesMap.set(cId, new Set());
            paidDatesMap.get(cId).add(norm);
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
            const totalDays = diffDays + 1;

            const paidSet = paidDatesMap.get(id) || new Set();
            const missedDates = [];

            for (let i = 0; i < totalDays; i++) {
                const d = new Date(loanDateObj);
                d.setDate(d.getDate() + i);
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth()+1).padStart(2,'0');
                const dd = String(d.getDate()).padStart(2,'0');
                const dateStr = `${yyyy}-${mm}-${dd}`;
                if (!paidSet.has(dateStr)) {
                    missedDates.push(dateStr);
                }
            }

            if (missedDates.length > 0) {
                totalMissedCustomers++;
                const missedStr = missedDates.join(', ');
                html += `
                    <div class="missed-item" onclick="showMissedDetails('${cust.name}', '${missedStr}')">
                        <div><span class="name">${cust.name}</span><span style="font-size:12px;color:#666;margin-left:10px;">📅 Missed: ${missedDates.length} days (₹${missedDates.length*dailyEmi})</span></div>
                        <span class="badge">View</span>
                    </div>
                `;
            }
        });

        if (totalMissedCustomers === 0) {
            loadingEl.innerText = "✅ Sabhi ne time pe payment kiya hai!";
            listEl.innerHTML = "";
        } else {
            loadingEl.innerText = `📌 ${totalMissedCustomers} customer ki missed dates hain:`;
            listEl.innerHTML = html;
        }

        window.showMissedDetails = (name, dates) => {
            const dateArray = dates.split(', ');
            alert(`📋 ${name} ki Missed tarikhein:\n\n • ${dateArray.join('\n • ')}`);
        };

    } catch (err) {
        console.error(err);
        loadingEl.innerText = "❌ Error: " + err.message;
    }
}
document.addEventListener('DOMContentLoaded', loadMissedDates);
