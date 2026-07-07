import { db } from "./firebase.js"; 
import { doc, getDoc, updateDoc, collection, getDocs, query, where, deleteDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const customerId = params.get("id");

    if (!customerId) {
        alert("कस्टमर आईडी गायब है!");
        return;
    }

    const customerRef = doc(db, "customers", customerId);
    let customerData = {};

    // 1. ग्राहक की मुख्य जानकारी और फोटो लोड करना
    async function loadCustomerProfile() {
        const snap = await getDoc(customerRef);
        if (!snap.exists()) {
            alert("ग्राहक का डेटा नहीं मिला!");
            return;
        }
        customerData = snap.data();

        // टेक्स्ट डेटा डिस्प्ले करना
        document.getElementById("lblName").textContent = customerData.name || "-";
        document.getElementById("lblId").textContent = customerId;
        document.getElementById("lblMobile").textContent = customerData.mobile || "-";
        document.getElementById("lblAadhaar").textContent = customerData.aadhaar || "-";
        document.getElementById("lblAddress").textContent = customerData.address || "-";
        document.getElementById("lblLoan").textContent = `₹${customerData.loan || 0}`;
        document.getElementById("lblPlan").textContent = `${customerData.planDays || 60} Days`;
        document.getElementById("lblEmi").textContent = `₹${customerData.emi || 0}`;
        document.getElementById("lblDate").textContent = customerData.loanDate || "-";
        document.getElementById("lblPaidDays").textContent = `${customerData.paidDays || 0} दिन`;
        document.getElementById("lblTotalCollected").textContent = `₹${customerData.totalCollected || 0}`;
        document.getElementById("lblRemaining").textContent = `₹${customerData.remainingAmount ?? customerData.totalCollection}`;

        // 📸 फोटो लोड करने का लॉजिक
        const imgEl = document.getElementById("customerPhotoDisplay");
        if (customerData.customerPhoto && customerData.customerPhoto.startsWith("data:image")) {
            imgEl.src = customerData.customerPhoto; // खींची हुई फोटो दिखाएं
        } else {
            imgEl.src = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"; // डिफ़ॉल्ट प्रोफ़ाइल फोटो आइकॉन
        }
    }

    // 2. किस्त जमा होने का इतिहास लोड करना (टेबल रेंडर)
    async function loadCollectionHistory() {
        const tbody = document.getElementById("collectionTableBody");
        tbody.innerHTML = "";

        // सिर्फ इस ग्राहक की किस्तों को खोजना
        const q = query(collection(db, "collections"), where("customerId", "==", customerId));
        const snap = await getDocs(q);

        if (snap.empty) {
            tbody.innerHTML = `<tr><td colspan="4" style="color:#888;">कोई किस्त जमा नहीं हुई है।</td></tr>`;
            return;
        }

        let index = 1;
        snap.forEach((collectionDoc) => {
            const data = collectionDoc.data();
            const row = document.createElement("tr");

            // तारीख फॉर्मेट को साफ़ करना
            let cleanDate = data.date || "-";
            if (data.date && data.date.seconds) {
                cleanDate = new Date(data.date.seconds * 1000).toISOString().split('T')[0];
            }

            row.innerHTML = `
                <td>${index++}</td>
                <td>${cleanDate}</td>
                <td style="font-weight:bold; color:#16a34a;">₹${data.amount}</td>
                <td>
                    <button class="delete-col-btn delete-btn" data-id="${collectionDoc.id}" data-amount="${data.amount}">🗑️ डिलीट</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // डिलीट बटनों पर क्लिक इवेंट लगाना
        document.querySelectorAll(".delete-col-btn").forEach(btn => {
            btn.onclick = async (e) => {
                const colId = e.target.dataset.id;
                const colAmount = Number(e.target.dataset.amount);
                await deleteCollectionItem(colId, colAmount);
            };
        });
    }

    // 3. 🗑️ गलत किस्त डिलीट करने और बैलेंस रिवर्स करने का मुख्य फ़ंक्शन
    async function deleteCollectionItem(collectionId, amount) {
        const password = prompt("🚨 सुरक्षा पिन डालें (Enter Admin Password to Delete):");
        if (password !== "GDA@2026") { // आपका एडमिन पासवर्ड सुरक्षा जांच
            alert("❌ गलत पासवर्ड! किस्त डिलीट नहीं की गई।");
            return;
        }

        const confirmCheck = confirm(`क्या आप सच में ₹${amount} की किस्त डिलीट करना चाहते हैं? इससे बकाया राशि वापस बढ़ जाएगी।`);
        if (!confirmCheck) return;

        try {
            // A. कलेक्शन कलेक्शन से वो रिकॉर्ड डिलीट करें
            await deleteDoc(doc(db, "collections", collectionId));

            // B. कस्टमर के मुख्य बैलेंस को वापस पहले जैसा करें (पैसे रिफंड जोड़ें)
            const newRemaining = (customerData.remainingAmount ?? customerData.totalCollection) + amount;
            const newTotalCollected = Math.max(0, (customerData.totalCollected || 0) - amount);
            const newPaidDays = Math.max(0, (customerData.paidDays || 0) - 1);

            await updateDoc(customerRef, {
                remainingAmount: newRemaining,
                totalCollected: newTotalCollected,
                paidDays: newPaidDays
            });

            alert("🗑️ किस्त सफलतापूर्वक डिलीट कर दी गई और बैलेंस अपडेट हो गया!");
            // डेटा दोबारा लोड करें ताकि लाइव बदलाव दिखे
            await loadCustomerProfile();
            await loadCollectionHistory();

        } catch (error) {
            console.error("डिलीट करने में एरर:", error);
            alert("तकनीकी गड़बड़ के कारण डिलीट नहीं हो सका।");
        }
    }

    // 📱 व्हाट्सएप शेयरिंग सिस्टम
    document.getElementById("whatsappBtn").onclick = () => {
        const msg = `*GDA Finance Services - खाता विवरण*\n\n` +
                    `*ग्राहक:* ${customerData.name}\n` +
                    `*कुल लोन:* ₹${customerData.loan}\n` +
                    `*दैनिक EMI:* ₹${customerData.emi}\n` +
                    `*कुल जमा:* ₹${customerData.totalCollected || 0}\n` +
                    `*शेष बकाया:* ₹${customerData.remainingAmount ?? customerData.totalCollection}\n\n` +
                    `धन्यवाद! 🙏`;
        window.open(`https://api.whatsapp.com/send?phone=91${customerData.mobile}&text=${encodeURIComponent(msg)}`);
    };

    // 🖨️ प्रिंट और पीडीएफ व्यवस्था
    document.getElementById("printBtn").onclick = () => {
        window.print();
    };

    // शुरुआती लोड रन करें
    await loadCustomerProfile();
    await loadCollectionHistory();
});
