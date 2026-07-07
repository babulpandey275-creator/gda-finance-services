import { db } from "./firebase.js";
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

async function loadStatement() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id"); // URL से Customer ID लें
    if (!id) return;

    try {
        // 1. ग्राहक की प्रोफाइल जानकारी लाएं
        const customerSnap = await getDoc(doc(db, "customers", id));
        if (customerSnap.exists()) {
            const data = customerSnap.data();
            
            // HTML एलिमेंट्स में डेटा भरें
            document.getElementById("name").textContent = data.name || "-";
            document.getElementById("customerId").textContent = id;
            document.getElementById("mobile").textContent = data.mobile || "-";
            document.getElementById("address").textContent = data.address || "-";
            document.getElementById("loan").textContent = data.loan || "0";
            document.getElementById("emi").textContent = data.emi || "0";
            document.getElementById("loanDate").textContent = data.loanDate || "-";
            document.getElementById("paidDays").textContent = data.paidDays || "0";
            document.getElementById("remaining").textContent = data.remainingAmount || "0";
            
            // नया: आधार संख्या और फोटो सेट करें
            document.getElementById("idNumber").textContent = data.idNumber || "[Aadhaar Redacted]";
            if (data.photoUrl) {
                document.getElementById("customerPhoto").src = data.photoUrl;
            }

            // 2. कलेक्शन हिस्ट्री लाएं
            const q = query(collection(db, "collections"), where("customerId", "==", id));
            const historySnap = await getDocs(q);
            const history = [];
            historySnap.forEach((docSnap) => history.push(docSnap.data()));

            // तारीख के हिसाब से सॉर्ट करें
            history.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));

            let total = 0;
            let sr = 1;
            let whatsappMessage = `*GDA Finance - स्टेटमेंट*\n\nनाम: ${data.name}\nमोबाइल: ${data.mobile}\n\n*किस्त विवरण:*\n`;
            
            const historyTable = document.getElementById("historyTable");
            historyTable.innerHTML = "";

            history.forEach((h) => {
                const amount = Number(h.amount || 0);
                total += amount;
                const date = h.date ? new Date(h.date.seconds * 1000).toLocaleDateString("en-IN") : "-";
                
                historyTable.innerHTML += `
                    <tr>
                        <td>${sr++}</td>
                        <td>${date}</td>
                        <td>₹${amount}</td>
                    </tr>
                `;
                whatsappMessage += `${date} - ₹${amount}\n`;
            });

            document.getElementById("totalCollected").textContent = total;
            
            // व्हाट्सएप शेयर बटन
            document.getElementById("shareBtn").onclick = () => {
                const msg = encodeURIComponent(whatsappMessage + `\nकुल जमा: ₹${total}\nशेष बकाया: ₹${data.remainingAmount}`);
                window.open(`https://wa.me/${data.mobile}?text=${msg}`, "_blank");
            };
        }
    } catch (err) {
        console.error("स्टेटमेंट लोड करने में एरर:", err);
    }
}

loadStatement();
