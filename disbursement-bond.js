import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

window.addEventListener('DOMContentLoaded', async () => {
    const custId = new URLSearchParams(window.location.search).get('id');
    if (!custId) return;

    const docSnap = await getDoc(doc(db, "customers", custId));
    if (!docSnap.exists()) return;
    const cust = docSnap.data();

    console.log("CUSTOMER DATA:", cust); // <-- Isme dekho photo ka naam kya hai

    // Aapke saare data fill
    document.getElementById("bondName").innerText = cust.name || "-";
    document.getElementById("bondId").innerText = cust.customerCode || custId.substring(0,6);
    document.getElementById("bondMobile").innerText = cust.mobile || "-";
    document.getElementById("bondDate").innerText = cust.loanDate || "-";
    document.getElementById("bondAddress").innerText = cust.address || "-";
    document.getElementById("bondAmount").innerText = `₹${cust.loanAmount || 0}`;
    document.getElementById("bondPlan").innerText = `${cust.planDuration || 60} Days`;
    document.getElementById("bondEmi").innerText = `₹${cust.dailyEmi || 0}`;
    document.getElementById("bondTotalPayable").innerText = `₹${Math.round((Number(cust.loanAmount||0)*1.2))}`;

    // PHOTO - 10 naam try karega
    const photoEl = document.getElementById("bondPhoto");
    const placeholder = document.getElementById("photoPlaceholder");
    const possibleKeys = ['photoUrl','photo','customerPhoto','imageUrl','profilePic','custPhoto','customerImage','image','photoURL','imgUrl'];
    let foundUrl = null;
    for(let k of possibleKeys){
        if(cust[k] && typeof cust[k] === 'string' && cust[k].startsWith('http')){
            foundUrl = cust[k];
            console.log("PHOTO MILA Key:", k, "URL:", foundUrl);
            break;
        }
    }
    if(foundUrl){
        photoEl.src = foundUrl;
        photoEl.style.display = "block";
        placeholder.style.display = "none";
    } else {
        console.log("PHOTO KA KOI URL NAHI MILA, Keys hain:", Object.keys(cust));
        photoEl.style.display="none";
        placeholder.innerText = (cust.name||'C').charAt(0).toUpperCase();
        placeholder.style.display="flex";
    }
    document.getElementById("btnPrintBond").onclick = () => window.print();
});
