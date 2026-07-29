import { db } from "./firebase.js";
import { collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const listContainer = document.getElementById("listContainer");
const searchInp = document.getElementById("searchInp");
const ADMIN_PASSWORD = "GDA@2026";

let allCustomers = [];
let allCollections = [];
let selectedCustomer = null;

// Drawer Elements
const drawer = document.getElementById("drawer");
const drawerOverlay = document.getElementById("drawerOverlay");

async function loadCustomers() {
    listContainer.innerHTML = "<p style='text-align:center; padding:20px;'>⏳ लोड हो रहा है...</p>";
    try {
        const [custSnap, colSnap] = await Promise.all([
            getDocs(collection(db, "customers")),
            getDocs(collection(db, "collections"))
        ]);
        allCustomers = custSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        allCollections = colSnap.docs.map(d => d.data());
        renderList(allCustomers);
    } catch (err) {
        listContainer.innerHTML = "❌ डेटा लोड नहीं हुआ।";
        console.error(err);
    }
}

function renderList(data) {
    listContainer.innerHTML = "";
    if (data.length === 0) {
        listContainer.innerHTML = "<p style='text-align:center; padding:20px;'>कोई कस्टमर नहीं मिला।</p>";
        return;
    }

    data.forEach(cust => {
        const card = document.createElement("div");
        card.className = "cust-card";
        card.style.cssText = "background:#fff;border-radius:20px;padding:14px;display:flex;flex-direction:column;gap:10px;box-shadow:0 4px 20px rgba(0,0,0,0.04);border:1px solid #F1F5F9;margin-bottom:10px;cursor:pointer;";
        
        const imageUrl = (cust.photoUrl && cust.photoUrl.startsWith('http')) ? cust.photoUrl : 'https://via.placeholder.com/55';

        // CLICK = Bond Paper Drawer Khulega (Statement page pe nahi jayega)
        card.onclick = () => openDrawer(cust);

        card.innerHTML = `
        <div style="display:flex;gap:12px;align-items:center;">
            <img src="${imageUrl}" onerror="this.src='https://via.placeholder.com/55'" style="width:55px;height:55px;border-radius:50%;object-fit:cover; border:1px solid #eee;">
            <div>
                <h4 style="margin:0;font-size:16px;color:#0F172A;">${cust.name || "N/A"}</h4>
                <p style="margin:0;font-size:12px;color:#64748b;">📱 ${cust.mobile || "N/A"}</p>
                <p style="margin:0;font-size:12px;color:#64748b;">💰 लोन: ₹${cust.loanAmount || 0} | ${cust.customerCode || ''}</p>
            </div>
        </div>
        <div style="display:flex;gap:6px;width:100%;margin-top:4px;">
            <a href="collection.html?id=${cust.id}" onclick="event.stopPropagation()" style="background:#0F172A;color:white;flex:1;padding:8px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:bold;text-align:center;">Collect</a>
            <button onclick="event.stopPropagation(); secureDelete('${cust.id}')" style="background:#FFF1F2;color:#E11D48;border:1px solid #FFE4E6;flex:1;padding:8px;border-radius:8px;font-size:12px;font-weight:bold;cursor:pointer;">Del</button>
            <button onclick="event.stopPropagation(); secureEdit('${cust.id}')" style="background:#FFFBEB;color:#92400E;border:1px solid #FEF3C7;flex:1;padding:8px;border-radius:8px;font-size:12px;font-weight:bold;cursor:pointer;">Edit</button>
        </div>`;
        listContainer.appendChild(card);
    });
}

// ===== BOND PAPER DRAWER LOGIC =====
function openDrawer(cust){
    selectedCustomer = cust;
    const remain = Math.max(0, Number(cust.loanAmount||0)*1.2 - Number(cust.totalCollected||0));
    
    document.getElementById("drawerName").innerText = cust.name;
    document.getElementById("bondPaper").innerHTML = `
      <h4 style="text-align:center;font-weight:800;color:#92400E;margin-bottom:10px;">📄 GDA FINANCE - BOND PAPER</h4>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #FDE68A;font-size:12px;"><span>Name:</span><b>${cust.name}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #FDE68A;font-size:12px;"><span>Code:</span><b>${cust.customerCode||'GDA'}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #FDE68A;font-size:12px;"><span>Mobile:</span><b>${cust.mobile||''}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #FDE68A;font-size:12px;"><span>Loan:</span><b>₹${cust.loanAmount||0}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #FDE68A;font-size:12px;"><span>EMI:</span><b>₹${cust.dailyEmi||cust.emi||0}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #FDE68A;font-size:12px;"><span>Paid:</span><b>₹${cust.totalCollected||0}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;"><span>Remaining:</span><b style="color:#DC2626;">₹${remain.toLocaleString('en-IN')}</b></div>
    `;

    const hist = allCollections.filter(x=>x.customerId===cust.id).sort((a,b)=> new Date(b.date||b.collectionDate) - new Date(a.date||a.collectionDate)).slice(0,20);
    document.getElementById("historyList").innerHTML = hist.length ? 
      `<h5 style="font-size:11px;color:#64748B;margin-bottom:8px;">📊 Collection History (Niche wala)</h5>` + hist.map(h=>`<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:11px;border-bottom:1px solid #F1F5F9;"><span>${h.date||h.collectionDate}</span><b>₹${h.amount||h.collectionAmount||0}</b></div>`).join('') 
      : 'No collection yet';

    drawer.style.transform = 'translateY(0)';
    drawerOverlay.style.display = 'block';
    setTimeout(()=>drawerOverlay.classList.add("active"),10);
}

function closeDrawer(){
    drawer.style.transform = 'translateY(100%)';
    drawerOverlay.style.display = 'none';
}

document.getElementById("closeDrawer")?.addEventListener('click', closeDrawer);
document.getElementById("drawerOverlay")?.addEventListener('click', closeDrawer);

// WhatsApp & PDF
document.getElementById("btnWhatsapp")?.addEventListener('click', (e)=>{
    e.preventDefault();
    if(!selectedCustomer) return;
    const msg = `*GDA Finance Services*%0A%0A*Bond Paper*%0AName: ${selectedCustomer.name}%0ACode: ${selectedCustomer.customerCode}%0AMobile: ${selectedCustomer.mobile}%0ALoan: ₹${selectedCustomer.loanAmount}%0AEMI: ₹${selectedCustomer.dailyEmi||selectedCustomer.emi}%0APaid: ₹${selectedCustomer.totalCollected||0}%0ABranch: Garhwa`;
    window.open(`https://wa.me/91${selectedCustomer.mobile}?text=${msg}`, '_blank');
});

document.getElementById("btnPdf")?.addEventListener('click', (e)=>{
    e.preventDefault();
    if(!selectedCustomer) return;
    const { jsPDF } = window.jspdf;
    const docPdf = new jsPDF();
    docPdf.text("GDA FINANCE SERVICES - BOND PAPER",20,20);
    docPdf.text(`Name: ${selectedCustomer.name}`,20,35);
    docPdf.text(`Code: ${selectedCustomer.customerCode||''}`,20,45);
    docPdf.text(`Mobile: ${selectedCustomer.mobile||''}`,20,55);
    docPdf.text(`Loan: ₹${selectedCustomer.loanAmount||0}`,20,65);
    docPdf.text(`EMI: ₹${selectedCustomer.dailyEmi||selectedCustomer.emi||0}`,20,75);
    docPdf.text(`Paid: ₹${selectedCustomer.totalCollected||0}`,20,85);
    docPdf.save(`${selectedCustomer.name}_GDA_Bond.pdf`);
});

// Search
if (searchInp) {
    searchInp.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allCustomers.filter(c => 
            (c.name && c.name.toLowerCase().includes(term)) || 
            (c.mobile && c.mobile.includes(term)) ||
            (c.customerCode && c.customerCode.toLowerCase().includes(term))
        );
        renderList(filtered);
    });
}

window.secureEdit = (docId) => {
    const pass = prompt("🔑 Edit करने के लिए Admin Password डालें:");
    if (pass === ADMIN_PASSWORD) {
        window.location.href = `./edit-customer.html?id=${docId}`;
    } else if (pass !== null) {
        alert("❌ गलत पासवर्ड!");
    }
};

window.secureDelete = async (docId) => {
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
};

window.filterCustomers = (type) => {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    if(event?.target) event.target.classList.add('active');
    if (type === 'closed') {
        renderList(allCustomers.filter(c => c.status === 'Closed' || c.status === 'Settled'));
    } else {
        renderList(allCustomers.filter(c => c.status !== 'Closed' && c.status !== 'Settled'));
    }
};

loadCustomers();
