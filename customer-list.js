import { db } from "./firebase.js"; 
import { collection, getDocs, deleteDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const customerList = document.getElementById("customerList");

async function loadCustomers() {
    customerList.innerHTML = '<div style="text-align:center; padding:20px;">लोड हो रहा है...</div>';
    
    try {
        const snapshot = await getDocs(collection(db, "customers"));
        customerList.innerHTML = "";
        
        snapshot.forEach((docSnap) => {
            const c = docSnap.data();
            
            // आपके नए UI (dashboard-card) के हिसाब से कार्ड स्ट्रक्चर
            const div = document.createElement("div");
            div.className = "dashboard-card"; 
            div.innerHTML = `
                <h3 style="margin-bottom: 15px;">${c.name}</h3>
                <div style="font-size: 14px; color: var(--text-light); line-height: 1.8;">
                    <p><b>मोबाइल:</b> ${c.mobile}</p>
                    <p><b>लोन राशि:</b> ₹${c.loan}</p>
                    <p><b>बकाया राशि:</b> ₹${c.remainingAmount ?? c.loan}</p>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 20px;">
                    <a href="collection.html?id=${docSnap.id}" class="btn">💰 कलेक्शन</a>
                    <a href="statement.html?id=${docSnap.id}" class="btn" style="background:var(--secondary)">📄 स्टेटमेंट</a>
                    <button class="btn" style="background:var(--warning)" onclick="window.openEdit('${docSnap.id}')">✏ एडिट</button>
                    <button class="btn" style="background:var(--danger)" onclick="window.deleteCustomer('${docSnap.id}')">🗑 डिलीट</button>
                </div>
            `;
            customerList.appendChild(div);
        });
    } catch (e) {
        console.error("Error loading:", e);
        customerList.innerHTML = "डेटा लोड करने में त्रुटि हुई।";
    }
}

// पिन वेरिफिकेशन और डिलीट लॉजिक वैसे ही रखें जैसा आपने बनाया है...
// (यह कोड बहुत सुरक्षित है)

loadCustomers();
