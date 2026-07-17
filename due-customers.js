// ==========================================================
// 🚀 GDA FINANCE - DUE CUSTOMER LIST (DATE FILTER + TOTAL DUE)
// ==========================================================

import { db, auth } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const dueList = document.getElementById("dueList");
const dueCounter = document.getElementById("dueCounter");
const datePicker = document.getElementById("dueDatePicker");
const btnToday = document.getElementById("btnToday");
const totalDueLabel = document.getElementById("totalDueAmount");

// आज की तारीख (IST)
const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
if (datePicker) datePicker.value = todayIST;

// =========================================================
// 1️⃣ ड्यू (Due) लिस्ट (List) लोड (Load) करें – सिर्फ Selected Date के हिसाब से
// =========================================================
async function loadDueCustomers(targetDateStr) {
    if (!targetDateStr) {
        dueList.innerHTML = `<tr><td colspan="5" class="empty-msg">❌ कोई तारीख (Date) चुनें!</td></tr>`;
        if (totalDueLabel) totalDueLabel.innerText = "Total Due: ₹0";
        if (dueCounter) dueCounter.innerText = "Pending Due List (0)";
        return;
    }

    // ऐरर (Error) से बचने (Avoid) के लिए टारगेट (Target) डेट (Date) को ऑब्जेक्ट (Object) में बदलें (Convert)
    const targetDate = new Date(targetDateStr);
    
    dueList.innerHTML = `<tr><td colspan="5" class="empty-msg">⏳ ${targetDateStr} का डेटा लोड हो रहा है...</td></tr>`;
    if (totalDueLabel) totalDueLabel.innerText = "Total Due: ₹0";

    try {
        const querySnapshot = await getDocs(collection(db, "customers"));
        let htmlContent = "";
        let pendingCount = 0;
        let totalDueSum = 0;

        querySnapshot.forEach((doc) => {
            const cust = doc.data();
            if (cust.status === "Closed") return;

            // ✅ लोन डेट (Loan Date) को टारगेट (Target) डेट (Date) के साथ कैलकुलेट (Calculate) करें
            const loanDate = new Date(cust.loanDate);
            const today = new Date(targetDate); // 🔥 अब आज (Today) की जगह Selected Date इस्तेमाल (Use) होगी
            
            // 🔥 दिनों (Days) का अंतर (Difference) – +1 इसलिए (So that) कि उस दिन (Day) का EMI भी गिना (Count) जाए
            let diffDays = Math.floor((today - loanDate) / (1000 * 60 * 60 * 24));
            let daysElapsed = Math.max(0, diffDays) + 1; 
            
            const dailyEmi = Number(cust.dailyEmi || cust.emi || 0);
            const expectedAmt = daysElapsed * dailyEmi;
            const totalPaid = Number(cust.totalCollected || 0);
            const currentDue = Math.max(0, expectedAmt - totalPaid);

            // अगर (If) बकाया (Due) है – तो (Then) टेबल (Table) में दिखाएं (Show)
            if (currentDue > 0) {
                pendingCount++;
                totalDueSum += currentDue;
                htmlContent += `
                <tr>
                    <td>
                        <strong>${cust.name}</strong>
                        <br>
                        <small style="color:var(--text-muted); font-size:11px;">${cust.customerCode || 'GDA'}</small>
                    </td>
                    <td>${cust.mobile || 'N/A'}</td>
                    <td>₹${dailyEmi}</td>
                    <td style="color:var(--danger); font-weight:bold;">₹${currentDue}</td>
                    <td>
                        <a href="collection.html?id=${doc.id}" class="btn-collect-sm">Collect</a>
                    </td>
                </tr>`;
            }
        });

        // 🔥 कुल (Total) बकाया (Due) अपडेट (Update) करें
        if (totalDueLabel) {
            totalDueLabel.innerText = `Total Due: ₹${totalDueSum}`;
        }

        // टेबल (Table) अपडेट (Update) करें
        if (htmlContent === "") {
            dueList.innerHTML = `<tr><td colspan="5" class="empty-msg">✅ ${targetDateStr} तक कोई बकाया नहीं!</td></tr>`;
            if (dueCounter) dueCounter.innerText = "Pending Due List (0)";
        } else {
            dueList.innerHTML = htmlContent;
            if (dueCounter) dueCounter.innerText = `Pending Due List (${pendingCount})`;
        }

    } catch (err) {
        console.error("Error loading due list:", err);
        dueList.innerHTML = `<tr><td colspan="5" class="empty-msg">❌ डेटा लोड करने में गलती: ${err.message}</td></tr>`;
    }
}

// =========================================================
// 2️⃣ इवेंट (Events) – Date Picker और "Today" बटन (Button)
// =========================================================
if (datePicker) {
    datePicker.addEventListener("change", (e) => {
        loadDueCustomers(e.target.value);
    });
}

if (btnToday) {
    btnToday.addEventListener("click", () => {
        if (datePicker) {
            datePicker.value = todayIST;
            loadDueCustomers(todayIST);
        }
    });
}

// =========================================================
// 3️⃣ 🔥 पेज (Page) लोड (Load) होने पर – `onAuthStateChanged` का इंतज़ार (Wait) करें
// =========================================================
auth.onAuthStateChanged((user) => {
    if (!user) {
        dueList.innerHTML = `<tr><td colspan="5" class="empty-msg">❌ कृपया पहले लॉगिन (Login) करें!</td></tr>`;
        window.location.href = "login.html";
        return;
    }
    // ✅ यूज़र (User) लॉगिन (Logged in) है – आज (Today) के हिसाब से (According to) ड्यू (Due) लोड (Load) करें
    loadDueCustomers(todayIST);
});
