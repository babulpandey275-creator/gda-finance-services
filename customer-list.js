import { db } from "./firebase.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const listContainer = document.getElementById("listContainer");
const searchInp = document.getElementById("searchInp");

async function loadCustomers() {
    // डेटा लोड होते समय मैसेज दिखाएं
    listContainer.innerHTML = "⏳ लोड हो रहा है...";
    
    try {
        // Firestore से 'customers' कलेक्शन का डेटा सबसे नए से पुराने के क्रम में लाएं
        const q = query(collection(db, "customers"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        listContainer.innerHTML = ""; // पुराना मैसेज हटा दें
        
        if (querySnapshot.empty) {
            listContainer.innerHTML = "<p style='text-align:center;'>अभी कोई कस्टमर रजिस्टर नहीं है।</p>";
            return;
        }

        // हर कस्टमर के लिए कार्ड बनाएं
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const id = doc.id;
            
            const card = document.createElement("div");
            card.className = "cust-card";
            card.innerHTML = `
                <div class="cust-info">
                    <h4>${data.name || "N/A"}</h4>
                    <p>📱 ${data.mobile || "N/A"}</p>
                    <p>💰 लोन: ₹${data.loanAmount || 0}</p>
                </div>
                <div class="cust-actions">
                    <a href="edit.html?id=${id}" class="btn-action btn-edit">Edit</a>
                </div>
            `;
            listContainer.appendChild(card);
        });

    } catch (err) {
        console.error("Error loading: ", err);
        listContainer.innerHTML = "⚠️ डेटा लोड करने में एरर आया।";
    }
}

// सर्च करने का फंक्शन (नाम या मोबाइल से)
searchInp.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const cards = document.querySelectorAll(".cust-card");
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(searchTerm) ? "flex" : "none";
    });
});

// पेज लोड होते ही लिस्ट लोड करें
loadCustomers();
