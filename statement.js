import { db } from "./firebase.js"; 
import { doc, getDoc, collection, query, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {

    // 🔗 URL से कस्टमर (डॉक्यूमेंट) ID निकालना
    const urlParams = new URLSearchParams(window.location.search);
    const custId = urlParams.get('id');

    if (!custId) {
        alert("⚠️ कोई ग्राहक ID नहीं मिली!");
        window.location.href = "customer-list.html";
        return;
    }

    // 📺 HTML एलिमेंट्स को जोड़ना
    const lblName = document.getElementById("lblName");
    const lblId = document.getElementById("lblId");
    const lblMobile = document.getElementById("lblMobile");
    const lblAadhaar = document.getElementById("lblAadhaar");
    const lblAddress = document.getElementById("lblAddress");
    const lblLoan = document.getElementById("lblLoan");
    const lblPlan = document.getElementById("lblPlan");
    const lblEmi = document.getElementById("lblEmi");
    const lblDate = document.getElementById("lblDate");
    const lblPaidDays = document.getElementById("lblPaidDays");
    const lblTotalCollected = document.getElementById("lblTotalCollected");
    const lblRemaining = document.getElementById("lblRemaining");
    const customerPhotoDisplay = document.getElementById("customerPhotoDisplay");
    const collectionTableBody = document.getElementById("collectionTableBody");

    /* ========================================= 
    👤 1. ग्राहक का डेटा लोड करना और स्क्रीन पर दिखाना
    ========================================= */ 
    async function loadCustomerStatement() {
        try {
            const docRef = doc(db, "customers", custId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                alert("⚠️ ग्राहक का रिकॉर्ड नहीं मिला!");
                window.location.href = "customer-list.html";
                return;
            }

            const customer = docSnap.data();

            // 🎯 लंबी रैंडम ID की जगह नई जेनरेटेड member_id दिखाना
            lblId.textContent = customer.member_id || `ID: ${custId.substring(0, 5)}...`;

            // बाकी का सारा डेटा स्क्रीन पर सेट करना
            lblName.textContent = customer.name || "-";
            lblMobile.textContent = customer.mobile || "-";
            
            // 🎯 आधार नंबर को स्क्रीन पर साफ-साफ दिखाने के लिए बदलाव
            lblAadhaar.textContent = customer.aadhaar || "-";
            
            lblAddress.textContent = customer.address || "-";
            lblLoan.textContent = `₹${customer.loanAmount || 0}`;
            lblPlan.textContent = `${customer.loanPlan || 0} Days`;
            lblEmi.textContent = `₹${customer.emi || 0}`;
            
            // 🎯 लोन वितरण की तारीख (loanDate) को स्क्रीन पर दिखाना
            lblDate.textContent = customer.loanDate || "-"; 
            
            lblPaidDays.textContent = `${customer.paidDays || 0} दिन`;
            lblTotalCollected.textContent = `₹${customer.totalCollected || 0}`;
            lblRemaining.textContent = `₹${customer.remainingAmount || 0}`;

            // अगर कस्टमर की लाइव फोटो मौजूद है, तो उसे दिखाएं
            if (customer.customerPhoto) {
                customerPhotoDisplay.src = customer.customerPhoto;
            }

            // इस ग्राहक का कलेक्शन इतिहास लोड करें
            await loadCollectionHistory();

        } catch (error) {
            console.error("स्टेटमेंट लोड करने में एरर:", error);
            alert("डेटा लोड करने में तकनीकी समस्या आई है।");
        }
    }

    /* ========================================= 
    🕒 2. किस्त जमा होने का इतिहास (Collection History) लोड करना
    ========================================= */ 
    async function loadCollectionHistory() {
        try {
            // इंडेक्स एरर से बचने के लिए यहाँ से orderBy हटाकर सिंपल क्वेरी रखी है
            const q = query(
                collection(db, "collections"), 
                where("customerId", "==", custId)
            );
            const querySnapshot = await getDocs(q);

            collectionTableBody.innerHTML = "";

            if (querySnapshot.empty) {
                collectionTableBody.innerHTML = `<tr><td colspan="4">अभी तक कोई किस्त जमा नहीं हुई है।</td></tr>`;
                return;
            }

            // सारे डॉक्यूमेंट्स को एक एरे में लेकर टाइमस्टैम्प के हिसाब से उल्टा (Latest First) सॉर्ट करना
            let collectionsArray = [];
            querySnapshot.forEach((docSnap) => {
                collectionsArray.push({ id: docSnap.id, ...docSnap.data() });
            });

            // जावास्क्रिप्ट सॉर्टिंग (ताकि फायरबेस इंडेक्स एरर न दे)
            collectionsArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            let index = 1;
            collectionsArray.forEach((collect) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${index++}</td>
                    <td>${collect.date || "-"}</td>
                    <td><strong>₹${collect.amount || 0}</strong></td>
                    <td><button class="delete-btn" data-id="${collect.id}">❌</button></td>
                `;
                collectionTableBody.appendChild(tr);
            });

        } catch (error) {
            console.error("कलेशन हिस्ट्री लोड करने में एरर:", error);
            collectionTableBody.innerHTML = `<tr><td colspan="4" style="color:red;">इतिहास लोड करने में समस्या आई।</td></tr>`;
        }
    }

    // प्रिंट और व्हाट्सएप शेयर के बटन्स
    const printBtn = document.getElementById("printBtn");
    if (printBtn) {
        printBtn.onclick = () => window.print();
    }

    const whatsappBtn = document.getElementById("whatsappBtn");
    if (whatsappBtn) {
        whatsappBtn.onclick = () => {
            const text = `🏦 *GDA Finance Services*\n*Statement*\n\n👤 नाम: ${lblName.textContent}\n🆔 ID: ${lblId.textContent}\n🗓️ लोन तारीख: ${lblDate.textContent}\n💰 शेष बकाया: ${lblRemaining.textContent}`;
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
        };
    }

    // रन करें
    await loadCustomerStatement();
});
