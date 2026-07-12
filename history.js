import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => { 
    const historyList = document.getElementById("historyList"); 
    if (!historyList) { 
        console.error("historyList tbody element not found!"); 
        return; 
    } 

    async function loadAllCollectionHistory() { 
        try { 
            // Converted Spinner loading display to English
            historyList.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-light);"><i class="fas fa-spinner fa-spin"></i> Synchronizing ledger logs...</td></tr>`; 
            
            // Fetch customer collection stream for relation mapping
            const custSnap = await getDocs(collection(db, "customers"));
            let customerMap = {}; 
            custSnap.forEach((cDoc) => {
                customerMap[cDoc.id] = cDoc.data();
            });

            // Fetch primary transaction logs
            const qSnap = await getDocs(collection(db, "collections")); 
            historyList.innerHTML = ""; 
            
            if (qSnap.empty) { 
                historyList.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">🎉 No transaction history available yet.</td></tr>`; 
                return; 
            } 

            let logArray = []; 
            qSnap.forEach((docSnap) => { 
                logArray.push({ id: docSnap.id, ...docSnap.data() }); 
            }); 

            // Sort array dynamically by timestamp bounds
            logArray.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)); 

            logArray.forEach((collect) => { 
                const linkedCustomer = customerMap[collect.customerId] || {};
                
                // Date extraction mapping
                let finalDateDisplay = "-"; 
                if (collect.date) { 
                    finalDateDisplay = collect.date; 
                } else if (collect.createdAt) { 
                    finalDateDisplay = collect.createdAt.split("T")[0]; 
                } 

                // Resolve parameters cleanly to match frontend architecture
                let finalNameDisplay = collect.customerName || linkedCustomer.name || "Unknown Customer";
                let finalMobileDisplay = collect.customerMobile || collect.mobile || linkedCustomer.mobile || "Not Recorded"; 
                let memberIdDisplay = collect.customerCode || collect.memberId || linkedCustomer.customerCode || linkedCustomer.memberId || "";

                let paymentMode = collect.mode || "Cash"; 
                let transactionNote = collect.note || "EMI Collection"; 

                // Append row matrix to dashboard view
                const tr = document.createElement("tr"); 
                tr.innerHTML = ` 
                    <td style="padding: 12px 8px; font-weight: 500;">${finalDateDisplay}</td> 
                    <td> 
                        <div style="font-weight: 600; color: #1565c0;">${finalNameDisplay}</div> 
                        <div style="font-size: 11px; color: var(--text-muted);">${memberIdDisplay}</div> 
                    </td> 
                    <td style="color: #475569;">${finalMobileDisplay}</td> 
                    <td style="color: var(--success); font-weight: bold;">₹${collect.amount || 0}</td> 
                    <td><span class="badge" style="background: #e2e8f0; padding: 4px 8px; border-radius: 6px; font-size: 12px;">${paymentMode}</span></td> 
                    <td style="font-size: 13px; color: #64748b; font-style: italic;">${transactionNote}</td> 
                `; 
                historyList.appendChild(tr); 
            }); 
        } catch (error) { 
            console.error("Technical operational log issue:", error); 
            historyList.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--danger); font-weight: 600;">⚠️ Technical exception encountered while retrieving transaction data.</td></tr>`; 
        } 
    } 

    await loadAllCollectionHistory(); 
});
