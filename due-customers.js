import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const list = document.getElementById("dueList"); 

async function loadDueCustomers() { 
    // टेबल के अंदर सुंदर स्पिनर लोडिंग एनीमेशन
    list.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-light);"><i class="fas fa-spinner fa-spin"></i> बकायेदारों की सूची लोड हो रही है...</td></tr>`; 
    
    const snapshot = await getDocs(collection(db, "customers")); 
    list.innerHTML = ""; 
    
    const today = new Date(); 
    let hasDueCustomers = false; // यह चेक करने के लिए कि कोई बकायेदार मिला या नहीं

    snapshot.forEach((docSnap) => { 
        const c = docSnap.data(); 
        if (!c.loanDate || c.status === "Closed") return; // यदि लोन बंद हो चुका है तो उसे छोड़ दें
        
        const loanDate = new Date(c.loanDate); 
        const diffTime = today - loanDate; 
        const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
        const paidDays = Number(c.paidDays || 0); 
        const dueDays = totalDays - paidDays; 

        // यदि किस्त बकाया है और शेष राशि 0 से अधिक है
        if (dueDays > 0 && Number(c.remainingAmount) > 0) { 
            hasDueCustomers = true;
            const dueAmount = dueDays * Number(c.emi); 
            
            // टेबल रो (Row) का ढांचा जो आपकी नई HTML टेबल में एकदम फिट बैठेगा
            list.innerHTML += ` 
                <tr>
                    <td>
                        <div style="font-weight: 600; color: var(--primary-dark);">${c.name}</div>
                        <div style="font-size: 11px; color: var(--text-light);">ID: ${c.customerId}</div>
                    </td>
                    <td>${c.mobile}</td>
                    <td>
                        <div style="font-weight: 600;">₹${c.emi}</div>
                        <div style="font-size: 11px; color: var(--text-light);">Paid: ${paidDays} दिन</div>
                    </td>
                    <td>
                        <div style="color: var(--danger); font-weight: 700;">₹${dueAmount}</div>
                        <div style="font-size: 11px; color: var(--danger); font-weight: 600;">(${dueDays} दिन बाकी)</div>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-dark);">₹${c.remainingAmount}</div>
                        <div style="font-size: 11px; color: var(--text-light);">Total: ₹${c.loan}</div>
                    </td>
                    <td>
                        <div style="display: flex; gap: 6px; align-items: center;">
                            <a href="tel:${c.mobile}" class="btn btn-success" style="width: auto; padding: 6px 10px; font-size: 12px; border-radius: 6px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                                <i class="fas fa-phone"></i> कॉल
                            </a>
                            <a href="daily-collection.html" class="btn" style="width: auto; padding: 6px 10px; font-size: 12px; border-radius: 6px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; background: var(--primary);">
                                <i class="fas fa-hand-holding-usd"></i> किस्त लें
                            </a>
                        </div>
                    </td>
                </tr> 
            `; 
        } 
    }); 

    // यदि पूरी लिस्ट छानने के बाद एक भी बकायेदार नहीं मिला
    if (!hasDueCustomers) { 
        list.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding:40px; color:var(--success); font-weight:600; font-size:16px;">
                    🎉 बहुत बढ़िया! इस समय कोई भी Due Customer नहीं है। सभी किस्तें समय पर हैं।
                </td>
            </tr>`; 
    } 
} 

// पेज लोड होते ही फंक्शन रन करें
loadDueCustomers();
