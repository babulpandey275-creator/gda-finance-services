import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const list = document.getElementById("dueList"); 

async function loadDueCustomers() { 
    // टेबल के अंदर सुंदर स्पिनर लोडिंग एनीमेशन 
    list.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-light);"><i class="fas fa-spinner fa-spin"></i> बकायेदारों की सूची लोड हो रही है...</td></tr>`; 
    
    try {
        const snapshot = await getDocs(collection(db, "customers")); 
        list.innerHTML = ""; 
        const today = new Date(); 
        let hasDueCustomers = false; 

        snapshot.forEach((docSnap) => { 
            const c = docSnap.data(); 
            if (!c.loanDate || c.status === "Closed") return; 

            // Core Amounts Extraction matching backend structure
            const loanAmount = Number(c.loanAmount || 0);
            const totalCollected = Number(c.totalCollected || 0);

            // 20% interest ratio logic mapping (10k -> 12k | 15k -> 18k)
            const totalPayableWithInterest = loanAmount + (loanAmount * 0.20);
            const dynamicRemaining = totalPayableWithInterest - totalCollected;

            const loanDate = new Date(c.loanDate); 
            const diffTime = today - loanDate; 
            const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
            const paidDays = Number(c.paidDays || 0); 
            const dueDays = totalDays - paidDays; 

            // Fixed filter conditional rule logic
            if (dueDays > 0 && dynamicRemaining > 0) { 
                hasDueCustomers = true; 
                const emi = Number(c.emi || 0);
                const dueAmount = dueDays * emi; 
                
                // FIXED: Schema structural identification mapping variables (member_id & loanAmount)
                const displayId = c.member_id || `ID: ${docSnap.id.substring(0, 5)}...`;

                // टेबल रो (Row) का ढांचा - FIXED redirection flow to collection.html
                list.innerHTML += ` 
                    <tr> 
                        <td> 
                            <div style="font-weight: 600; color: var(--primary-dark);">${c.name || "-"}</div> 
                            <div style="font-size: 11px; color: var(--text-light);">${displayId}</div> 
                        </td> 
                        <td>${c.mobile || "-"}</td>
