// statement.js - FINAL FIXED - History aur Photo Wapas Ayega
import { db, auth } from "./firebase.js"; 
import { doc, getDoc, collection, getDocs, query, where, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const ADMIN_PASSWORD = "GDA@2026";

auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const custId = urlParams.get('id');
    if (!custId) { 
        window.location.href = "customer-list.html"; 
        return; 
    }

    try {
        const custDoc = await getDoc(doc(db, "customers", custId));
        if (!custDoc.exists()) { 
            alert("कस्टमर नहीं मिला!"); 
            return; 
        }
        const cust = custDoc.data();

        // 🔥 FIX: Dono naam se data lega - purana aur naya
        document.getElementById("lblName").innerText = cust.name || "-";
        document.getElementById("lblId").innerText = cust.customerCode || "GDA" + custId.substring(0,3).toUpperCase();
        document.getElementById("lblMobile").innerText = cust.mobile || "-";
        document.getElementById("lblAadhar").innerText = cust.aadhaar || "-"; 
        document.getElementById("lblPan").innerText = cust.panCard || cust.pan || "-";
        document.getElementById("lblAddress").innerText = cust.address || "-";
        document.getElementById("lblLoanAmount").innerText = `₹${cust.loanAmount || 0}`;
        document.getElementById("lblLoanDate").innerText = cust.loanDate || "-";
        document.getElementById("lblEmi").innerText = `₹${cust.dailyEmi || cust.dailyCollection || 0}`;
        document.getElementById("lblPlan").innerText = cust.planDuration || "-";
        document.getElementById("custPhoto").src = cust.photoUrl || "https://img.icons8.com/color/96/user-male-circle.png";

        const colRef = collection(db, "collections");
        const q = query(colRef, where("customerId", "==", custId));
        const querySnapshot = await getDocs(q);
        
        let logs = [];
        let totalCollected = 0;
        querySnapshot.forEach(d => { logs.push({ colId: d.id, ...d.data() }); });
        logs.sort((a,b) => new Date(b.date) - new Date(a.date));
        logs.forEach(l => totalCollected += Number(l.amount || 0));

        const totalPayable = Number(cust.totalPayable || cust.totalCollection || 0);
        const remaining = Math.max(0, totalPayable - totalCollected);
        
        document.getElementById("lblRemaining").innerHTML = `₹${remaining}`;
        document.getElementById("lblPaidDays").innerText = `${logs.length} Days Paid`;
        document.getElementById("lblTotalCollected").innerText = `₹${totalCollected}`;

        document.getElementById("btnWhatsapp").onclick = () => window.open(`https://wa.me/91${cust.mobile}`, '_blank');
        document.getElementById("btnPdf").onclick = () => window.print();
        document.getElementById("btnOpenBond").onclick = () => window.location.href = `disbursement-bond.html?id=${custId}`;

        document.getElementById("btnSettlement").onclick = async () => {
            const pass = prompt("Admin Password डालें:");
            if (pass !== ADMIN_PASSWORD) { if (pass !== null) alert("❌ गलत पासवर्ड!"); return; }
            const amt = prompt("Enter Final Settlement Amount:");
            if (amt !== null && !isNaN(amt)) {
                await updateDoc(doc(db, "customers", custId), { status: "Settled", settlementAmount: Number(amt) });
                alert("✅ Settlement Successful!"); location.reload();
            }
        };

        const historyRows = document.getElementById("historyRows");
        if(logs.length > 0){
            historyRows.innerHTML = logs.map(log => `
                <tr>
                    <td>📅 ${log.date}</td>
                    <td>${log.note || 'EMI Received'}</td>
                    <td style="color:#22c55e; text-align:right;">+₹${log.amount}</td>
                    <td><button class="btn-row-del" data-colid="${log.colId}">🗑️</button></td>
                </tr>
            `).join("");
        } else {
            historyRows.innerHTML = "<tr><td colspan='4' style='text-align:center;'>No EMI found</td></tr>";
        }

        document.querySelectorAll(".btn-row-del").forEach(btn => {
            btn.onclick = async (e) => {
                const pass = prompt("Admin Password डालें:");
                if (pass !== ADMIN_PASSWORD) { if (pass !== null) alert("❌ गलत पासवर्ड!"); return; }
                if (confirm("Delete करना है?")) {
                    const colId = e.target.getAttribute("data-colid");
                    const colDoc = await getDoc(doc(db, "collections", colId));
                    const colAmount = colDoc.exists()? Number(colDoc.data().amount || 0) : 0;
                    await deleteDoc(doc(db, "collections", colId));
                    const custRef = doc(db, "customers", custId);
                    const custSnap = await getDoc(custRef);
                    if(custSnap.exists()){
                        const cData = custSnap.data();
                        await updateDoc(custRef, {
                            totalCollected: Math.max(0, Number(cData.totalCollected || totalCollected) - colAmount),
                            paidDays: Math.max(0, Number(cData.paidDays || 0) - 1)
                        });
                    }
                    alert("✅ Delete ho gaya!"); location.reload();
                }
            };
        });

    } catch (err) { 
        console.error("Error:", err); 
        alert("❌ Error: " + err.message);
    }
});
