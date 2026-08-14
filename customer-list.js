import { db, auth } from "./firebase.js";
import { collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const listContainer = document.getElementById("listContainer");
const searchInp = document.getElementById("searchInp");
const ADMIN_PASSWORD = "GDA@2026";

// कोई internet न हो तो टूटा हुआ icon न दिखे, इसलिए local placeholder
const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 55 55'%3E%3Ccircle cx='27.5' cy='27.5' r='27.5' fill='%23F1F5F9'/%3E%3Ctext x='27.5' y='35' font-size='20' text-anchor='middle'%3E%F0%9F%91%A4%3C/text%3E%3C/svg%3E";

// ============================================================
// 💰 DUE CALCULATION (बाकी app जैसा ही formula — Overdue Interest शामिल)
// ============================================================
function getOverdueRate(planDur) {
  if (planDur <= 60) return 0.10;
  if (planDur <= 80) return 0.20;
  return 0.30;
}

function calculateCardDue(cust) {
  if (cust.status === 'Settled' || cust.status === 'Closed') return 0;
  const dailyEmi = Number(cust.dailyEmi || cust.emi || 0);
  if (dailyEmi <= 0) return 0;

  const planDur = Number(cust.planDuration || cust.duration || 60);
  const loanDate = new Date(cust.loanDate || cust.startDate || new Date());
  const today = new Date();
  let daysElapsedRaw = Math.max(0, Math.floor((today - loanDate) / (1000 * 60 * 60 * 24))) + 1;
  let daysElapsed = Math.min(daysElapsedRaw, planDur);

  const expectedAmt = daysElapsed * dailyEmi;
  const totalPaid = Number(cust.totalCollected || 0);
  const baseDue = Math.max(0, expectedAmt - totalPaid);

  let overdueInterest = 0;
  if (daysElapsedRaw > planDur && baseDue > 0) {
    const extraDays = daysElapsedRaw - planDur;
    overdueInterest = extraDays * (dailyEmi * getOverdueRate(planDur));
  }
  return Math.max(0, baseDue + overdueInterest);
}

let allCustomers = [];
let allCollections = [];
let selectedCustomer = null;
let currentTab = "active"; // "active" | "closed"

const drawer = document.getElementById("drawer");
const drawerOverlay = document.getElementById("drawerOverlay");

// ============================================================
// LOAD
// ============================================================
async function loadCustomers() {
    listContainer.innerHTML = "<p style='text-align:center; padding:20px; color:#94A3B8;'>⏳ लोड हो रहा है...</p>";
    try {
        const [custSnap, colSnap] = await Promise.all([
            getDocs(collection(db, "customers")),
            getDocs(collection(db, "collections"))
        ]);
        allCustomers = custSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        allCollections = colSnap.docs.map(d => d.data());
        applyFilters();
    } catch (err) {
        listContainer.innerHTML = "<p style='text-align:center; padding:20px; color:#DC2626;'>❌ डेटा लोड नहीं हुआ।</p>";
        console.error(err);
    }
}

// ============================================================
// RENDER
// ============================================================
function renderList(data) {
    listContainer.innerHTML = "";
    if (data.length === 0) {
        listContainer.innerHTML = "<p style='text-align:center; padding:20px; color:#94A3B8;'>कोई कस्टमर नहीं मिला।</p>";
        return;
    }

    data.forEach(cust => {
        const card = document.createElement("div");
        card.className = "cust-card";

        const imageUrl = (cust.photoUrl && cust.photoUrl.startsWith('http')) ? cust.photoUrl : PLACEHOLDER_IMG;
        const dueAmt = calculateCardDue(cust);
        const dueBadge = dueAmt > 0
            ? `<span class="due-badge">⚠️ ₹${Math.round(dueAmt).toLocaleString('en-IN')} Due</span>`
            : `<span class="due-badge ok">✅ Up to date</span>`;

        card.onclick = () => openDrawer(cust);

        card.innerHTML = `
        <div class="cust-top">
            <img src="${imageUrl}">
            <div>
                <div class="cust-name">${cust.name || "N/A"}</div>
                <div class="cust-sub">📱 ${cust.mobile || "N/A"} &nbsp;|&nbsp; ${cust.customerCode || ''}</div>
                <div class="cust-sub">💰 लोन: ₹${cust.loanAmount || 0}</div>
                ${dueBadge}
            </div>
        </div>
        <div class="cust-actions">
            <a href="collection.html?id=${cust.id}" data-stop="1" class="btn-collect">Collect</a>
            <button data-action="delete" data-id="${cust.id}" class="btn-del">Del</button>
            <button data-action="edit" data-id="${cust.id}" class="btn-edit">Edit</button>
        </div>`;

        // Collect लिंक/Del/Edit बटन पर card का drawer न खुले
        card.querySelector('[data-stop]').addEventListener('click', e => e.stopPropagation());
        card.querySelector('[data-action="delete"]').addEventListener('click', e => {
            e.stopPropagation();
            secureDelete(cust.id);
        });
        card.querySelector('[data-action="edit"]').addEventListener('click', e => {
            e.stopPropagation();
            secureEdit(cust.id);
        });

        listContainer.appendChild(card);
    });
}

function applyFilters() {
    let base = currentTab === "closed"
        ? allCustomers.filter(c => c.status === 'Closed' || c.status === 'Settled')
        : allCustomers.filter(c => c.status !== 'Closed' && c.status !== 'Settled');

    const term = (searchInp?.value || "").toLowerCase().trim();
    if (term) {
        base = base.filter(c =>
            (c.name && c.name.toLowerCase().includes(term)) ||
            (c.mobile && c.mobile.includes(term)) ||
            (c.customerCode && c.customerCode.toLowerCase().includes(term))
        );
    }
    renderList(base);
}

// ============================================================
// BOND PAPER DRAWER (quick preview) — Full Bond (signature/stamp) अलग page पर
// ============================================================
function openDrawer(cust) {
    selectedCustomer = cust;
    const dueAmt = calculateCardDue(cust);
    const totalPaid = Number(cust.totalCollected || 0);

    document.getElementById("drawerName").innerText = cust.name || 'Customer';
    document.getElementById("bondPaper").innerHTML = `
      <h4 style="text-align:center;font-weight:800;color:#92400E;margin-bottom:10px;">📄 GDA FINANCE - QUICK SUMMARY</h4>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #FDE68A;font-size:12px;"><span>Name:</span><b>${cust.name || '-'}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #FDE68A;font-size:12px;"><span>Code:</span><b>${cust.customerCode || 'GDA'}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #FDE68A;font-size:12px;"><span>Mobile:</span><b>${cust.mobile || ''}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #FDE68A;font-size:12px;"><span>Loan:</span><b>₹${cust.loanAmount || 0}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #FDE68A;font-size:12px;"><span>EMI:</span><b>₹${cust.dailyEmi || cust.emi || 0}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #FDE68A;font-size:12px;"><span>Paid:</span><b>₹${totalPaid}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;"><span>Remaining:</span><b style="color:#DC2626;">₹${dueAmt.toLocaleString('en-IN')}</b></div>
    `;

    const hist = allCollections
        .filter(x => x.customerId === cust.id)
        .sort((a, b) => new Date(b.date || b.collectionDate) - new Date(a.date || a.collectionDate))
        .slice(0, 20);

    document.getElementById("historyList").innerHTML = hist.length
        ? `<h5 style="font-size:11px;color:#64748B;margin-bottom:8px;">📊 Collection History</h5>` +
          hist.map(h => `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:11px;border-bottom:1px solid #F1F5F9;"><span>${h.date || h.collectionDate}</span><b>₹${h.amount || h.collectionAmount || 0}</b></div>`).join('')
        : `<p style="text-align:center;color:#94A3B8;font-size:12px;">अभी तक कोई collection नहीं</p>`;

    // 📜 Bond button — असली bond.html (signature pad + company stamp) खुलेगा
    const bondBtn = document.getElementById("btnBond");
    if (bondBtn) bondBtn.href = `bond.html?id=${cust.id}`;

    drawer.style.transform = 'translateY(0)';
    drawerOverlay.style.display = 'block';
    setTimeout(() => drawerOverlay.classList.add("active"), 10);
}

function closeDrawer() {
    drawer.style.transform = 'translateY(100%)';
    drawerOverlay.classList.remove("active");
    setTimeout(() => { drawerOverlay.style.display = 'none'; }, 250);
}

document.getElementById("closeDrawer")?.addEventListener('click', closeDrawer);
drawerOverlay?.addEventListener('click', closeDrawer);

// WhatsApp (drawer के अंदर से)
document.getElementById("btnWhatsapp")?.addEventListener('click', () => {
    if (!selectedCustomer) return;
    const msg = `*GDA Finance Services*%0A%0A*Bond Paper*%0AName: ${selectedCustomer.name}%0ACode: ${selectedCustomer.customerCode}%0AMobile: ${selectedCustomer.mobile}%0ALoan: ₹${selectedCustomer.loanAmount}%0AEMI: ₹${selectedCustomer.dailyEmi || selectedCustomer.emi}%0APaid: ₹${selectedCustomer.totalCollected || 0}`;
    window.open(`https://wa.me/91${selectedCustomer.mobile}?text=${msg}`, '_blank');
});

// ============================================================
// 🖼️ किसी भी image URL को base64 में बदलना (PDF में फोटो लगाने के लिए)
// ============================================================
function loadImageAsBase64(url) {
    return new Promise((resolve) => {
        if (!url || !url.startsWith('http')) { resolve(null); return; }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            } catch (e) {
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

function ensureSpace(doc, y, needed, margin) {
    if (y + needed > 275) {
        doc.addPage();
        return margin;
    }
    return y;
}

// ============================================================
// 📄 PDF — पूरी KYC + Collection History + Photo (Statement page जैसा rich version)
// ============================================================
document.getElementById("btnPdf")?.addEventListener('click', async () => {
    if (!selectedCustomer) return;
    const pdfBtn = document.getElementById("btnPdf");
    const originalText = pdfBtn.innerText;
    pdfBtn.innerText = '⏳ Generating...';

    try {
        const cust = selectedCustomer;
        const logs = allCollections
            .filter(x => x.customerId === cust.id)
            .sort((a, b) => new Date(b.date || b.collectionDate) - new Date(a.date || a.collectionDate));

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageW = 210;
        const margin = 16;
        let y = margin;

        const aadharValue = cust.aadhar || cust.aadhaar || 'Not Provided';
        const panValue = cust.pan || cust.panCard || cust.panNumber || 'Not Provided';

        const photoUrl = (cust.photoUrl && cust.photoUrl.startsWith('http')) ? cust.photoUrl : null;
        const photoBase64 = await loadImageAsBase64(photoUrl);

        // ---- HEADER ----
        doc.setFillColor(26, 35, 53);
        doc.rect(margin, y, pageW - (margin * 2), 28, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('GDA FINANCE SERVICES', pageW / 2, y + 12, { align: 'center' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(200, 200, 200);
        doc.text('Digital Loan Distribution & Micro Finance System', pageW / 2, y + 22, { align: 'center' });
        y += 32;

        doc.setTextColor(26, 35, 53);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('CUSTOMER KYC & STATEMENT REPORT', pageW / 2, y, { align: 'center' });
        y += 6;
        doc.setDrawColor(26, 35, 53);
        doc.setLineWidth(0.5);
        doc.line(margin + 20, y, pageW - margin - 20, y);
        y += 10;

        // ---- CUSTOMER DETAILS BOX (फोटो के साथ) ----
        const boxH = 52;
        doc.setFillColor(248, 250, 255);
        doc.setDrawColor(200, 200, 210);
        doc.setLineWidth(0.3);
        doc.rect(margin, y, pageW - (margin * 2), boxH, 'FD');

        if (photoBase64) {
            try {
                const photoSize = 26;
                const photoX = pageW - margin - photoSize - 8;
                const photoY = y + (boxH - photoSize) / 2;
                doc.addImage(photoBase64, 'JPEG', photoX, photoY, photoSize, photoSize);
                doc.setDrawColor(220, 220, 220);
                doc.rect(photoX, photoY, photoSize, photoSize);
            } catch (e) {}
        }

        doc.setFontSize(9);
        const leftX = margin + 8;
        const rightX = pageW / 2 - 8;
        let ry = y + 6;
        const rowH = 10;

        const leftFields = [
            { label: 'Name', value: cust.name || 'N/A' },
            { label: 'Mobile', value: cust.mobile || 'N/A' },
            { label: 'EMI', value: `Rs. ${cust.dailyEmi || cust.emi || 0}` },
            { label: 'Total Paid', value: `Rs. ${cust.totalCollected || 0}` }
        ];
        leftFields.forEach((f, idx) => {
            const yy = ry + (idx * rowH);
            doc.setTextColor(120, 120, 130);
            doc.setFont('helvetica', 'normal');
            doc.text(f.label + ':', leftX, yy);
            doc.setTextColor(26, 35, 53);
            doc.setFont('helvetica', 'bold');
            const val = doc.splitTextToSize(String(f.value), 55)[0];
            doc.text(val, leftX + 28, yy);
        });

        const rightFields = [
            { label: 'Code', value: cust.customerCode || 'GDA' },
            { label: 'Loan Date', value: cust.loanDate || cust.startDate || 'N/A' },
            { label: 'Duration', value: `${cust.planDuration || cust.duration || 60} Days` },
            { label: 'Loan Amt', value: `Rs. ${cust.loanAmount || 0}` }
        ];
        rightFields.forEach((f, idx) => {
            const yy = ry + (idx * rowH);
            doc.setTextColor(120, 120, 130);
            doc.setFont('helvetica', 'normal');
            doc.text(f.label + ':', rightX, yy);
            doc.setTextColor(26, 35, 53);
            doc.setFont('helvetica', 'bold');
            doc.text(String(f.value), rightX + 26, yy);
        });
        y += boxH + 4;

        // ---- REMAINING BALANCE ----
        const isSettledCust = (cust.status === 'Settled' || cust.status === 'Closed');
        const remaining = isSettledCust ? 0 : calculateCardDue(cust);
        doc.setFillColor(remaining > 0 ? 254 : 236, remaining > 0 ? 242 : 253, remaining > 0 ? 242 : 245);
        doc.setDrawColor(remaining > 0 ? 220 : 180, remaining > 0 ? 38 : 220, remaining > 0 ? 38 : 150);
        doc.rect(margin, y, pageW - (margin * 2), 12, 'FD');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(remaining > 0 ? 185 : 5, remaining > 0 ? 28 : 120, remaining > 0 ? 28 : 70);
        doc.text(
            remaining > 0 ? `REMAINING BALANCE: Rs. ${remaining.toLocaleString('en-IN')}` : 'ACCOUNT FULLY SETTLED',
            pageW / 2, y + 8, { align: 'center' }
        );
        y += 18;

        // ---- KYC DETAILS ----
        y = ensureSpace(doc, y, 30, margin);
        doc.setFillColor(255, 251, 235);
        doc.setDrawColor(220, 180, 80);
        doc.rect(margin, y, pageW - (margin * 2), 30, 'FD');
        doc.setTextColor(120, 80, 10);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('KYC VERIFICATION DETAILS', margin + 8, y + 6);
        doc.setTextColor(60, 60, 70);
        doc.setFont('helvetica', 'normal');
        const kycY = y + 14;
        doc.text(`Aadhar: ${aadharValue}`, margin + 8, kycY);
        doc.text(`PAN: ${panValue}`, margin + 70, kycY);
        doc.text(`Status: ${cust.status || 'Active'}`, margin + 130, kycY);
        const addressLines = doc.splitTextToSize(`Address: ${cust.address || 'Not Provided'}`, pageW - (margin * 2) - 16);
        doc.text(addressLines[0] || '', margin + 8, kycY + 8);
        y += 34;

        // ---- COLLECTION HISTORY ----
        y = ensureSpace(doc, y, 20, margin);
        doc.setTextColor(26, 35, 53);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('COLLECTION HISTORY (EMI LOGS)', margin, y);
        y += 6;
        doc.setDrawColor(200, 200, 210);
        doc.setLineWidth(0.2);
        doc.line(margin, y, pageW - margin, y);
        y += 4;

        const col1 = margin + 4, col2 = margin + 50, col3 = margin + 110, col4 = margin + 160;
        function drawTableHeader(yy) {
            doc.setFillColor(240, 245, 255);
            doc.rect(margin, yy, pageW - (margin * 2), 8, 'F');
            doc.setTextColor(60, 60, 80);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text('Date', col1, yy + 5.5);
            doc.text('Note', col2, yy + 5.5);
            doc.text('Amount', col3, yy + 5.5);
            doc.text('Action', col4, yy + 5.5);
            return yy + 8;
        }
        y = drawTableHeader(y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        let logsTotal = 0;

        if (logs.length === 0) {
            doc.setTextColor(40, 40, 50);
            doc.text('No collection records found.', margin + 8, y + 5);
            y += 10;
        } else {
            logs.forEach((log, idx) => {
                const date = log.date || log.collectionDate || 'N/A';
                const note = log.note || 'EMI Received';
                const amountNum = Number(log.amount || log.collectionAmount || 0);
                logsTotal += amountNum;

                if (y + 7 > 270) {
                    doc.addPage();
                    y = margin;
                    y = drawTableHeader(y);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                }
                if (idx % 2 === 0) {
                    doc.setFillColor(248, 250, 255);
                    doc.rect(margin, y, pageW - (margin * 2), 7, 'F');
                }
                doc.setTextColor(40, 40, 50);
                doc.text(String(date), col1, y + 4.5);
                doc.text(String(note), col2, y + 4.5);
                doc.text(`Rs. ${amountNum}`, col3, y + 4.5);
                doc.text('Paid', col4, y + 4.5);
                y += 7;
            });

            y = ensureSpace(doc, y, 10, margin);
            doc.setDrawColor(26, 35, 53);
            doc.line(margin, y, pageW - margin, y);
            y += 6;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(26, 35, 53);
            doc.text(`Total Collected (${logs.length} entries): Rs. ${logsTotal.toLocaleString('en-IN')}`, margin + 4, y);
            y += 10;
        }

        // ---- FOOTER + PAGE NUMBERS ----
        const now = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setDrawColor(200, 200, 210);
            doc.line(margin, 285, pageW - margin, 285);
            doc.setTextColor(150, 150, 160);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated on: ${now} | GDA Finance Services`, margin, 291);
            doc.text(`Page ${i} of ${totalPages}`, pageW - margin, 291, { align: 'right' });
        }

        doc.save(`${(cust.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_')}_GDA_Statement.pdf`);

    } catch (err) {
        console.error('PDF generation error:', err);
        alert('PDF banane me error aayi: ' + err.message);
    } finally {
        pdfBtn.innerText = originalText;
    }
});

// ============================================================
// FILTER TABS
// ============================================================
document.getElementById("btnActive")?.addEventListener('click', function () {
    currentTab = "active";
    this.classList.add("active");
    document.getElementById("btnClosed").classList.remove("active");
    applyFilters();
});
document.getElementById("btnClosed")?.addEventListener('click', function () {
    currentTab = "closed";
    this.classList.add("active");
    document.getElementById("btnActive").classList.remove("active");
    applyFilters();
});

// SEARCH
searchInp?.addEventListener("input", applyFilters);

// ============================================================
// EDIT / DELETE (Admin password required)
// ============================================================
function secureEdit(docId) {
    const pass = prompt("🔑 Edit करने के लिए Admin Password डालें:");
    if (pass === ADMIN_PASSWORD) {
        window.location.href = `edit.html?id=${docId}`;
    } else if (pass !== null) {
        alert("❌ गलत पासवर्ड!");
    }
}

async function secureDelete(docId) {
    const pass = prompt("⚠️ DELETE करने के लिए Admin Password डालें:");
    if (pass === ADMIN_PASSWORD) {
        if (!confirm("क्या आप वाकई इस कस्टमर को हटाना चाहते हैं?")) return;
        try {
            await deleteDoc(doc(db, "customers", docId));
            alert("✅ डिलीट सफल!");
            loadCustomers();
        } catch (err) {
            alert("❌ एरर: " + err.message);
        }
    } else if (pass !== null) {
        alert("❌ गलत पासवर्ड!");
    }
}

// ============================================================
// AUTH
// ============================================================
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        loadCustomers();
    }
});

document.getElementById("logoutBtn")?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (confirm("Logout karna hai?")) {
        await signOut(auth);
        window.location.href = "login.html";
    }
});
