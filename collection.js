// ==========================================================
// 🚀 GDA FINANCE - FINAL UPDATED CUSTOMER LIST ENGINE
// ==========================================================

import { db } from "./firebase.js"; 
import { collection, getDocs, deleteDoc, doc, query, where, writeBatch } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

let allCustomers = [];
let currentStatus = "Active";

const listContainer = document.getElementById("listContainer");
const tabActive = document.getElementById("tabActive");
const tabClosed = document.getElementById("tabClosed");
const searchInp = document.getElementById("searchInp");

const ADMIN_PASSWORD = "GDA@2026";

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
        const loanDate = new Date(cust.loanDate);
        const today = new Date();
        let daysElapsed = Math.floor((today - loanDate) / (1000 * 60 * 60 * 24)) + 1;
        if (daysElapsed < 1) daysElapsed = 1; 
        
        // Due Calculation Logic Fix
        const expectedTotal = daysElapsed * Number(cust.dailyEmi || cust.emi || 0);
        const totalCollected = Number(cust.totalCollected || cust.paidAmount || 0);
        let currentDue = expectedTotal - totalCollected;
        if (currentDue < 0) currentDue = 0;

        const displayCode = cust.customerCode || cust.member_id || `GDA${String(cust.member_no || 0).padStart(3, '0')}`;
        
        // Link to Statement Page
        const profileUrl = `statement.html?id=${cust.id}`;
        const collectUrl = `collection.html?id=${cust.id}`;

        return `
        <div class="cust-card" style="flex-direction: column; align-items: stretch; gap: 8px;">
            <div style="display: flex; gap: 12px; align-items: center; cursor:pointer;" onclick="window.location.href='${profileUrl}'">
                <img src="${cust.customerPhoto || 'https://via.placeholder.com/55'}" class="cust-avatar">
                
                <div class="cust-info" style="flex: 1;">
                    <h4 style="margin: 0 0 4px 0; font-size: 16px; color: #0f172a;">${cust.name} (${displayCode})</h4>
                    <p style="margin: 0 0 2px 0; font-size: 12px; color: #64748b;">📞 ${cust.mobile || 'N/A'}</p>
                    <p style="margin: 0 0 2px 0; font-size: 12px; color: #64748b;">📅 Date: ${cust.loanDate} | <span style="color:#ef4444; font-weight:bold;">Due: ₹${currentDue}</span></p>
                </div>
            </div>
            
            <div class="cust-actions" style="display: flex; flex-direction: row; gap: 6px; width: 100%; margin-top: 5px;">
                <a href="${collectUrl}" class="btn-action" style="background: #28a745; color: white; flex: 1; padding: 10px; border-radius: 6px; font-size: 12px; font-weight: bold; text-decoration: none; text-align: center;">Collect EMI</a>
                <button onclick="secureEdit('${cust.id}')" class="btn-action btn-edit" style="background: #ffb703; color: black; flex: 1; padding: 10px; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; border: none;">Edit</button>
                <button onclick="secureDelete('${cust.id}')" class="btn-action btn-delete" style="background: #ef4444; color: white; flex: 1; padding: 10px; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; border: none;">Del</button>
            </div>
        </div>
        `;
    }).join('');
}

window.secureEdit = (docId) => {
    const pass = prompt("🔑 Admin Password:");
    if (pass === ADMIN_PASSWORD) {
        window.location.href = `edit.html?id=${docId}`;
    } else if (pass !== null) {
        alert("❌ Incorrect Password!");
    }
};

window.secureDelete = async (docId) => {
    const pass = prompt("⚠️ WARNING: Enter Admin Password to DELETE:");
    if (pass === ADMIN_PASSWORD) {
        if (!confirm("Confirm Delete?")) return;
        try {
            const batch = writeBatch(db);
            const colQuery = query(collection(db, "collections"), where("customerId", "==", docId));
            const colSnapshot = await getDocs(colQuery);
            colSnapshot.forEach((doc) => batch.delete(doc.ref));
            batch.delete(doc(db, "customers", docId));
            await batch.commit();
            loadCustomers();
        } catch (err) { alert("Error: " + err.message); }
    }
};

if (tabActive) tabActive.onclick = () => { currentStatus = "Active"; renderList(); };
if (tabClosed) tabClosed.onclick = () => { currentStatus = "Closed"; renderList(); };
if (searchInp) searchInp.oninput = renderList;

loadCustomers();
