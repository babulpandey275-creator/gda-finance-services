import { db } from "./firebase.js"; 
import { collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const listContainer = document.getElementById("listContainer");
const searchInp = document.getElementById("searchInp");
const ADMIN_PASSWORD = "GDA@2026";

// 1. डेटा लोड करने का फंक्शन
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
        console.error(err);
    }
}

// 2. लिस्ट रेंडर करने का फंक्शन
function renderList(data) {
    listContainer.innerHTML = "";
    if (data.length === 0) {
        listContainer.innerHTML = "<p style='text-align:center;'>कोई कस्टमर नहीं मिला।</p>";
        return;
    }

    data.forEach(cust => {
        const card = document.createElement("div");
        card.className = "cust-card";
        // यहाँ फोटो और नाम पर क्लिक करने पर statement.html खुलेगा
        card.innerHTML = `
            <a href="statement.html?id=${cust.id}" style="display: flex; gap: 12px; align-items: center; text-decoration: none; color: inherit; flex: 1;">
                <img src="${cust.customerPhoto || 'https://via.placeholder.com/55'}" class="cust-avatar" style="width:55px; height:55px; border-radius:50%; object-fit:cover;">
                <div class="cust-info">
                    <h4 style="margin:0; font-size:16px;">${cust.name || "N/A"}</h4>
                    <p style="margin:0; font-size:12px; color:#64748b;">📱 ${cust.mobile || "N/A"}</p>
                    <p style="margin:0; font-size:12px; color:#64748b;">💰 लोन: ₹${cust.loanAmount || 0}</p>
                </div>
            </a>
            <div class="cust-actions" style="display: flex; flex-direction: column; gap: 4px;">
                <a href="collection.html?id=${cust.id}" style="background:#28a745; color:white; padding:4px 8px; border-radius:5px; text-decoration:none; font-size:10px; font-weight:bold; text-align:center;">Collect</a>
                <button onclick="secureDelete('${cust.id}')" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:5px; cursor:pointer; font-size:10px; font-weight:bold;">Del</button>
                <a href="edit.html?id=${cust.id}" style="background:#ffb703; color:black; padding:4px 8px; border-radius:5px; text-decoration:none; font-size:10px; font-weight:bold; text-align:center;">Edit</a>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

// 3. डिलीट फंक्शन
window.secureDelete = async (docId) => {
    const pass = prompt("⚠️ DELETE करने के लिए Admin Password डालें:");
    if (pass === ADMIN_PASSWORD) {
        if (!confirm("क्या आप वाकई इस कस्टमर को हटाना चाहते हैं?")) return;
        try {
            await deleteDoc(doc(db, "customers", docId));
            alert("✅ कस्टमर डिलीट हो गया!");
            loadCustomers();
        } catch (err) { 
            alert("❌ एरर: " + err.message); 
        }
    } else if (pass !== null) {
        alert("❌ गलत पासवर्ड!");
    }
};

// 4. सर्च फंक्शन
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
