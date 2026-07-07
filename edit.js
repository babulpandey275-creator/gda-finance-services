import { db } from "./firebase.js"; 
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

// URL से कस्टमर की ID निकालना
const id = new URLSearchParams(window.location.search).get("id"); 
if (!id) { 
    alert("कस्टमर ID नहीं मिली!"); 
    throw new Error("Customer ID missing"); 
} 

// HTML के सभी इनपुट फील्ड्स को सेलेक्ट करना
const name = document.getElementById("name"); 
const mobile = document.getElementById("mobile"); 
const address = document.getElementById("address"); 
const loan = document.getElementById("loan"); 
const emi = document.getElementById("emi"); 
const remainingAmount = document.getElementById("remainingAmount"); 
const loanDate = document.getElementById("loanDate"); 

// Firestore में उस कस्टमर का रास्ता (Reference)
const customerRef = doc(db, "customers", id); 

// पुराना डेटा लोड करने के लिए एक async फंक्शन बनाया ताकि await काम कर सके
async function loadCustomerData() {
    try { 
        const snap = await getDoc(customerRef); 
        if (snap.exists()) { 
            const c = snap.data(); 
            name.value = c.name || ""; 
            mobile.value = c.mobile || ""; 
            address.value = c.address || ""; 
            loan.value = c.loan || ""; 
            emi.value = c.emi || ""; 
            remainingAmount.value = c.remainingAmount || ""; 
            loanDate.value = c.loanDate || ""; // लोन की ओरिजिनल तारीख यहाँ लोड होगी
        } else { 
            alert("कस्टमर का डेटा डेटाबेस में नहीं मिला!"); 
        } 
    } catch (err) { 
        console.error("डेटा लोड करने में एरर:", err); 
        alert("कस्टमर डेटा लोड करने में समस्या आई है।"); 
    } 
}

// पेज खुलते ही इस फंक्शन को चलाएं
loadCustomerData();

// "Save" बटन पर क्लिक करने पर डेटा अपडेट करना
document.getElementById("saveBtn").addEventListener("click", async () => { 
    try { 
        await updateDoc(customerRef, { 
            name: name.value, 
            mobile: mobile.value, 
            address: address.value, 
            loan: Number(loan.value), 
            emi: Number(emi.value), 
            remainingAmount: Number(remainingAmount.value), 
            loanDate: loanDate.value // अगर एजेंट लोन की तारीख बदलता है, तो वो भी सेव होगी
        }); 
        alert("कस्टमर का डेटा सफलतापूर्वक अपडेट हो गया है!"); 
        window.location.href = "customer-list.html"; 
    } catch (err) { 
        console.error("अपडेट करने में एरर:", err); 
        alert("अपडेट फेल हो गया: " + err.message); 
    } 
});
