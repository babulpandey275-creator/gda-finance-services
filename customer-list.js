import { db } from "./firebase.js";
import { collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const listContainer = document.getElementById("listContainer");
const searchInp = document.getElementById("searchInp");
const ADMIN_PASSWORD = "GDA@2026";

let allCustomers = [];

async function loadCustomers() {
    listContainer.innerHTML = "<p style='text-align:center; padding:20px;'>⏳ लोड हो रहा है...</p>";
    try {
        const querySnapshot = await getDocs(collection(db, "customers"));
        allCustomers = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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
        
        const imageUrl = (cust.photoUrl && cust.photoUrl.startsWith('http')) 
            ? cust.photoUrl 
            : 'https://via.placeholder.com/55';

        card.innerHTML = `
        <div onclick="window.location.href='statement.html?id=${cust.id}'" style="display:flex;gap:12px;align-items:center;cursor:pointer;">
            <img src="${imageUrl}" onerror="this.src='https://via.placeholder.com/55'" style="width:55px;height:55px;border-radius:50%;object-fit:cover; border:1px solid #eee;">
            <div>
                <h4 style="margin:0;font-size:16px;color:var(--text-main);">${cust.name || "N/A"}</h4>
                <p style="margin:0;font-size:12px;color:#64748b;">📱 ${cust.mobile || "N/A"}</p>
                <p style="margin:0;font-size:12px;color:#64748b;">💰 लोन: ₹${cust.loanAmount || 0} | ${cust.customerCode || ''}</p>
            </div>
        <div style="display:flex;gap:6px;width:100%;margin-top:12px;">
            <a href="collection.html?id=${cust.id}" style="background:#10b981;color:white;flex:1;padding:8px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:bold;text-align:center;">Collect</a>
            <button onclick="secureDelete('${cust.id}')" style="background:#d32f2f;color:white;flex:1;padding:8px;border:none;border-radius:8px;font-size:12px;font-weight:bold;cursor:pointer;">Del</button>
            <button onclick="secureEdit('${cust.id}')" style="background:#FFC107;color:black;flex:1;padding:8px;border:none;border-radius:8px;font-size:12px;font-weight:bold;cursor:pointer;">Edit</button>
        </div>`;
        listContainer.appendChild(card);
    });
}

if (searchInp) {
    searchInp.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allCustomers.filter(c => 
            (c.name && c.name.toLowerCase().includes(term)) || 
            (c.mobile && c.mobile.includes(term))
        );
        renderList(filtered);
    });
}

window.secureEdit = (docId) => {
    const pass = prompt("🔑 Edit करने के लिए Admin Password डालें:");
    if (pass === ADMIN_PASSWORD) {
        window.location.href = `./edit.html?id=${docId}`;
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
    event.target.classList.add('active');
    if (type === 'closed') {
        renderList(allCustomers.filter(c => c.status === 'Closed' || c.status === 'Settled'));
    } else {
        renderList(allCustomers.filter(c => c.status !== 'Closed' && c.status !== 'Settled'));
    }
};

loadCustomers();
