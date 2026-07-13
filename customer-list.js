import { db } from "./firebase.js"; 
import { collection, getDocs, writeBatch, query, where, doc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

let allCustomers = [];
let currentStatus = "Active";

async function loadCustomers() {
    const listContainer = document.getElementById("listContainer");
    if (listContainer) listContainer.innerHTML = "⏳ Loading...";
    
    try {
        const querySnapshot = await getDocs(collection(db, "customers"));
        allCustomers = [];
        querySnapshot.forEach((doc) => { allCustomers.push({ id: doc.id, ...doc.data() }); });
        renderList();
    } catch (err) {
        console.error("Error loading customers:", err);
    }
}

function renderList() {
    const listContainer = document.getElementById("listContainer");
    const searchInp = document.getElementById("searchInp");
    if (!listContainer) return;
    
    const searchTerm = searchInp ? searchInp.value.toLowerCase() : "";
    
    const filtered = allCustomers.filter(c => 
        (c.status === currentStatus) && 
        (c.name && (c.name.toLowerCase().includes(searchTerm) || (c.mobile && c.mobile.includes(searchTerm))))
    );

    if (filtered.length === 0) {
        listContainer.innerHTML = `<p style="text-align:center; padding:20px; color:#64748b;">No ${currentStatus.toLowerCase()} customers found.</p>`;
        return;
    }

    listContainer.innerHTML = filtered.map(cust => {
        // 🧮 सही OD कैलकुलेशन (Today - LoanDate + 1)
        const loanDate = new Date(cust.loanDate);
        const today = new Date();
        const diffTime = today - loanDate;
        let daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        if (daysElapsed < 1) daysElapsed = 1; 
        
        const currentOD = Math.max(0, (daysElapsed * Number(cust.dailyEmi || 0)) - Number(cust.paidAmount || 0));
        const displayCode = cust.customerCode || cust.member_id || `GDA${String(cust.member_no || 0).padStart(3, '0')}`;

        // 🔗 प्रोफाइल और एडिट के लिंक्स
        const profileUrl = `profile.html?id=${cust.id}`;
        const editUrl = `edit-customer.html?id=${cust.id}`; // या जो भी आपकी एडिट फ़ाइल का नाम है

        return `
        <div class="cust-card">
            <img src="${cust.customerPhoto || 'https://via.placeholder.com/55'}" class="cust-avatar" style="cursor:pointer;" onclick="window.location.href='${profileUrl}'">
            
            <div class="cust-info">
                <h4>${cust.name} (${displayCode})</h4>
                <p>📞 ${cust.mobile || 'N/A'}</p>
                <p>📅 ${cust.loanDate} | <b style="color:red;">OD: ₹${currentOD}</b></p>
            </div>
            
            <div class="cust-actions">
                <a href="${profileUrl}" class="btn btn-view" style="background: #ffb703; color: black;">Edit</a>
                <button class="btn btn-del" onclick="deleteCustomer('${cust.id}')" style="background: #ef4444; color: white;">Delete</button>
            </div>
        </div>
        `;
    }).join('');
}

// 🗑️ कैस्केडिंग डिलीट (इतिहास समेत साफ़ करने के लिए)
window.deleteCustomer = async (docId) => {
    if (!confirm("⚠️ Are you sure? This deletes ALL history!")) return;
    try {
        const batch = writeBatch(db);
        const colSnapshot = await getDocs(query(collection(db, "collections"), where("customerId", "==", docId)));
        colSnapshot.forEach((doc) => batch.delete(doc.ref));
        batch.delete(doc(db, "customers", docId));
        await batch.commit();
        alert("✅ Deleted successfully!");
        loadCustomers();
    } catch (err) { alert("Error: " + err.message); }
};

if (document.getElementById("tabActive")) document.getElementById("tabActive").onclick = () => { currentStatus = "Active"; renderList(); };
if (document.getElementById("tabClosed")) document.getElementById("tabClosed").onclick = () => { currentStatus = "Closed"; renderList(); };
if (document.getElementById("searchInp")) document.getElementById("searchInp").oninput = renderList;

loadCustomers();
