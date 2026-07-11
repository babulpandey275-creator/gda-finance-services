import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const list = document.getElementById("dueList"); 

async function loadDueCustomers() { 
    list.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-light);"><i class="fas fa-spinner fa-spin"></i> बकायेदारों की सूची लोड हो रही है...</td></tr>`; 
    try { 
        const snapshot = await getDocs(collection(db, "customers")); 
        list.innerHTML = ""; 
        
        // 🇮🇳 टाइमज़ोन बग से बचने के लिए भारतीय समय (IST) के अनुसार आज की तारीख (YYYY-MM-DD फॉर्मेट) 
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
            
            // 🚨 नियम 1: अगर लोन की तारीख आज की है या आगे की है, तो वह आज ड्यू नहीं हो सकता 
            if (c.loanDate >= todayIST) { 
                return; 
            } 
            
            // 🚨 नियम 2: तारीखों का शुद्ध अंतर (Milliseconds में) 
            const date1 = new Date(todayIST); 
            const date2 = new Date(c.loanDate); 
            const diffTime = Math.abs(date1 - date2); 
            const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
            const paidDays = Number(c.paidDays || 0); 
            const dueDays = totalDays - paidDays; 
            
            const loanAmount = Number(c.loanAmount || 0); 
            const totalCollected = Number(c.totalCollected || 0); 
            const totalPayableWithInterest = loanAmount + (loanAmount * 0.20); 
            const dynamicRemaining = totalPayableWithInterest - totalCollected; 
            
            // यदि सचमुच दिन बकाया हैं और बैलेंस बाकी है, तभी लिस्ट में दिखेगा 
            if (dueDays > 0 && dynamicRemaining > 0) { 
                hasDueCustomers = true; 
                const emi = Number(c.emi || 0); 
                
                // 🛠️ कस्टमर ID बग फिक्स: डेटाबेस से सही ID (GDA006) उठाने का सटीक लॉजिक
                const displayId = c.customerId || c.id || c.member_id || `ID: ${docSnap.id.substring(0, 5)}...`; 
                
                // 🧮 10% और 15% लेट फाइन (Penalty) का एडवांस गणित 
                let penaltyAmount = 0; 
                if (dueDays > 60 && dueDays <= 80) { 
                    // 60 से 80 दिन के बीच: EMI का 10% प्रतिदिन जुर्माना 
                    const extraDays = dueDays - 60; 
                    penaltyAmount = extraDays * (emi * 0.10); 
                } else if (dueDays > 80) { 
                    // 60 से 80 दिन वाले 20 दिनों का 10% के हिसाब से फिक्स जुर्माना 
                    const firstSlabPenalty = 20 * (emi * 0.10); 
                    // 80 दिन से ऊपर के दिनों पर EMI का 15% प्रतिदिन जुर्माना 
                    const extraDays = dueDays - 80; 
                    const secondSlabPenalty = extraDays * (emi * 0.15); 
                    penaltyAmount = firstSlabPenalty + secondSlabPenalty; 
                } 
                
                // 💰 कुल अंतिम देय राशि = मूल बाकी राशि + लेट फाइन 
                const finalRemainingWithPenalty = dynamicRemaining + penaltyAmount; 
                
                list.innerHTML += ` 
                <tr> 
                    <td> 
                        <div style="font-weight: 600; color: #1565C0;">${c.name || "-"}</div> 
                        <div style="font-size: 11px; color: var(--text-muted); font-weight: bold;">${displayId}</div> 
                    </td> 
                    <td>${c.mobile || "-"}</td> 
                    <td>₹${emi}</td> 
                    <td style="color: #d32f2f; font-weight: 600;"> 
                        ₹${Math.round(finalRemainingWithPenalty)} 
                        ${penaltyAmount > 0 ? `<br><span style="font-size:10px; font-weight:500; background:#ffebe9; color:#d32f2f; padding:2px 6px; border-radius:4px; display:inline-block; margin-top:4px;">फाइन: +₹${Math.round(penaltyAmount)}</span>` : ''} 
                    </td> 
                    <td>${dueDays} दिन लंबित</td> 
                    <td> 
                        <a href="collection.html?id=${docSnap.id}" class="btn" style="padding: 5px 10px; font-size: 12px; background: #2e7d32; text-decoration: none; color: white; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;"> 
                            <i class="fas fa-hand-holding-usd"></i> Collect 
                        </a> 
                    </td> 
                </tr>`; 
            } 
        }); 
        
        if (!hasDueCustomers) { 
            list.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#2e7d32; font-weight:600;">🎉 कोई भी ग्राहक बकाया नहीं है! सभी किस्तें समय पर हैं।</td></tr>`; 
        } 
    } catch (err) { 
        console.error("बकाया सूची लोड एरर:", err); 
        list.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--danger);">⚠️ डेटा लोड करने में त्रुटि आई।</td></tr>`; 
    } 
} 

window.addEventListener("DOMContentLoaded", loadDueCustomers);
