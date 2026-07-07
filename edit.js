import { db } from "./firebase.js"; 
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

// पेज पूरी तरह लोड होने के बाद कोड चले
window.addEventListener('DOMContentLoaded', async () => {
    const id = new URLSearchParams(window.location.search).get("id"); 
    if (!id) { 
        alert("कस्टमर ID नहीं मिली! कृपया ग्राहक लिस्ट से दोबारा क्लिक करें।"); 
        return;
    } 

    const name = document.getElementById("name"); 
    const mobile = document.getElementById("mobile"); 
    const address = document.getElementById("address"); 
    const loan = document.getElementById("loan"); 
    const emi = document.getElementById("emi"); 
    const remainingAmount = document.getElementById("remainingAmount"); 
    const loanDate = document.getElementById("loanDate"); 

    const customerRef = doc(db, "customers", id); 

    // डेटा लोड करना
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
            loanDate.value = c.loanDate || ""; 
        } else { 
            alert("यह ग्राहक डेटाबेस में नहीं मिला!"); 
        } 
    } catch (err) { 
        console.error(err); 
        alert("डेटा लोड करने में समस्या आई।"); 
    } 

    // सेव बटन का लॉजिक
    document.getElementById("saveBtn").onclick = async () => { 
        try { 
            await updateDoc(customerRef, { 
                name: name.value, 
                mobile: mobile.value, 
                address: address.value, 
                loan: Number(loan.value), 
                emi: Number(emi.value), 
                remainingAmount: Number(remainingAmount.value), 
                loanDate: loanDate.value 
            }); 
            alert("डेटा अपडेट हो गया है!"); 
            window.location.href = "customer-list.html"; 
        } catch (err) { 
            alert("अपडेट फेल: " + err.message); 
        } 
    };
});
