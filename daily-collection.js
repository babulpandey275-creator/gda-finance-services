import { db } from './firebase.js';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const customerListDiv = document.getElementById("customerList");
const searchInput = document.getElementById("search");
let allCustomers = []; // सभी ग्राहकों को रखने के लिए

// 1. डेटा लोड करें और लिस्ट दिखाएं
async function loadCustomers() {
    const querySnapshot = await getDocs(collection(db, "customers"));
    allCustomers = [];
    customerListDiv.innerHTML = "";

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        allCustomers.push({ id: doc.id, ...data });
        renderCustomer(doc.id, data);
    });
}

function renderCustomer(id, data) {
    const div = document.createElement("div");
    div.className = "customer-item";
    div.style = "padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; display: flex; justify-content: space-between;";
    div.innerHTML = `<span><strong>${data.name}</strong> <br> <small>${data.mobile}</small></span> <span>₹${data.remainingAmount || 0}</span>`;
    
    // क्लिक करने पर विवरण लोड करें
    div.onclick = () => selectCustomer(id, data);
    customerListDiv.appendChild(div);
}

// 2. ग्राहक सेलेक्ट करने पर पेमेंट ब्लॉक अपडेट करना
window.selectCustomer = (id, data) => {
    document.getElementById("emiAmount").innerText = `₹${data.emiAmount || 0}`;
    document.getElementById("remainingAmount").innerText = `₹${data.remainingAmount || 0}`;
    document.getElementById("paymentAmount").value = data.emiAmount || "";
    // पेमेंट बटन में कस्टमर ID स्टोर करें
    document.getElementById("collectBtn").dataset.customerId = id;
    window.scrollTo({ top: document.querySelector('.dashboard-card[style*="var(--primary)"]').offsetTop, behavior: 'smooth' });
};

// 3. पेमेंट कलेक्ट करना
document.getElementById("collectBtn").onclick = async () => {
    const customerId = document.getElementById("collectBtn").dataset.customerId;
    const amount = document.getElementById("paymentAmount").value;
    const mode = document.getElementById("paymentMode").value;
    const note = document.getElementById("note").value;

    if (!customerId) { alert("कृपया पहले एक ग्राहक चुनें!"); return; }

    try {
        await addDoc(collection(db, "collections"), {
            customerId: customerId,
            amount: Number(amount),
            paymentMode: mode,
            note: note,
            date: serverTimestamp()
        });
        alert("पेमेंट सफलतापूर्वक दर्ज हो गया!");
        location.reload(); // पेज रिफ्रेश करें
    } catch (e) {
        console.error("Error: ", e);
    }
};

// 4. सर्च फंक्शन
searchInput.onkeyup = () => {
    const val = searchInput.value.toLowerCase();
    customerListDiv.innerHTML = "";
    allCustomers.filter(c => c.name.toLowerCase().includes(val) || c.mobile.includes(val))
                .forEach(c => renderCustomer(c.id, c));
};

loadCustomers();
