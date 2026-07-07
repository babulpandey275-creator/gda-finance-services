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
            const customerId = docSnap.id; // ग्राहक की फायरबेस आईडी
            
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
                    <a href="collection.html?id=${customerId}" class="btn">💰 कलेक्शन</a> 
                    <a href="statement.html?id=${customerId}" class="btn" style="background:var(--secondary)">📄 स्टेटमेंट</a> 
                    
                    <a href="edit.html?id=${customerId}" class="btn" style="background:var(--warning); text-align: center; text-decoration: none; line-height: 2.2;">✏ एडिट</a> 
                    
                    <button class="btn" style="background:var(--danger)" onclick="window.deleteCustomer('${customerId}')">🗑 डिलीट</button> 
                </div> 
            `; 
            customerList.appendChild(div); 
        }); 
    } catch (e) { 
        console.error("Error loading:", e); 
        customerList.innerHTML = "डेटा लोड करने में त्रुटि हुई।"; 
    } 
} 

// पिन वेरिफिकेशन और डिलीट लॉजिक (जो आपने नीचे बनाया है उसे वैसे ही रहने दें)

loadCustomers();
