import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const list = document.getElementById("dueList"); 

async function loadDueCustomers() { 
    list.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-light);"><i class="fas fa-spinner fa-spin"></i> Loading overdue customer records...</td></tr>`; 
    try { 
        const snapshot = await getDocs(collection(db, "customers")); 
        list.innerHTML = ""; 
        
        // 🇮🇳 Timezone Sync (IST) Setup - Format: YYYY-MM-DD
        const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }; 
        const todayParts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date()); 
        const yyyy = todayParts.find(p => p.type === 'year').value; 
        const mm = todayParts.find(p => p.type === 'month').value; 
        const dd = todayParts.find(p => p.type === 'day').value; 
        const todayIST = `${yyyy}-${mm}-${dd}`; 
        
        let hasDueCustomers = false; 
        
        snapshot.forEach((docSnap) => { 
            const c = docSnap.data(); 
            if (!c.loanDate || c.status === "Closed") return; 
            
            // 🚨 Rule 1: Exclude loans starting today or in the future
            if (c.loanDate >= todayIST) { 
                return; 
            } 
            
            // 🚨 Rule 2: Precision Day Difference Tracker using Math.floor
            const date1 = new Date(todayIST); 
            const date2 = new Date(c.loanDate); 
            const diffTime = date1 - date2; 
            let totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
            if (totalDays < 0) totalDays = 0;

            const paidDays = Number(c.paidDays || 0); 
            const dueDays = totalDays - paidDays; 
            
            const loanAmount = Number(c.loanAmount || 0); 
            const totalCollected = Number(c.totalCollected || 0); 
            const totalPayableWithInterest = loanAmount + (loanAmount * 0.20); 
            const dynamicRemaining = totalPayableWithInterest - totalCollected; 
            
            // Render inside ledger only if actual due days exist and outstanding balance remains
            if (dueDays > 0 && dynamicRemaining > 0) { 
                hasDueCustomers = true; 
                const emi = Number(c.dailyEmi || c.emi || 0); 
                
                // Customer ID String Resolution Block
                const displayId = c.customerCode || c.customerId || "GDA" + docSnap.id.substring(0, 3).toUpperCase(); 
                
                // 🧮 Fine Calculation Engine Slabs
                let penaltyAmount = 0; 
                if (dueDays > 60 && dueDays <= 80) { 
                    const extraDays = dueDays - 60; 
                    penaltyAmount = extraDays * (emi * 0.10); 
                } else if (dueDays > 80) { 
                    const firstSlabPenalty = 20 * (emi * 0.10); 
                    const extraDays = dueDays - 80; 
                    const secondSlabPenalty = extraDays * (emi * 0.15); 
                    penaltyAmount = firstSlabPenalty + secondSlabPenalty;
