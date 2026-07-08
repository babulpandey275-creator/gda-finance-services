import { db } from "./firebase.js"; 
import { collection, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const customerList = document.getElementById("customerList"); 

// 1. सभी ग्राहकों को फ़ायरबेस से लोड करके स्क्रीन पर दिखाना
async function loadCustomers() { 
    if (!customerList) return;
    customerList.innerHTML = '<div style="text-align:center; padding:20px;">लोड हो रहा है...</div>'; 
    try { 
        const snapshot = await getDocs(collection(db, "customers")); 
        customerList.innerHTML = ""; 
        
        if (snapshot.empty) {
            customerList.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">कोई ग्राहक नहीं मिला।</div>';
            return;
        }

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
                    
                    <button class="btn" style="background:var(--danger); cursor:pointer;" onclick="window.deleteCustomer('${customerId}', '${c.name}')">🗑 डिलीट</button> 
                </div> 
            `; 
            customerList.appendChild(div); 
        }); 
    } catch (e) { 
        console.error("Error loading:", e); 
        customerList.innerHTML = '<div style="text-align:center; padding:20px; color:red;">डेटा लोड करने में त्रुटि हुई।</div>'; 
    } 
} 

/* ========================================= 
🗑 2. सुरक्षा पिन के साथ डिलीट करने का लाइव फंक्शन
========================================= */ 
async function deleteCustomer(customerId, customerName) {
    // सुरक्षा पिन जांच
    const password = prompt(`🚨 सुरक्षा पिन दर्ज करें (Enter Pin to Delete ${customerName}):`);
    if (password !== "GDA@2026") {
        alert("❌ गलत पिन! ग्राहक को डिलीट नहीं किया गया।");
        return;
    }

    const confirmCheck = confirm(`क्या आप सच में ${customerName} का पूरा खाता डिलीट करना चाहते हैं? इनका सारा डेटा हमेशा के लिए हट जाएगा।`);
    if (!confirmCheck) return;

    try {
        // फ़ायरबेस से डॉक्यूमेंट डिलीट करना
        await deleteDoc(doc(db, "customers", customerId));
        alert("🗑️ ग्राहक का खाता सफलतापूर्वक डिलीट कर दिया गया है!");
        
        // लिस्ट को तुरंत रीफ्रेश करें
        loadCustomers();
    } catch (error) {
        console.error("डिलीट करने में एरर आया:", error);
        alert("तकनीकी गड़बड़ी के कारण डिलीट नहीं हो सका।");
    }
}

// 🔑 मुख्य सुधार: इसे विंडो ऑब्जेक्ट में डालना ताकि HTML बटन इसे तुरंत ढूंढ सके
window.deleteCustomer = deleteCustomer;

// पेज लोड होते ही रन करें
loadCustomers();
