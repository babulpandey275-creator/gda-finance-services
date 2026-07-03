import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const id = new URLSearchParams(window.location.search).get("id");

if (!id) {
  alert("Customer ID Not Found");
  throw new Error("Customer ID Missing");
}

const customerRef = doc(db, "customers", id);

const name = document.getElementById("name");
const customerId = document.getElementById("customerId");
const mobile = document.getElementById("mobile");
const address = document.getElementById("address");
const loan = document.getElementById("loan");
const emi = document.getElementById("emi");
const loanDate = document.getElementById("loanDate");
const totalCollected = document.getElementById("totalCollected");
const remaining = document.getElementById("remaining");
const paidDays = document.getElementById("paidDays");

const historyTable = document.getElementById("historyTable");

let whatsappMessage = "";

async function loadStatement() {

    const snap = await getDoc(customerRef);

    if (!snap.exists()) {
        alert("Customer Not Found");
        return;
    }

    const c = snap.data();

    name.textContent = c.name || "";
    customerId.textContent = c.customerId || "";
    mobile.textContent = c.mobile || "";
    address.textContent = c.address || "";
    loan.textContent = c.loan || 0;
    emi.textContent = c.emi || 0;
    loanDate.textContent = c.loanDate || "";
    remaining.textContent = c.remainingAmount || 0;
    paidDays.textContent = c.paidDays || 0;    let total = 0;
    let sr = 1;

    const q = query(
        collection(db, "collections"),
        where("customerId", "==", id),
        orderBy("date", "desc"),
        limit(120)
    );

    const historySnap = await getDocs(q);

    historyTable.innerHTML = "";

    whatsappMessage =
`🏦 GDA Finance Services

📄 CUSTOMER ACCOUNT STATEMENT

👤 Customer : ${c.name}
🆔 Customer ID : ${c.customerId || ""}
📱 Mobile : ${c.mobile}
🏠 Address : ${c.address}

💰 Loan Amount : ₹${c.loan}
💵 Daily EMI : ₹${c.emi}
📅 Loan Date : ${c.loanDate}

`;

    historySnap.forEach((docSnap) => {

        const h = docSnap.data();

        const amount = Number(h.amount || 0);

        total += amount;

        const date = h.date
            ? new Date(h.date.seconds * 1000).toLocaleDateString()
            : "-";

        historyTable.innerHTML += `
        <tr>
            <td>${sr++}</td>
            <td>${date}</td>
            <td>₹${amount}</td>
        </tr>
        `;

        whatsappMessage += `${date}  -  ₹${amount}\n`;

    });

    totalCollected.textContent = total;

    whatsappMessage += `

━━━━━━━━━━━━━━

✅ Total Collected : ₹${total}

📉 Remaining : ₹${c.remainingAmount || 0}

📅 Paid Days : ${c.paidDays || 0}

🙏 Thank You
GDA Finance Services
`;document.getElementById("shareBtn").addEventListener("click", () => {

    const phone = mobile.textContent.replace(/\D/g, "");

    if (!phone) {
        alert("Customer Mobile Number Not Found");
        return;
    }

    const url =
        "https://wa.me/91" +
        phone +
        "?text=" +
        encodeURIComponent(whatsappMessage);

    window.open(url, "_blank");

});

}

loadStatement().catch((err) => {
    console.error(err);
    alert("Statement Load Failed : " + err.message);
});
