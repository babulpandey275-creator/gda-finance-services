// ==========================================
// 🚀 GDA FINANCE - UPDATED STATEMENT ENGINE (Fine & Buttons Included)
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
            if (!custDoc.exists()) return;
            const cust = custDoc.data();

            // 1. UI Basic Data
            document.getElementById("lblName").innerText = cust.name || "-";
            document.getElementById("lblEmi").innerText = `₹${cust.dailyEmi || 0}`;
            
            // 2. Collection Logs & Fine Logic
            const colRef = collection(db, "collections");
            const q = query(colRef, where("customerId", "==", custId));
            const querySnapshot = await getDocs(colRef); // यहाँ आप अपना query इस्तेमाल करें
            
            let logs = [];
            let totalCollected = 0;
            querySnapshot.forEach(d => { if(d.data().customerId === custId) logs.push({ colId: d.id, ...d.data() }); });
            logs.sort((a,b) => new Date(b.date) - new Date(a.date));

            logs.forEach(l => totalCollected += Number(l.amount || 0));

            // --- FINE CALCULATOR (60 Days Logic) ---
            const startDate = new Date(cust.loanDate);
            const today = new Date();
            const diffTime = Math.abs(today - startDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let fineMsg = "";
            if (diffDays > 60) {
                fineMsg = `⚠️ Fine: ${diffDays - 60} दिन एक्स्ट्रा हो गए हैं!`;
            }
            document.getElementById("lblFine").innerText = fineMsg; // (इसे अपने HTML में ID दें)

            // 3. Button Handlers
            document.getElementById("btnWhatsApp").onclick = () => {
                window.open(`https://wa.me/91${cust.mobile}?text=Hello ${cust.name}, आपका GDA Finance का कलेक्शन पेंडिंग है।`, '_blank');
            };

            document.getElementById("btnPdf").onclick = () => {
                window.print(); // या अपना PDF जनरेशन कोड
            };

            document.getElementById("btnAgreement").onclick = () => {
                window.location.href = `agreement.html?id=${custId}`;
            };

            // [बाकी अपना पुराना कोड यहाँ जोड़ें...]
            
        } catch (err) { console.error(err); }
    }
    loadFullStatement();
});
