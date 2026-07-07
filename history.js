import { db } from "./firebase.js"; 
import { collection, getDocs, query, orderBy, deleteDoc, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const historyList = document.getElementById("historyList"); 

async function loadHistory() { 
    // शुरुआती लोडिंग एनीमेशन (टेबल फॉर्मेट में)
    historyList.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-light);"><i class="fas fa-spinner fa-spin"></i> लोड हो रहा है...</td></tr>`; 
    
    const q = query( 
        collection(db, "collections"), 
        orderBy("date", "desc") 
    ); 
    
    const snapshot = await getDocs(q); 
    historyList.innerHTML = ""; 
    
    if (snapshot.empty) { 
        historyList.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; font-weight:600; color:var(--danger);">❌ कोई कलेक्शन इतिहास नहीं मिला</td></tr>`; 
        return; 
    } 
    
    snapshot.forEach((documentSnap) => { 
        const id = documentSnap.id; 
        const c = documentSnap.data(); 
        
        // तारीख को सही फॉर्मेट में बदलें
        const formattedDate = c.date?.toDate ? c.date.toDate().toLocaleString("en-IN") : "-";
        
        // टेबल रो (Row) का ढांचा जो आपकी नई HTML टेबल में एकदम फिट बैठेगा
        historyList.innerHTML += ` 
            <tr>
                <td><strong>${formattedDate}</strong></td>
                <td>
                    <div style="font-weight: 600; color: var(--primary-dark);">${c.customerName || ""}</div>
                    <div style="font-size: 11px; color: var(--text-light);">Paid Days: ${c.paidDays || 0} दिन</div>
                </td>
                <td>${c.mobile || ""}</td>
                <td>
                    <div style="color: var(--success); font-weight: 700;">₹${c.amount || 0}</div>
                    <div style="font-size: 11px; color: var(--danger);">शेष: ₹${c.remainingAmount || 0}</div>
                </td>
                <td>
                    <span class="badge badge-warning">${c.paymentMode || "Cash"}</span>
                </td>
                <td>
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                        <span style="font-size: 13px; color: var(--text-light);">${c.note || "-"}</span>
                        <!-- आधुनिक डिलीट बटन -->
                        <button class="btn btn-danger" style="width: auto; padding: 6px 12px; font-size: 12px; border-radius: 8px; display: inline-flex; align-items: center; gap: 4px;" onclick="window.deleteCollection('${id}')"> 
                            <i class="fas fa-trash-can"></i> हटाएं 
                        </button>
                    </div>
                </td>
            </tr> 
        `; 
    }); 
} 

window.deleteCollection = async function(id) { 
    const pin = prompt("🔒 कृपया एडमिन पिन (Admin PIN) दर्ज करें:"); 
    if (pin === null) return; 
    if (pin !== "2750") { 
        alert("❌ गलत एडमिन पिन!"); 
        return; 
    } 
    
    const ok = confirm("क्या आप वाकई यह Collection डिलीट करना चाहते हैं? इससे ग्राहक का पुराना हिसाब वापस पहले जैसा हो जाएगा।"); 
    if (!ok) return; 
    
    try { 
        const collectionRef = doc(db, "collections", id); 
        const collectionSnap = await getDoc(collectionRef); 
        if (!collectionSnap.exists()) { 
            alert("कलेक्शन रिकॉर्ड नहीं मिला!"); 
            return; 
        } 
        
        const data = collectionSnap.data(); 
        const customerRef = doc(db, "customers", data.customerId); 
        const customerSnap = await getDoc(customerRef); 
        
        if (customerSnap.exists()) { 
            const customer = customerSnap.data(); 
            await updateDoc(customerRef, { 
                remainingAmount: (customer.remainingAmount || 0) + (data.amount || 0), 
                paidDays: Math.max( 
                    0, 
                    (customer.paidDays || 0) - Math.floor((data.amount || 0) / (customer.emi || 1)) 
                ), 
                totalCollected: Math.max( 
                    0, 
                    (customer.totalCollected || 0) - (data.amount || 0) 
                ) 
            }); 
        } 
        
        await deleteDoc(collectionRef); 
        alert("✅ कलेक्शन सफलतापूर्वक डिलीट कर दिया गया है।"); 
        loadHistory(); 
    } catch (e) { 
        alert("डिलीट करने में विफलता : " + e.message); 
    } 
}; 

// पेज लोड होते ही डेटा लोड करें
loadHistory();
