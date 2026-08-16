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
const monthPicker = document.getElementById("historyMonthPicker");
const btnToday = document.getElementById("btnToday");
const totalLabel = document.getElementById("totalAmountLabel");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");
const modeDaily = document.getElementById("modeDaily");
const modeWeekly = document.getElementById("modeWeekly");
const modeMonthly = document.getElementById("modeMonthly");

const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
if (datePicker) datePicker.value = todayIST;
if (monthPicker) monthPicker.value = todayIST.slice(0, 7);

let currentMode = "Daily";
let currentLogArray = [];
let currentTotalAmount = 0;
let currentRangeLabel = "";

// ============================================================
// 📆 चुने हुए Mode के हिसाब से Start/End Date Range निकालना
// ============================================================
function getCurrentRange() {
    if (currentMode === "Daily") {
        const d = datePicker.value;
        return { start: d, end: d, label: d };
    }
    if (currentMode === "Weekly") {
        const base = new Date(datePicker.value || todayIST);
        const day = base.getDay(); // 0=Sun...6=Sat
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const monday = new Date(base);
        monday.setDate(base.getDate() + diffToMonday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const start = monday.toISOString().split('T')[0];
        const end = sunday.toISOString().split('T')[0];
        return { start, end, label: `${start} to ${end}` };
    }
    // Monthly
    const [yyyy, mm] = (monthPicker.value || todayIST.slice(0, 7)).split('-').map(Number);
    const start = `${yyyy}-${String(mm).padStart(2, '0')}-01`;
    const lastDay = new Date(yyyy, mm, 0).getDate();
    const end = `${yyyy}-${String(mm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end, label: `${start} to ${end}` };
}

// ============================================================
// 🔄 Mode Tabs Switch
// ============================================================
function setMode(mode) {
    currentMode = mode;
    [modeDaily, modeWeekly, modeMonthly].forEach(b => b.classList.remove('active'));
    if (mode === "Daily") { modeDaily.classList.add('active'); datePicker.style.display = ''; monthPicker.style.display = 'none'; }
    if (mode === "Weekly") { modeWeekly.classList.add('active'); datePicker.style.display = ''; monthPicker.style.display = 'none'; }
    if (mode === "Monthly") { modeMonthly.classList.add('active'); datePicker.style.display = 'none'; monthPicker.style.display = ''; }
    refresh();
}
modeDaily.addEventListener("click", () => setMode("Daily"));
modeWeekly.addEventListener("click", () => setMode("Weekly"));
modeMonthly.addEventListener("click", () => setMode("Monthly"));

function refresh() {
    const { start, end, label } = getCurrentRange();
    loadFilteredHistory(start, end, label);
}

// ============================================================
// 📊 History Load (Date Range Support)
// ============================================================
async function loadFilteredHistory(startStr, endStr, rangeLabel) {
    if (!startStr || !endStr) {
        historyList.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px;">❌ कोई तारीख (Date) चुनें!</td></tr>`;
        if (totalLabel) totalLabel.innerText = "₹0";
        return;
    }

    historyList.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-light);"><i class="fas fa-spinner fa-spin"></i> ${rangeLabel} का डेटा लोड हो रहा है...</td></tr>`;
    if (totalLabel) totalLabel.innerText = "₹0";

    try {
        const [collectionsSnap, customersSnap] = await Promise.all([
            getDocs(collection(db, "collections")),
            getDocs(collection(db, "customers"))
        ]);

        let customerMap = {};
        customersSnap.forEach((cDoc) => {
            customerMap[cDoc.id] = cDoc.data();
        });

        let logArray = [];
        let totalAmount = 0;

        collectionsSnap.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data.date) return;
            const normDate = normalizeDate(data.date);
            if (normDate && normDate >= startStr && normDate <= endStr) {
                const linked = customerMap[data.customerId] || {};
                logArray.push({
                    id: docSnap.id,
                    ...data,
                    normDate,
                    resolvedName: data.customerName || linked.name || "Unknown Customer",
                    resolvedMobile: data.customerMobile || data.mobile || linked.mobile || "Not Recorded"
                });
                totalAmount += Number(data.amount || 0);
            }
        });

        historyList.innerHTML = "";

        if (logArray.length === 0) {
            historyList.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">📭 ${rangeLabel} में कोई कलेक्शन (Collection) नहीं हुआ।</td></tr>`;
            if (totalLabel) totalLabel.innerText = "₹0";
            currentLogArray = [];
            currentTotalAmount = 0;
            currentRangeLabel = rangeLabel;
            return;
        }

        logArray.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

        logArray.forEach((collect) => {
            let finalDateDisplay = collect.date || (collect.createdAt ? collect.createdAt.split("T")[0] : "-");
            let finalNameDisplay = collect.resolvedName;
            let finalMobileDisplay = collect.resolvedMobile;
            let memberIdDisplay = collect.customerCode || collect.memberId || (customerMap[collect.customerId] || {}).customerCode || (customerMap[collect.customerId] || {}).memberId || "";
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

        if (totalLabel) totalLabel.innerText = `₹${totalAmount.toLocaleString('en-IN')}`;

        // PDF के लिए save कर लेना
        currentLogArray = logArray;
        currentTotalAmount = totalAmount;
        currentRangeLabel = rangeLabel;

    } catch (error) {
        console.error("Technical operational log issue:", error);
        historyList.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--danger); font-weight: 600;">⚠️ Technical exception encountered while retrieving transaction data.</td></tr>`;
        if (totalLabel) totalLabel.innerText = "₹0";
    }
}

// ============================================================
// 📄 COLLECTION REPORT PDF (Daily/Weekly/Monthly)
// ============================================================
function generateCollectionPDF() {
    if (!currentLogArray || currentLogArray.length === 0) {
        alert("❌ इस period में कोई collection नहीं है, PDF नहीं बन सकती।");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = 210, pageH = 297, margin = 14;
    let y = margin;

    function drawHeader() {
        doc.setFillColor(58, 28, 98);
        doc.rect(0, 0, pageW, 26, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('GDA FINANCE SERVICES', pageW / 2, 12, { align: 'center' });
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`${currentMode} Collection Report`, pageW / 2, 19, { align: 'center' });
        doc.setFontSize(8.5);
        doc.text(`Period: ${currentRangeLabel}`, pageW / 2, 24.5, { align: 'center' });
        y = 34;
    }

    function drawTableHeader() {
        doc.setFillColor(240, 240, 245);
        doc.rect(margin, y, pageW - margin * 2, 8, 'F');
        doc.setTextColor(30, 30, 40);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.text('#', margin + 2, y + 5.5);
        doc.text('Date', margin + 10, y + 5.5);
        doc.text('Customer', margin + 32, y + 5.5);
        doc.text('Mobile', margin + 95, y + 5.5);
        doc.text('Mode', margin + 125, y + 5.5);
        doc.text('Amount', pageW - margin - 2, y + 5.5, { align: 'right' });
        y += 10;
    }

    drawHeader();
    drawTableHeader();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    currentLogArray.forEach((collect, idx) => {
        if (y > pageH - 35) {
            doc.addPage();
            y = margin;
            drawHeader();
            drawTableHeader();
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
        }

        const name = collect.resolvedName || 'N/A';
        const mobile = collect.resolvedMobile || 'N/A';
        const mode = collect.mode || 'Cash';
        const amt = Number(collect.amount || 0);
        const dateDisp = collect.date || '-';

        if (idx % 2 === 0) {
            doc.setFillColor(250, 250, 252);
            doc.rect(margin, y - 4.5, pageW - margin * 2, 7, 'F');
        }

        doc.setTextColor(20, 20, 30);
        doc.text(String(idx + 1), margin + 2, y);
        doc.text(dateDisp, margin + 10, y);
        doc.text(name.length > 28 ? name.slice(0, 26) + '..' : name, margin + 32, y);
        doc.text(mobile, margin + 95, y);
        doc.text(mode, margin + 125, y);
        doc.setTextColor(5, 150, 105);
        doc.setFont('helvetica', 'bold');
        doc.text(`Rs.${amt.toLocaleString('en-IN')}`, pageW - margin - 2, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(20, 20, 30);

        y += 7;
    });

    // ---- SUMMARY BOX ----
    if (y > pageH - 55) { doc.addPage(); y = margin; drawHeader(); }
    y += 6;
    const uniqueCustomers = new Set(currentLogArray.map(c => c.customerId || c.customerName)).size;

    doc.setFillColor(233, 249, 239);
    doc.setDrawColor(167, 243, 208);
    doc.rect(margin, y, pageW - margin * 2, 22, 'FD');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 120, 70);
    doc.text(`Total Collected: Rs. ${currentTotalAmount.toLocaleString('en-IN')}`, margin + 6, y + 9);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Transactions: ${currentLogArray.length}   |   Unique Customers: ${uniqueCustomers}`, margin + 6, y + 17);
    y += 32;

    // ---- SIGNATURE LINE ----
    if (y > pageH - 30) { doc.addPage(); y = margin + 10; }
    doc.setDrawColor(15, 23, 42);
    doc.line(margin, y, margin + 60, y);
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Collected By (Signature)', margin, y + 5);

    doc.line(pageW - margin - 60, y, pageW - margin, y);
    doc.text('Verified By (Manager)', pageW - margin - 60, y + 5);

    doc.save(`GDA_${currentMode}_Collection_Report_${currentRangeLabel.replace(/\s/g, '_')}.pdf`);
}

if (downloadPdfBtn) downloadPdfBtn.addEventListener("click", generateCollectionPDF);

if (datePicker) {
    datePicker.addEventListener("change", () => refresh());
}
if (monthPicker) {
    monthPicker.addEventListener("change", () => refresh());
}

if (btnToday) {
    btnToday.addEventListener("click", () => {
        setMode("Daily");
        datePicker.value = todayIST;
        refresh();
    });
}

auth.onAuthStateChanged((user) => {
    if (!user) {
        historyList.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px;">❌ कृपया पहले लॉगिन (Login) करें!</td></tr>`;
        window.location.href = "login.html";
        return;
    }
    refresh();
});
