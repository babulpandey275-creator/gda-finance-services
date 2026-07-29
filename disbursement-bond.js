import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// URL से Customer ID लें
const urlParams = new URLSearchParams(window.location.search);
const customerId = urlParams.get('id');

if (!customerId) {
  alert("❌ Customer ID not found in URL!");
  throw new Error("Missing customer ID");
}

// DOM Elements
const elements = {
  name: document.getElementById("bName"),
  code: document.getElementById("bCode"),
  mobile: document.getElementById("bMobile"),
  date: document.getElementById("bDate"),
  aadhaar: document.getElementById("bAadhaar"),
  pan: document.getElementById("bPan"),
  address: document.getElementById("bAddress"),
  principal: document.getElementById("bPrincipal"),
  duration: document.getElementById("bDuration"),
  emi: document.getElementById("bEmi"),
  total: document.getElementById("bTotal"),
  photo: document.getElementById("bondPhoto"),
  placeholder: document.getElementById("photoPlaceholder"),
};

async function loadBond() {
  try {
    const docSnap = await getDoc(doc(db, "customers", customerId));
    if (!docSnap.exists()) {
      alert("❌ Customer not found in database!");
      return;
    }
    const c = docSnap.data();

    // --- 1. Fill all text fields ---
    elements.name.innerText = c.name || '-';
    elements.code.innerText = c.customerCode || customerId.substring(0, 6).toUpperCase();
    elements.mobile.innerText = c.mobile || '-';
    elements.date.innerText = c.loanDate || c.startDate || new Date().toISOString().split('T')[0];
    
    // Aadhar (supports both spellings)
    elements.aadhaar.innerText = c.aadhar || c.aadhaar || '-';
    elements.pan.innerText = c.pan || '-';
    elements.address.innerText = c.address || '-';

    const loanAmt = Number(c.loanAmount || 0);
    const dailyEmi = Number(c.dailyEmi || c.emi || 0);
    const duration = Number(c.planDuration || c.duration || 60);
    const totalPayable = Math.round(loanAmt * 1.2); // 20% interest

    elements.principal.innerText = `₹${loanAmt.toLocaleString('en-IN')}`;
    elements.duration.innerText = `${duration} Days`;
    elements.emi.innerText = `₹${dailyEmi}`;
    elements.total.innerText = `₹${totalPayable.toLocaleString('en-IN')}`;

    // --- 2. Photo Handling (try multiple possible keys) ---
    const photoKeys = ['photoUrl', 'photo', 'customerPhoto', 'imageUrl', 'profilePic', 'custPhoto', 'customerImage', 'image', 'photoURL', 'imgUrl'];
    let foundUrl = null;
    for (let key of photoKeys) {
      if (c[key] && typeof c[key] === 'string' && c[key].startsWith('http')) {
        foundUrl = c[key];
        break;
      }
    }

    if (foundUrl) {
      elements.photo.src = foundUrl;
      elements.photo.style.display = 'block';
      elements.placeholder.style.display = 'none';
    } else {
      elements.photo.style.display = 'none';
      elements.placeholder.style.display = 'flex';
      // Show first letter of name as placeholder
      elements.placeholder.innerText = (c.name || 'C').charAt(0).toUpperCase();
    }

    // --- 3. WhatsApp Share ---
    document.getElementById("btnWhatsApp").addEventListener('click', () => {
      const msg = `*GDA FINANCE - LOAN BOND*%0A%0A👤 Name: ${c.name}%0A🆔 Code: ${c.customerCode}%0A📞 Mobile: ${c.mobile}%0A📅 Loan Date: ${c.loanDate || c.startDate || 'N/A'}%0A💰 Loan Amount: ₹${loanAmt}%0A📆 Duration: ${duration} Days%0A💵 Daily EMI: ₹${dailyEmi}%0A📊 Total Payable: ₹${totalPayable}%0A🆔 Aadhar: ${c.aadhar || c.aadhaar || 'N/A'}%0A📇 PAN: ${c.pan || 'N/A'}%0A🏠 Address: ${c.address || 'N/A'}%0A📍 Branch: Garhwa`;
      window.open(`https://wa.me/91${c.mobile}?text=${msg}`, '_blank');
    });

  } catch (err) {
    alert("❌ Error loading bond data: " + err.message);
    console.error(err);
  }
}

// Load the data
loadBond();
