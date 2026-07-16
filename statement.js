// ==========================================
// 🚀 GDA FINANCE - STATEMENT ENGINE (Final Settlement Integrated)
// ==========================================

import { db } from "./firebase.js"; 
import { doc, getDoc, collection, getDocs, query, where, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const custId = urlParams.get('id');

    if (!custId) { window.location.href = "customer-list.html"; return; }

    async function loadFullStatement() {
        try {
            const custDoc = await getDoc(doc(db, "customers", custId));
            if (!custDoc.exists()) { alert("कस्टमर नहीं मिला!"); return; }
            const cust = custDoc.data();

            // 1. Basic Data Mapping
            document.getElementById("lblName").innerText = cust.name || "-";
            document.getElementById("lblId").innerText = cust.customerCode || "GDA" + custId.substring(0,3).toUpperCase();
            document.getElementById("lblMobile").innerText = cust.mobile || "-";
            document.getElementById("lblAadhar").innerText = "[Aadhaar Redacted]"; 
            document.getElementById("lblPan").innerText = cust.panCard || cust.pan || "-";
            document.getElementById("lblAddress").innerText = cust.address || "-";
            document.getElementById("lblLoanAmount").innerText = `₹${cust.loanAmount || 0}`;
            document.getElementById("lblLoanDate").innerText = cust.loanDate || "-";
            document.getElementById("lblEmi").innerText = `₹${cust.dailyEmi || 0}`;
            document.getElementById("lblPlan").innerText = cust.planDuration || "-";
            document.getElementById("custPhoto").src = cust.photoUrl || "https://img.icons8.com/color/96/user-male-circle.png";

            // 2. Fetch Collection Logs
            const colRef = collection(db, "collections");
            const q = query(colRef, where("customerId", "==", custId));
            const querySnapshot = await getDocs(q);
            
            let logs = [];
            let totalCollected = 0;
            querySnapshot.forEach(d => { logs.push({ colId: d.id, ...d.data() }); });
            logs.sort((a,b) => new Date(b.date) - new Date(a.date));
            logs.forEach(l => totalCollected += Number(l.amount || 0));

            // 3. Calculation & Logic
            const isSettled = cust.status === "Settled";
            const planDays = Number(cust.planDuration) || 60; 
            const dailyEmi = Number(cust.dailyEmi) || 0;
            const totalDaysPassed = Math.ceil((new Date() - new Date(cust.loanDate)) / (1000 * 60 * 60 * 24));
            const paidDays = logs.length;
            const pendingDays = Math.max(0, totalDaysPassed - paidDays);

            let netDueHtml = "";
            if (isSettled) {
                netDueHtml = `<span style="color:purple; font-weight:bold;">₹${cust.settlementAmount} (Settled)</span>`;
            } else {
                const remaining = Math.max(0, Number(cust.loanAmount) - totalCollected);
                netDueHtml = `₹${remaining}`;
                
                // Fine Logic
                if (totalDaysPassed > planDays) {
                    const overdueDays = totalDaysPassed - planDays;
                    const fineRate = (planDays >= 80) ? 0.30 : 0.20; 
                    const fineAmount = overdueDays * (dailyEmi * fineRate);
                    netDueHtml += `<br><span style="color:red; font-weight:bold;">⚠️ Penalty: ${overdueDays}d (₹${Math.round(fineAmount)})</span>`;
                }
                netDueHtml += `<br><small style="color:orange; font-weight:bold;">⏳ Gap: ${pendingDays} Days</small>`;
            }
            
            document.getElementById("lblRemaining").innerHTML = netDueHtml;
            document.getElementById("lblPaidDays").innerText = `${paidDays} Days Paid`;
            document.getElementById("lblTotalCollected").innerText = `₹${totalCollected}`;

            // 4. Buttons & Settlement Handler
            document.getElementById("btnWhatsapp").onclick = () => window.open(`https://wa.me/91${cust.mobile}`, '_blank');
            document.getElementById("btnPdf").onclick = () => window.print();
            document.getElementById("btnOpenBond").onclick = () => window.location.href = `disbursement-bond.html?id=${custId}`;

            document.getElementById("btnSettlement").onclick = async () => {
                const amt = prompt("Enter Final Settlement Amount:");
                if (amt && prompt("Enter Admin Password:") === "GDA@2026") {
                    await updateDoc(doc(db, "customers", custId), { status: "Settled", settlementAmount: Number(amt) });
                    location.reload();
                }
            };

            // 5. History Table
            const historyRows = document.getElementById("historyRows");
            historyRows.innerHTML = logs.length > 0 ? logs.map(log => `
                <tr>
                    <td>📅 ${log.date}</td>
                    <td>${log.note || 'EMI Received'}</td>
                    <td style="color:#22c55e; text-align:right;">+₹${log.amount}</td>
                    <td><button class="btn-row-del" data-colid="${log.colId}">🗑️</button></td>
                </tr>
            `).join("") : "<tr><td colspan='4' style='text-align:center;'>No data found</td></tr>";

            // Delete Action
            document.querySelectorAll(".btn-row-del").forEach(btn => {
                btn.onclick = async (e) => {
                    if (prompt("Enter Admin Password:") === "GDA@2026") {
                        await deleteDoc(doc(db, "collections", e.target.getAttribute("data-colid")));
                        location.reload();
                    }
                };
            });

        } catch (err) { console.error("Error loading statement:", err); }
    }
    loadFullStatement();
});
