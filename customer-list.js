import { db, auth } from "./firebase.js";
import { collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const listContainer = document.getElementById("listContainer");
const searchInp = document.getElementById("searchInp");
const ADMIN_PASSWORD = "GDA@2026";

const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 55 55'%3E%3Ccircle cx='27.5' cy='27.5' r='27.5' fill='%23F1F5F9'/%3E%3Ctext x='27.5' y='35' font-size='20' text-anchor='middle'%3E%F0%9F%91%A4%3C/text%3E%3C/svg%3E";

let allCustomers = [];
let allCollections = [];
let selectedCustomer = null;
let currentTab = "active";

const drawer = document.getElementById("drawer");
const drawerOverlay = document.getElementById("drawerOverlay");

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

function renderList(data) {
    listContainer.innerHTML = "";
    if (data.length === 0) {
        listContainer.innerHTML = "<p style='text-align:center; padding:20px; color:#94A3B8;'>कोई कस्टमर नहीं मिला।</p>";
        return;
    }

    data.forEach(cust => {
        const card = document.createElement("div");
        card.style.cssText = "background:#fff;border-radius:20px;padding:14px;display:flex;flex-direction:column;gap:10px;box-shadow:0 4px 20px rgba(58,28,98,0.05);border:1px solid #F1F5F9;margin-bottom:10px;cursor:pointer;";

        const imageUrl = (cust.photoUrl && cust.photoUrl.startsWith('http')) ? cust.photoUrl : PLACEHOLDER_IMG;

        card.onclick = () => openDrawer(cust);

        card.innerHTML = `
        <div style="display:flex;gap:12px;align-items:center;">
            <img src="${imageUrl}" style="width:55px;height:55px;border-radius:50%;object-fit:cover;border:1px solid #eee;">
            <div>
                <h4 style="margin:0;font-size:15px;color:#0F172A;">${cust.name || "N/A"}</h4>
                <p style="margin:0;font-size:12px;color:#64748b;">📱 ${cust.mobile || "N/A"}</p>
                <p style="margin:0;font-size:12px;color:#64748b;">💰 लोन: ₹${cust.loanAmount || 0} | ${cust.customerCode || ''}</p>
            </div>
        </div>
        <div style="display:flex;gap:6px;width:100%;margin-top:4px;">
            <a href="collection.html?id=${cust.id}" data-stop="1" style="background:#0F172A;color:white;flex:1;padding:9px;border-radius:10px;text-decoration:none;font-size:12px;font-weight:bold;text-align:center;">Collect</a>
            <button data-action="delete" data-id="${cust.id}" style="background:#FFF1F2;color:#E11D48;border:1px solid #FFE4E6;flex:1;padding:9px;border-radius:10px;font-size:12px;font-weight:bold;cursor:pointer;">Del</button>
            <button data-action="edit" data-id="${cust.id}" style="background:#FFFBEB;color:#92400E;border:1px solid #FEF3C7;flex:1;padding:9px;border-radius:10px;font-size:12px;font-weight:bold;cursor:pointer;">Edit</button>
        </div>`;

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

function openDrawer(cust) {
    selectedCustomer = cust;
    const remain = Math.max(0, Number(cust.loanAmount || 0) * 1.2 - Number(cust.totalCollected || 0));

    document.getElementById("drawerName").innerText = cust.name || 'Customer';
    document.getElementById("bondPaper").innerHTML = `
      <h4 style="text-align:center;font-weight:800;color:#92400E;margin-bottom:10px;">📄 GDA FINANCE - BOND PAPER</h4>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #FDE68A;font-size:12px;"><span>Name:</span><b>${cust.name || '-'}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #FDE68A;font-size:12px;"><span>Code:</span><b>${cust.customerCode || 'GDA'}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #FDE68A;font-size:12px;"><span>Mobile:</span><b>${cust.mobile || ''}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #FDE68A;font-size:12px;"><span>Loan:</span><b>₹${cust.loanAmount || 0}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #FDE68A;font-size:12px;"><span>EMI:</span><b>₹${cust.dailyEmi || cust.emi || 0}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #FDE68A;font-size:12px;"><span>Paid:</span><b>₹${cust.totalCollected || 0}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;"><span>Remaining:</span><b style="color:#DC2626;">₹${remain.toLocaleString('en-IN')}</b></div>
    `;

    const hist = allCollections
        .filter(x => x.customerId === cust.id)
        .sort((a, b) => new Date(b.date || b.collectionDate) - new Date(a.date || a.collectionDate))
        .slice(0, 20);

    document.getElementById("historyList").innerHTML = hist.length
        ? `<h5 style="font-size:11px;color:#64748B;margin-bottom:8px;">📊 Collection History</h5>` +
          hist.map(h => `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:11px;border-bottom:1px solid #F1F5F9;"><span>${h.date || h.collectionDate}</span><b>₹${h.amount || h.collectionAmount || 0}</b></div>`).join('')
        : `<p style="text-align:center;color:#94A3B8;font-size:12px;">अभी तक कोई collection नहीं</p>`;

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

document.getElementById("btnWhatsapp")?.addEventListener('click', () => {
    if (!selectedCustomer) return;
    const msg = `*GDA Finance Services*%0A%0A*Bond Paper*%0AName: ${selectedCustomer.name}%0ACode: ${selectedCustomer.customerCode}%0AMobile: ${selectedCustomer.mobile}%0ALoan: ₹${selectedCustomer.loanAmount}%0AEMI: ₹${selectedCustomer.dailyEmi || selectedCustomer.emi}%0APaid: ₹${selectedCustomer.totalCollected || 0}`;
    window.open(`https://wa.me/91${selectedCustomer.mobile}?text=${msg}`, '_blank');
});

document.getElementById("btnPdf")?.addEventListener('click', () => {
    if (!selectedCustomer) return;
    const { jsPDF } = window.jspdf;
    const docPdf = new jsPDF();
    docPdf.text("GDA FINANCE SERVICES - BOND PAPER", 20, 20);
    docPdf.text(`Name: ${selectedCustomer.name}`, 20, 35);
    docPdf.text(`Code: ${selectedCustomer.customerCode || ''}`, 20, 45);
    docPdf.text(`Mobile: ${selectedCustomer.mobile || ''}`, 20, 55);
    docPdf.text(`Loan: Rs. ${selectedCustomer.loanAmount || 0}`, 20, 65);
    docPdf.text(`EMI: Rs. ${selectedCustomer.dailyEmi || selectedCustomer.emi || 0}`, 20, 75);
    docPdf.text(`Paid: Rs. ${selectedCustomer.totalCollected || 0}`, 20, 85);
    docPdf.save(`${(selectedCustomer.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_')}_GDA_Bond.pdf`);
});

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

searchInp?.addEventListener("input", applyFilters);

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
