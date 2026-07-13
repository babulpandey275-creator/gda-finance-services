// ==========================================
// 🚀 GDA FINANCE - CUSTOMER LIST MASTER ENGINE
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
    listContainer.innerHTML = "⏳ Loading...";
    const querySnapshot = await getDocs(collection(db, "customers"));
    allCustomers = [];
    querySnapshot.forEach((doc) => {
        allCustomers.push({ id: doc.id, ...doc.data() });
    });
    renderList();
}

function renderList() {
    const searchTerm = searchInp.value.toLowerCase();
    const filtered = allCustomers.filter(c => 
        (c.status === currentStatus) && 
        (c.name.toLowerCase().includes(searchTerm) || (c.mobile && c.mobile.includes(searchTerm)))
    );

    if (filtered.length === 0) {
        listContainer.innerHTML = `<p style="text-align:center; padding:20px; color:#64748b;">No ${currentStatus.toLowerCase()} customers found.</p>`;
        return;
    }

    listContainer.innerHTML = filtered.map(cust => {
        // 🧮 LOGIC: Live OD Calculation with back-date (Today - LoanDate + 1)
        const loanDate = new Date(cust.loanDate);
        const today = new Date();
        const diffTime = today - loanDate;
        const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 for "Include Today"
        
        const expectedAmt = daysElapsed * Number(cust.dailyEmi || 0);
        const totalPaid = Number(cust.paidAmount || 0);
        const currentOD = Math.max(0, expectedAmt - totalPaid);

        return `
        <div class="cust-card">
            <img src="${cust.customerPhoto || 'https://via.placeholder.com/55'}" class="cust-avatar">
            <div class="cust-info">
                <h4>${cust.name} (${cust.customerCode})</h4>
                <p>📞 ${cust.mobile || 'N/A'}</p>
                <p>📅 Date: ${cust.loanDate} | OD: ₹${currentOD}</p>
            </div>
            <div class="cust-actions">
                <a href="profile.html?id=${cust.id}" class="btn-action btn-edit">View</a>
                <button class="btn-action btn-delete" onclick="deleteCustomer('${cust.id}')">Delete</button>
            </div>
        </div>
        `;
    }).join('');
}

// 🗑️ CASCADING DELETE: Remove customer + their payment history
window.deleteCustomer = async (docId) => {
    if (!confirm("⚠️ WARNING: This will permanently delete the customer AND all their payment history from the database!")) return;

    try {
        const batch = writeBatch(db);
        
        // 1. Delete all payment records related to this customer
        const colQuery = query(collection(db, "collections"), where("customerId", "==", docId));
        const colSnapshot = await getDocs(colQuery);
        colSnapshot.forEach((doc) => batch.delete(doc.ref));
        
        // 2. Delete the customer record itself
        batch.delete(doc(db, "customers", docId));
        
        await batch.commit();
        alert("✅ Customer and all their history deleted successfully!");
        loadCustomers();
    } catch (err) {
        alert("Error deleting customer: " + err.message);
    }
};

// Event Listeners
tabActive.onclick = () => {
    currentStatus = "Active";
    tabActive.className = "tab-btn active";
    tabClosed.className = "tab-btn";
    renderList();
};

tabClosed.onclick = () => {
    currentStatus = "Closed";
    tabActive.className = "tab-btn";
    tabClosed.className = "tab-btn closed-active";
    renderList();
};

searchInp.oninput = renderList;

loadCustomers();
