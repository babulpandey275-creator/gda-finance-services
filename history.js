import { db, auth } from "./firebase.js";
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

const historyList = document.getElementById("historyList");
const datePicker = document.getElementById("historyDatePicker");
const btnToday = document.getElementById("btnToday");
const totalLabel = document.getElementById("totalAmountLabel");

const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
if (datePicker) datePicker.value = todayIST;

async function loadFilteredHistory(dateStr) {
    if (!dateStr) {
        historyList.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px;">❌ कोई तारीख (Date) चुनें!</td></tr>`;
        if (totalLabel) totalLabel.innerText = "₹0";
        return;
    }

    historyList.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-light);"><i class="fas fa-spinner fa-spin"></i> ${dateStr} का डेटा लोड हो रहा है...</td></tr>`;
    if (totalLabel) totalLabel.innerText = "₹0";

    try {
        // 🔥 सारा (All) – कलेक्शन (Collection) – फेच (Fetch) – करें (Do) – और (And) – JavaScript – में (In) – फ़िल्टर (Filter) – करें (Do)!
        const [collectionsSnap, customersSnap] = await Promise.all([
            getDocs(collection(db, "collections")),
            getDocs(collection(db, "customers"))
        ]);

        // 1. कस्टमर (Customer) – मैप (Map) – बनाएँ (Create)
        let customerMap = {};
        customersSnap.forEach((cDoc) => {
            customerMap[cDoc.id] = cDoc.data();
        });

        // 2. कलेक्शन (Collection) – को (To) – फ़िल्टर (Filter) – करें (Do) – और (And) – डेट (Date) – को (To) – नॉर्मलाइज़ (Normalize) – करें (Do)
        let logArray = [];
        let totalAmount = 0;

        collectionsSnap.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data.date) return;
            const normDate = normalizeDate(data.date);
            if (normDate === dateStr) {
                logArray.push({ id: docSnap.id, ...data });
                totalAmount += Number(data.amount || 0);
            }
        });

        historyList.innerHTML = "";

        if (logArray.length === 0) {
            historyList.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">📭 ${dateStr} को कोई कलेक्शन (Collection) नहीं हुआ।</td></tr>`;
            if (totalLabel) totalLabel.innerText = "₹0";
            return;
        }

        logArray.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

        logArray.forEach((collect) => {
            const linkedCustomer = customerMap[collect.customerId] || {};

            let finalDateDisplay = collect.date || (collect.createdAt ? collect.createdAt.split("T")[0] : "-");
            let finalNameDisplay = collect.customerName || linkedCustomer.name || "Unknown Customer";
            let finalMobileDisplay = collect.customerMobile || collect.mobile || linkedCustomer.mobile || "Not Recorded";
            let memberIdDisplay = collect.customerCode || collect.memberId || linkedCustomer.customerCode || linkedCustomer.memberId || "";
            let paymentMode = collect.mode || "Cash";
            let transactionNote = collect.note || "EMI Collection";

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="padding: 12px 8px; font-weight: 500;">${finalDateDisplay}</td>
                <td>
                    <div style="font-weight: 600; color: #1565c0;">${finalNameDisplay}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">${memberIdDisplay}</div>
                </td>
                <td style="color: #475569;">${finalMobileDisplay}</td>
                <td style="color: var(--success); font-weight: bold;">₹${collect.amount || 0}</td>
                <td><span class="badge" style="background: #e2e8f0; padding: 4px 8px; border-radius: 6px; font-size: 12px;">${paymentMode}</span></td>
                <td style="font-size: 13px; color: #64748b; font-style: italic;">${transactionNote}</td>
            `;
            historyList.appendChild(tr);
        });

        if (totalLabel) totalLabel.innerText = `₹${totalAmount}`;

    } catch (error) {
        console.error("Technical operational log issue:", error);
        historyList.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--danger); font-weight: 600;">⚠️ Technical exception encountered while retrieving transaction data.</td></tr>`;
        if (totalLabel) totalLabel.innerText = "₹0";
    }
}

if (datePicker) {
    datePicker.addEventListener("change", (e) => {
        loadFilteredHistory(e.target.value);
    });
}

if (btnToday) {
    btnToday.addEventListener("click", () => {
        if (datePicker) {
            datePicker.value = todayIST;
            loadFilteredHistory(todayIST);
        }
    });
}

auth.onAuthStateChanged((user) => {
    if (!user) {
        historyList.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px;">❌ कृपया पहले लॉगिन (Login) करें!</td></tr>`;
        window.location.href = "login.html";
        return;
    }
    loadFilteredHistory(todayIST);
});
