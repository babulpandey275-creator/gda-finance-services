import { db } from "./firebase.js"; 
import { collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const listContainer = document.getElementById("listContainer");
const searchInp = document.getElementById("searchInp");
const ADMIN_PASSWORD = "GDA@2026";

async function loadCustomers() {
    listContainer.innerHTML = "⏳ लोड हो रहा है...";
    try {
        const querySnapshot = await getDocs(collection(db, "customers"));
        let customers = [];
        querySnapshot.forEach((doc) => {
            customers.push({ id: doc.id, ...doc.data() });
        });
        renderList(customers);
    } catch (err) {
        listContainer.innerHTML = "❌ एरर: डेटा लोड नहीं हुआ।";
    }
}

function renderList(data) {
    listContainer.innerHTML = "";
    if (data.length === 0) {
        listContainer.innerHTML = "<p style='text-align:center;'>कोई कस्टमर नहीं मिला।</p>";
        return;
    }

    data.forEach(cust => {
        const card = document.createElement("div");
        card.className = "cust-card";
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.gap = "10px";
        
        card.innerHTML = `
            <div onclick="window.location.href='statement.html?id=${cust.id}'" style="display: flex; gap: 12px; align-items: center; cursor: pointer;">
                <img src="${cust.customerPhoto || 'https://via.placeholder.com/55'}" style="width:55px; height:55px; border-radius:50%; object-fit:cover;">
                <div class="cust-info">
                    <h4 style="margin:0; font-size:16px;">${cust.name || "N/A"}</h4>
                    <p style="margin:0; font-size:12px; color:#64748b;">📱 ${cust.mobile || "N/A"}</p>
                    <p style="margin:0; font-size:12px; color:#64748b;">💰 लोन: ₹${cust.loanAmount || 0}</p>
                </div>
            </div>
            
            <div style="display: flex; gap: 5px; width: 100%;">
                <a href="collection.html?id=${cust.id}" style="background:#28a745; color:white; flex:1; padding:8px; border-radius:5px; text-decoration:none; font-size:12px; font-weight:bold; text-align:center;">Collect</a>
                <button onclick="secureDelete('${cust.id}')" style="background:#ef4444; color:white; flex:1; padding:8px; border-radius:5px; border:none; font-size:12px; font-weight:bold; cursor:pointer;">Del</button>
                <button onclick="secureEdit('${cust.id}')" style="background:#ffb703; color:black; flex:1; padding:8px; border-radius:5px; border:none; font-size:12px; font-weight:bold; cursor:pointer;">Edit</button>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

// Edit बटन का सुरक्षित फंक्शन
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
        if (!confirm("क्या आप वाकई इसे हटाना चाहते हैं?")) return;
        try {
            await deleteDoc(doc(db, "customers", docId));
            alert("✅ कस्टमर डिलीट हो गया!");
            loadCustomers();
        } catch (err) { alert("❌ एरर: " + err.message); }
    } else if (pass !== null) {
        alert("❌ गलत पासवर्ड!");
    }
};

if (searchInp) {
    searchInp.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        const cards = document.querySelectorAll(".cust-card");
        cards.forEach(card => {
            card.style.display = card.textContent.toLowerCase().includes(term) ? "flex" : "none";
        });
    });
}

loadCustomers();
