// ==========================================
// 🚀 GDA FINANCE - CUSTOMER LIST FIXED ENGINE (ORIGINAL UI + BACK-DATE OD)
// ==========================================

import { db } from "./firebase.js"; 
import { collection, getDocs, deleteDoc, doc, query, where, writeBatch } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

let allCustomers = [];
let currentStatus = "Active";

const listContainer = document.getElementById("listContainer");
const tabActive = document.getElementById("tabActive");
const tabClosed = document.getElementById("tabClosed");
const searchInp = document.getElementById("searchInp");

async function loadCustomers() {
    if (listContainer) listContainer.innerHTML = "⏳ लोड हो रहा है...";
    try {
        const querySnapshot = await getDocs(collection(db, "customers"));
        allCustomers = [];
        querySnapshot.forEach((doc) => {
            allCustomers.push({ id: doc.id, ...doc.data() });
        });
        renderList();
    } catch (err) {
        console.error("Error loading customers:", err);
    }
}

function renderList() {
    if (!listContainer) return;
    const searchTerm = searchInp ? searchInp.value.toLowerCase() : "";
    
    const filtered = allCustomers.filter(c => 
        (c.status === currentStatus) && 
        (c.name && (c.name.toLowerCase().includes(searchTerm) || (c.mobile && c.mobile.includes(searchTerm))))
    );

    if (filtered.length === 0) {
        listContainer.innerHTML = `<p style="text-align:center; padding:20px; color:#64748b;">कोई ग्राहक नहीं मिला।</p>`;
        return;
    }

    listContainer.innerHTML = filtered.map(cust => {
        // 🧮 1. बैक-डेट लाइव ओवरड्यू कैलकुलेशन (Today - LoanDate + 1)
        const loanDate = new Date(cust.loanDate);
        const today = new Date();
        const diffTime = today - loanDate;
        let daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        if (daysElapsed < 1) daysElapsed = 1; 
        
        const expectedAmt = daysElapsed * Number(cust.dailyEmi || cust.emi || 0);
        const totalPaid = Number(cust.paidAmount || 0);
        const currentOD = Math.max(0, expectedAmt - totalPaid);

        // 🆔 2. Undefined नाम सुरक्षा नियम
        const displayCode = cust.customerCode || cust.member_id || `GDA${String(cust.member_no || 0).padStart(3, '0')}`;

        // 🔗 3. लेज़र प्रोफ़ाइल पेज का लिंक (फोटो और View बटन दोनों के लिए)
        const profileUrl = `customer-profile.html?id=${cust.id}`;

        return `
        <div class="cust-card">
            <!-- 📸 फोटो पर क्लिक करने से पूरा लेज़र प्रोफाइल खुलेगा -->
            <img src="${cust.customerPhoto || 'https://via.placeholder.com/55'}" class="cust-avatar" style="cursor:pointer;" onclick="window.location.href='${profileUrl}'">
            
            <div class="cust-info">
                <h4>${cust.name} (${displayCode})</h4>
                <p>📞 ${cust.mobile || 'N/A'}</p>
                <p>📅 दिनांक: ${cust.loanDate} | <span style="color:#ef4444; font-weight:bold;">OD: ₹${currentOD}</span></p>
            </div>
            
            <div class="cust-actions">
                <!-- 🎯 View और Delete बटन बिल्कुल पहले की तरह -->
                <a href="${profileUrl}" class="btn-action btn-edit" style="background:#ffb703; color:black; text-decoration:none;">View</a>
                <button class="btn-action btn-delete" onclick="deleteCustomer('${cust.id}')">Delete</button>
            </div>
        </div>
        `;
    }).join('');
}

// 🗑️ सुरक्षित डिलीट (कस्टमर + पेमेंट हिस्ट्री दोनों डेटाबेस से साफ़)
window.deleteCustomer = async (docId) => {
    if (!confirm("⚠️ क्या आप वाकई इस ग्राहक और इसकी पूरी पेमेंट हिस्ट्री को हमेशा के लिए डिलीट करना चाहते हैं?")) return;

    try {
        const batch = writeBatch(db);
        
        // 1. कलेक्शंस से इसकी एंट्री हटाएँ
        const colQuery = query(collection(db, "collections"), where("customerId", "==", docId));
        const colSnapshot = await getDocs(colQuery);
        colSnapshot.forEach((doc) => batch.delete(doc.ref));
        
        // 2. कस्टमर को डिलीट करें
        batch.delete(doc(db, "customers", docId));
        
        await batch.commit();
        alert("✅ ग्राहक और उसका सारा इतिहास पूरी तरह से डिलीट हो गया है!");
        loadCustomers();
    } catch (err) {
        alert("डिलीट करने में त्रुटि: " + err.message);
    }
};

// टैब स्विचिंग लॉजिक
if (tabActive) {
    tabActive.onclick = () => {
        currentStatus = "Active";
        tabActive.className = "tab-btn active";
        if (tabClosed) tabClosed.className = "tab-btn";
        renderList();
    };
}

if (tabClosed) {
    tabClosed.onclick = () => {
        currentStatus = "Closed";
        if (tabActive) tabActive.className = "tab-btn";
        tabClosed.className = "tab-btn closed-active";
        renderList();
    };
}

if (searchInp) searchInp.oninput = renderList;

loadCustomers();
