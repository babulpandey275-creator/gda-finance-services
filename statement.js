// ==========================================
// 🚀 GDA FINANCE - CUSTOMER LEDGER STATEMENT & ACTION HANDLER (v14)
// ==========================================

import { db } from "./firebase.js"; 
import { 
    doc, 
    getDoc, 
    collection, 
    getDocs, 
    query, 
    where, 
    deleteDoc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const custId = urlParams.get('id');

    if (!custId) {
        window.location.href = "customer-list.html";
        return;
    }

    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const todayParts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date());
    const yyyy = todayParts.find(p => p.type === 'year').value;
    const mm = todayParts.find(p => p.type === 'month').value;
    const dd = todayParts.find(p => p.type === 'day').value;
    const todayIST = `${yyyy}-${mm}-${dd}`;

    async function loadFullStatement() {
        try {
            const custDoc = await getDoc(doc(db, "customers", custId));
            if (!custDoc.exists()) {
                alert("Customer record not found!");
                return;
            }
            const cust = custDoc.data();

            // 1. UI Injection
            if (document.getElementById("lblName")) document.getElementById("lblName").innerText = cust.name || "-";
            if (document.getElementById("lblId")) document.getElementById("lblId").innerText = cust.customerCode || "GDA" + custId.substring(0,3).toUpperCase();
            if (document.getElementById("lblMobile")) document.getElementById("lblMobile").innerText = cust.mobile || "-";
            
            // आधार सुरक्षा: यहाँ हमने नंबर छुपा दिया है
            if (document.getElementById("lblAadhar")) document.getElementById("lblAadhar").innerText = "[Aadhaar Redacted]";
            
            if (document.getElementById("lblPan")) document.getElementById("lblPan").innerText = cust.panCard || cust.pan || "-";
            if (document.getElementById("lblAddress")) document.getElementById("lblAddress").innerText = cust.address || "-";
            
            // फोटो रेंडरिंग फिक्स
            if (document.getElementById("custPhoto")) {
                const photoUrl = cust.photoUrl || "https://via.placeholder.com/150";
                document.getElementById("custPhoto").src = photoUrl;
            }
            
            const baseLoan = Number(cust.loanAmount) || 0;
            if (document.getElementById("lblLoanAmount")) document.getElementById("lblLoanAmount").innerText = `₹${baseLoan}`;
            
            const emi = Number(cust.dailyEmi || cust.emi || 0);
            if (document.getElementById("lblEmi")) document.getElementById("lblEmi").innerText = `₹${emi}`;
            if (document.getElementById("lblLoanDate")) document.getElementById("lblLoanDate").innerText = cust.loanDate || "-";

            // 2. Collection Logs
            let totalCollected = 0;
            let rowsHtml = "";
            const colRef = collection(db, "collections");
            const q = query(colRef, where("customerId", "==", custId));
            const querySnapshot = await getDocs(q);
            let logs = [];

            querySnapshot.forEach(d => logs.push({ colId: d.id, ...d.data() }));
            logs.sort((a,b) => new Date(b.date) - new Date(a.date));

            if (logs.length === 0) {
                rowsHtml = `<tr><td colspan="4" style="text-align:center;">No installments recorded.</td></tr>`;
            } else {
                logs.forEach((log) => {
                    const amt = Number(log.amount) || 0;
                    totalCollected += amt;
                    rowsHtml += `<tr><td>📅 ${log.date}</td><td>${log.note || 'Received'}</td><td style="color:#22c55e;">+₹${amt}</td><td><button class="btn-row-del" data-colid="${log.colId}" data-amount="${amt}">🗑️</button></td></tr>`;
                });
            }

            if (document.getElementById("lblPaidDays")) document.getElementById("lblPaidDays").innerText = `${logs.length} Days`;
            if (document.getElementById("lblTotalCollected")) document.getElementById("lblTotalCollected").innerText = `₹${totalCollected}`;
            if (document.getElementById("historyRows")) document.getElementById("historyRows").innerHTML = rowsHtml;

            // 3. Logic & Security
            const ADMIN_PASSWORD = "GDA@2026";
            
            // Delete Logic
            document.querySelectorAll(".btn-row-del").forEach(btn => {
                btn.onclick = async (e) => {
                    const colId = e.currentTarget.getAttribute("data-colid");
                    if (prompt("Enter Admin Password:") === ADMIN_PASSWORD) {
                        await deleteDoc(doc(db, "collections", colId));
                        loadFullStatement();
                    }
                };
            });

        } catch (err) {
            console.error(err);
        }
    }

    loadFullStatement();
});
