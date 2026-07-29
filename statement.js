import { db } from "./firebase.js"; 
import { doc, getDoc, collection, getDocs, query, where, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const urlParams = new URLSearchParams(window.location.search);
const custId = urlParams.get('id');

if (!custId) { window.location.href = "customer-list.html"; }

async function loadFullStatement() {
    try {
        const custDoc = await getDoc(doc(db, "customers", custId));
        if (!custDoc.exists()) { alert("कस्टमर नहीं मिला!"); return; }
        const cust = custDoc.data();

        document.getElementById("lblName").innerText = cust.name || "-";
        document.getElementById("lblId").innerText = cust.customerCode || "GDA";
        document.getElementById("lblMobile").innerText = cust.mobile || "-";
        document.getElementById("lblAadhar").innerText = cust.aadhaar || "-"; 
        document.getElementById("lblPan").innerText = cust.panCard || cust.pan || "-";
        document.getElementById("lblAddress").innerText = cust.address || "-";
        document.getElementById("lblLoanAmount").innerText = `₹${cust.loanAmount || 0}`;
        document.getElementById("lblLoanDate").innerText = cust.loanDate || "-";
        document.getElementById("lblEmi").innerText = `₹${cust.dailyEmi || cust.dailyCollection || 0}`;
        document.getElementById("lblPlan").innerText = cust.planDuration || "-";
        document.getElementById("custPhoto").src = cust.photoUrl || "https://img.icons8.com/color/96/user-male-circle.png";

        // 🔥 FIX: History load - bina auth ke bhi chalega
        let logs = [];
        try {
            const colRef = collection(db, "collections");
            const q = query(colRef, where("customerId", "==", custId));
            const snap = await getDocs(q);
            snap.forEach(d => { logs.push({ colId: d.id, ...d.data() }); });
        } catch(e) {
            // Agar where query fail ho to sab leke filter karo
            const allSnap = await getDocs(collection(db, "collections"));
            allSnap.forEach(d => {
                if(d.data().customerId === custId) logs.push({ colId: d.id, ...d.data() });
            });
        }

        logs.sort((a,b) => new Date(b.date) - new Date(a.date));
        let totalCollected = 0;
        logs.forEach(l => totalCollected += Number(l.amount || 0));

        const totalPayable = Number(cust.totalPayable || cust.totalCollection || cust.loanAmount || 0);
        const remaining = Math.max(0, totalPayable - totalCollected);
        
        document.getElementById("lblRemaining").innerText = `₹${remaining}`;
        document.getElementById("lblPaidDays").innerText = `${logs.length} Days Paid`;
        document.getElementById("lblTotalCollected").innerText = `₹${totalCollected}`;

        document.getElementById("btnWhatsapp").onclick = () => {
            const msg = `*GDA Finance*%0AName: ${cust.name}%0ALoan: ₹${cust.loanAmount}%0APaid: ₹${totalCollected}%0ARemaining: ₹${remaining}%0APaid Days: ${logs.length}`;
            window.open(`https://wa.me/91${cust.mobile}?text=${msg}`, '_blank');
        };
        document.getElementById("btnPdf").onclick = () => window.print();
        document.getElementById("btnOpenBond").onclick = () => window.location.href = `disbursement-bond.html?id=${custId}`;
        document.getElementById("btnSettlement").onclick = async () => {
            const pass = prompt("Admin Password:");
            if(pass !== "GDA@2026") return alert("गलत पासवर्ड");
            const amt = prompt("Settlement Amount:");
            if(amt) { await updateDoc(doc(db, "customers", custId), { status: "Settled" }); alert("Settled!"); location.reload(); }
        };

        const historyRows = document.getElementById("historyRows");
        if(logs.length === 0){
            historyRows.innerHTML = "<tr><td colspan='4' style='text-align:center;padding:20px;'>No EMI Found</td></tr>";
        } else {
            historyRows.innerHTML = logs.map(log => `
                <tr>
                    <td>📅 ${log.date}</td>
                    <td>${log.note || 'EMI'}</td>
                    <td style="color:#10b981;text-align:right;">+₹${log.amount}</td>
                    <td><button class="btn-row-del" data-colid="${log.colId}" style="background:#d32f2f;color:white;border:none;padding:4px 8px;border-radius:5px;">🗑️</button></td>
                </tr>
            `).join("");
        }

    } catch (err) { console.error(err); document.getElementById("historyRows").innerHTML = `<tr><td colspan=4>Error: ${err.message}</td></tr>`; }
}

loadFullStatement();
