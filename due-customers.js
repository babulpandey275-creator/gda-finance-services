import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const list = document.getElementById("dueList"); 

async function loadDueCustomers() { 
    list.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-light);"><i class="fas fa-spinner fa-spin"></i> बकायेदारों की सूची लोड हो रही है...</td></tr>`; 
    try { 
        const snapshot = await getDocs(collection(db, "customers")); 
        list.innerHTML = ""; 
        
        // 🗓️ आज की तारीख की शुरुआत (00:00:00) सेट की ताकि समय का अंतर बाधा न बने
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let hasDueCustomers = false; 

        snapshot.forEach((docSnap) => { 
            const c = docSnap.data(); 
            if (!c.loanDate || c.status === "Closed") return; 

            // लोन की तारीख को पढ़ें और उसका समय भी 00:00:00 करें
            const loanDate = new Date(c.loanDate); 
            loanDate.setHours(0, 0, 0, 0); 

            // 🚨 मुख्य सुधार: अगर आपने डेट आगे बढ़ाकर आज की या भविष्य की कर दी है, 
            // तो इसका मतलब आज उसका पहला दिन है या अभी लोन शुरू नहीं हुआ है, इसलिए वह ड्यू लिस्ट में नहीं आएगा।
            if (loanDate >= today) {
                return; // इस ग्राहक को छोड़ दो, यह ड्यू नहीं है
            }

            const loanAmount = Number(c.loanAmount || 0); 
            const totalCollected = Number(c.totalCollected || 0); 
            const totalPayableWithInterest = loanAmount + (loanAmount * 0.20); 
            const dynamicRemaining = totalPayableWithInterest - totalCollected; 

            // बीते दिनों का सही अंतर
            const diffTime = today - loanDate; 
            const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
            const paidDays = Number(c.paidDays || 0); 
            const dueDays = totalDays - paidDays; 

            // यदि सच में दिन बकाया हैं और बैलेंस बाकी है, तभी लिस्ट में दिखेगा
            if (dueDays > 0 && dynamicRemaining > 0) { 
                hasDueCustomers = true; 
                const emi = Number(c.emi || 0); 
                const displayId = c.member_id || `ID: ${docSnap.id.substring(0, 5)}...`; 

                list.innerHTML += ` 
                    <tr> 
                        <td> 
                            <div style="font-weight: 600; color: #1565C0;">${c.name || "-"}</div> 
                            <div style="font-size: 11px; color: var(--text-muted);">${displayId}</div> 
                        </td> 
                        <td>${c.mobile || "-"}</td> 
                        <td>₹${emi}</td> 
                        <td style="color: #d32f2f; font-weight: 600;">₹${Math.round(dynamicRemaining)}</td> 
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
