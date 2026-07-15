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
        listContainer.innerHTML = "❌ डेटा लोड करने में एरर आया।";
        console.error(err);
    }
}

// 2. लिस्ट रेंडर करने का फंक्शन (सारे बटन के साथ)
function renderList(data) {
    listContainer.innerHTML = "";
    if (data.length === 0) {
        listContainer.innerHTML = "<p style='text-align:center;'>कोई कस्टमर नहीं मिला।</p>";
        return;
    }

    data.forEach(cust => {
        const card = document.createElement("div");
        card.className = "cust-card";
        card.innerHTML = `
            <div class="cust-info">
                <h4>${cust.name || "N/A"}</h4>
                <p>📱 ${cust.mobile || "N/A"}</p>
                <p>💰 लोन: ₹${cust.loanAmount || 0}</p>
            </div>
            <div class="cust-actions" style="display: flex; gap: 6px;">
                <a href="collection.html?id=${cust.id}" class="btn-action" style="background:#28a745; color:white; padding:6px 10px; border-radius:6px; text-decoration:none; font-size:11px; font-weight:bold;">Collect</a>
                <button onclick="secureDelete('${cust.id}')" style="background:#ef4444; color:white; border:none; padding:6px 10px; border-radius:6px; cursor:pointer; font-size:11px; font-weight:bold;">Del</button>
                <a href="edit.html?id=${cust.id}" class="btn-action" style="background:#ffb703; color:black; padding:6px 10px; border-radius:6px; text-decoration:none; font-size:11px; font-weight:bold;">Edit</a>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

// 3. डिलीट करने का सुरक्षित फंक्शन
window.secureDelete = async (docId) => {
    const pass = prompt("⚠️ DELETE करने के लिए Admin Password डालें:");
    if (pass === ADMIN_PASSWORD) {
        if (!confirm("क्या आप वाकई इस कस्टमर को हटाना चाहते हैं?")) return;
        try {
            await deleteDoc(doc(db, "customers", docId));
            alert("✅ कस्टमर डिलीट हो गया!");
            loadCustomers(); // लिस्ट रिफ्रेश करें
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

// पेज लोड होते ही कॉल करें
loadCustomers();
