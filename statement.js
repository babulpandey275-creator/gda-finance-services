// ==========================================
// 🚀 GDA FINANCE - STATEMENT ENGINE (Final Version)
// ==========================================

import { db } from "./firebase.js"; 
import { doc, getDoc, collection, getDocs, query, where, deleteDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const custId = urlParams.get('id');

    if (!custId) { 
        window.location.href = "customer-list.html"; 
        return; 
    }

    async function loadFullStatement() {
        try {
            const custDoc = await getDoc(doc(db, "customers", custId));
            if (!custDoc.exists()) {
                alert("कस्टमर नहीं मिला!");
                return;
            }
            const cust = custDoc.data();

            // 1. UI Basic Data Mapping
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
            
            const photoUrl = cust.photoUrl || "https://img.icons8.com/color/96/user-male-circle.png";
            document.getElementById("custPhoto").src = photoUrl;

            // 2. Fetch Collection Logs
            const colRef = collection(db, "collections");
            const q = query(colRef, where("customerId", "==", custId));
            const querySnapshot = await getDocs(q);
            
            let logs = [];
            let totalCollected = 0;
            querySnapshot.forEach(d => { logs.push({ colId: d.id, ...d.data() }); });
            logs.sort((a,b) => new Date(b.date) - new Date(a.date));
            logs.forEach(l => totalCollected += Number(l.amount || 0));

            // 3. Calculation, Fine, and Gap Logic
            const planDays = Number(cust.planDuration) || 60; 
            const dailyEmi = Number(cust.dailyEmi) || 0;
            const totalDaysPassed = Math.ceil((new Date() - new Date(cust.loanDate)) / (1000 * 60 * 60 * 24));
            const paidDays = logs.length;
            const pendingDays = Math.max(0, totalDaysPassed - paidDays);

            let fineAmount = 0;
            let fineMessage = "";

            // Fine Logic: Plan duration ke baad hi fine lagega
            if (totalDaysPassed > planDays) {
                const overdueDays = totalDaysPassed - planDays;
                // 80 din ke liye 30%, baki ke liye 20%
                const fineRate = (planDays >= 80) ? 0.30 : 0.20; 
                fineAmount = overdueDays * (dailyEmi * fineRate);
                
                fineMessage = `<br><span style="color:red; font-weight:bold;">⚠️ Penalty: ${overdueDays} Days Overdue (₹${Math.round(fineAmount)} Fine)</span>`;
            }

            // Display Values
            document.getElementById("lblPaidDays").innerText = `${paidDays} Days Paid`;
            document.getElementById("lblTotalCollected").innerText = `₹${totalCollected}`;
            
            const baseLoan = Number(cust.loanAmount) || 0;
            const remaining = Math.max(0, baseLoan - totalCollected);
            
            let netDueHtml = `₹${remaining}`;
            netDueHtml += `<br><small style="color:orange; font-weight:bold;">⏳ Gap/Pending: ${pendingDays} Days</small>`;
            netDueHtml += fineMessage; 
            
            document.getElementById("lblRemaining").innerHTML = netDueHtml;

            // 4. History Table Rendering
            const historyRows = document.getElementById("historyRows");
            historyRows.innerHTML = logs.length > 0 ? logs.map(log => `
                <tr>
                    <td>📅 ${log.date}</td>
                    <td>${log.note || 'EMI Received'}</td>
                    <td style="color:#22c55e; text-align:right;">+₹${log.amount}</td>
                    <td><button class="btn-row-del" data-colid="${log.colId}">🗑️</button></td>
                </tr>
            `).join("") : "<tr><td colspan='4' style='text-align:center;'>No data found</td></tr>";

            // 5. Button Handlers
            document.getElementById("btnWhatsapp").onclick = () => {
                window.open(`https://wa.me/91${cust.mobile}?text=GDA Finance: Hello ${cust.name}, आपका बकाया ${remaining} है।`, '_blank');
            };

            document.getElementById("btnPdf").onclick = () => window.print();

            document.getElementById("btnOpenBond").onclick = () => {
                window.location.href = `disbursement-bond.html?id=${custId}`;
            };

            // Delete Action
            document.querySelectorAll(".btn-row-del").forEach(btn => {
                btn.onclick = async (e) => {
                    if (prompt("Enter Admin Password:") === "GDA@2026") {
                        await deleteDoc(doc(db, "collections", e.target.getAttribute("data-colid")));
                        loadFullStatement(); 
                    }
                };
            });

        } catch (err) { 
            console.error("Error loading statement:", err); 
        }
    }
    loadFullStatement();
});
