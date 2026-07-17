import { db, auth } from "./firebase.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// ===== 🔥 नया (New) – Date Picker और Total Amount के लिए References =====
const historyList = document.getElementById("historyList");
const datePicker = document.getElementById("historyDatePicker");
const btnToday = document.getElementById("btnToday");
const totalLabel = document.getElementById("totalAmountLabel");

const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
if (datePicker) datePicker.value = todayIST;

// =========================================================
// 1️⃣ हिस्ट्री (History) लोड (Load) करें – सिर्फ Selected Date की
// =========================================================
async function loadFilteredHistory(dateStr) {
    if (!dateStr) {
        historyList.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px;">❌ कोई तारीख (Date) चुनें!</td></tr>`;
        if (totalLabel) totalLabel.innerText = "₹0";
        return;
    }

    // ✅ लॉगिन (Login) चेक (Check)
    const currentUser = auth.currentUser;
    if (!currentUser) {
        historyList.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px;">❌ कृपया पहले लॉगिन (Login) करें!</td></tr>`;
        window.location.href = "login.html";
        return;
    }

    historyList.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-light);"><i class="fas fa-spinner fa-spin"></i> ${dateStr} का डेटा लोड हो रहा है...</td></tr>`;
    if (totalLabel) totalLabel.innerText = "₹0";

    try {
        // 🔥 1. सिर्फ (Only) उसी (Specific) तारीख (Date) के कलेक्शन (Collections) फेच (Fetch) करें
        const q = query(collection(db, "collections"), where("date", "==", dateStr));
        const qSnap = await getDocs(q);

        // 🔥 2. सारे (All) कस्टमर (Customers) फेच (Fetch) करें (नाम (Name) और मोबाइल (Mobile) मैप (Map) करने के लिए)
        const custSnap = await getDocs(collection(db, "customers"));
        let customerMap = {};
        custSnap.forEach((cDoc) => {
            customerMap[cDoc.id] = cDoc.data();
        });

        historyList.innerHTML = "";

        if (qSnap.empty) {
            historyList.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">📭 ${dateStr} को कोई कलेक्शन (Collection) नहीं हुआ।</td></tr>`;
            if (totalLabel) totalLabel.innerText = "₹0";
            return;
        }

        let totalAmount = 0;
        let logArray = [];
        qSnap.forEach((docSnap) => {
            logArray.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Sort by timestamp (नया (New) से पुराना (Old))
        logArray.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

        logArray.forEach((collect) => {
            const linkedCustomer = customerMap[collect.customerId] || {};
            totalAmount += Number(collect.amount || 0);

            let finalDateDisplay = "-";
            if (collect.date) {
                finalDateDisplay = collect.date;
            } else if (collect.createdAt) {
                finalDateDisplay = collect.createdAt.split("T")[0];
            }

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

        // 🔥 कुल (Total) राशि (Amount) दिखाएँ
        if (totalLabel) totalLabel.innerText = `₹${totalAmount}`;

    } catch (error) {
        console.error("Technical operational log issue:", error);
        historyList.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--danger); font-weight: 600;">⚠️ Technical exception encountered while retrieving transaction data.</td></tr>`;
        if (totalLabel) totalLabel.innerText = "₹0";
    }
}

// =========================================================
// 2️⃣ इवेंट (Events) – Date Picker बदलने (Change) पर और "Today" बटन (Button) पर
// =========================================================
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

// =========================================================
// 3️⃣ पेज (Page) लोड (Load) होते ही आज (Today) का हिस्ट्री (History) दिखाएँ
// =========================================================
window.addEventListener('DOMContentLoaded', async () => {
    // पहले से (Already) लोड (Load) होने वाला कोड (Code) – हमने उसे ऊपर फंक्शन (Function) में बदल (Replaced) दिया है
    // इसलिए बस (Just) आज (Today) का डेटा (Data) लोड (Load) करें
    await loadFilteredHistory(todayIST);
});
