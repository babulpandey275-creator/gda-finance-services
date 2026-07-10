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
            // Spinner loading display 
            historyList.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-light);"><i class="fas fa-spinner fa-spin"></i> डेटा लोड हो रहा है (Loading)...</td></tr>`; 
            
            // 🎯 [बड़ा सुधार]: पहले 'customers' कलेक्शन लोड करें ताकि नाम और मोबाइल मिल सके
            const custSnap = await getDocs(collection(db, "customers"));
            let customerMap = {}; // ग्राहक का डेटा स्टोर करने के लिए एक जादुई तिजोरी
            custSnap.forEach((cDoc) => {
                customerMap[cDoc.id] = cDoc.data();
            });

            // अब 'collections' कलेक्शन लोड करें
            const qSnap = await getDocs(collection(db, "collections")); 
            historyList.innerHTML = ""; 
            
            if (qSnap.empty) { 
                historyList.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">🎉 कोई लेनदेन इतिहास उपलब्ध नहीं है।</td></tr>`; 
                return; 
            } 

            let logArray = []; 
            qSnap.forEach((docSnap) => { 
                logArray.push({ id: docSnap.id, ...docSnap.data() }); 
            }); 

            // Newest entries sorting by timestamp parameters 
            logArray.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)); 

            logArray.forEach((collect) => { 
                // 🔍 तिजोरी से इस किस्त के ग्राहक का नाम और मोबाइल नंबर ढूंढना
                const linkedCustomer = customerMap[collect.customerId] || {};
                
                // 📅 1. Dynamic Date Recovery Logic
                let finalDateDisplay = "-"; 
                if (collect.date) { 
                    finalDateDisplay = collect.date; 
                } else if (collect.createdAt) { 
                    finalDateDisplay = collect.createdAt.split("T")[0]; 
                } 

                // 👤 📞 ग्राहक का नाम और मोबाइल नंबर (अगर कलेक्शन में नहीं है, तो कस्टमर लिस्ट से उठाएगा)
                let finalNameDisplay = collect.customerName || linkedCustomer.name || "अज्ञात ग्राहक";
                let finalMobileDisplay = collect.customerMobile || collect.mobile || linkedCustomer.mobile || "दर्ज नहीं"; 
                let memberIdDisplay = collect.memberId || linkedCustomer.memberId || "";

                // 💳 3. Payment Mode & Note defaults filtering 
                let paymentMode = collect.mode || "Cash"; 
                let transactionNote = collect.note || "EMI Collection"; 

                // Creating perfectly mapped row matching exactly 6 columns layout structure 
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
            historyList.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--danger); font-weight: 600;">⚠️ इतिहास लोड करने में तकनीकी समस्या आई।</td></tr>`; 
        } 
    } 

    await loadAllCollectionHistory(); 
});
