import { db } from "./firebase.js"; 
import { doc, getDoc, collection, getDocs, query, where, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => { 
    const urlParams = new URLSearchParams(window.location.search); 
    const custId = urlParams.get('id'); 
    if (!custId) { 
        window.location.href = "customer-list.html"; 
        return; 
    } 

    // 🇮🇳 टाइमज़ोन से बचने के लिए भारतीय समय (IST) के अनुसार आज की तारीख (YYYY-MM-DD)
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const todayParts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date());
    const yyyy = todayParts.find(p => p.type === 'year').value;
    const mm = todayParts.find(p => p.type === 'month').value;
    const dd = todayParts.find(p => p.type === 'day').value;
    const todayIST = `${yyyy}-${mm}-${dd}`;

    async function loadFullStatement() { 
        try { 
            const custDoc = await getDoc(doc(db, "customers", custId)); 
            if (!custDoc.exists()) { 
                alert("रिकॉर्ड उपलब्ध नहीं है!"); 
                return; 
            } 
            const cust = custDoc.data(); 
            
            document.getElementById("lblName").innerText = cust.name || "-"; 
            document.getElementById("lblId").innerText = cust.customerCode || "GDA" + custId.substring(0,3).toUpperCase(); 
            document.getElementById("lblMobile").innerText = cust.mobile || "-"; 
            
            // आधार फ़ील्ड सुरक्षित रेंडरिंग (बिना डिजिट्स को दोहराए)
            const rawAadhar = cust.aadharCard || cust.aadhar || "-"; 
            const aadharElem = document.getElementById("lblAadhar");
            if (aadharElem) aadharElem.innerText = rawAadhar; 

            document.getElementById("lblPan").innerText = cust.panCard || cust.pan || "-"; 
            document.getElementById("lblAddress").innerText = cust.address || "-"; 
            
            const baseLoan = Number(cust.loanAmount) || 0; 
            document.getElementById("lblLoanAmount").innerText = `₹${baseLoan}`; 
            
            const rawDuration = cust.planDuration || cust.duration || "60"; 
            document.getElementById("lblPlan").innerText = rawDuration.toString().includes("Days") ? rawDuration : `${rawDuration} Days`; 
            
            const emi = Number(cust.dailyEmi || cust.emi || 0);
            document.getElementById("lblEmi").innerText = `₹${emi}`; 
            document.getElementById("lblLoanDate").innerText = cust.loanDate || "-"; 
            
            if (cust.customerPhoto) document.getElementById("custPhoto").src = cust.customerPhoto; 

            // कलेक्शन हिस्ट्री लोड करना
            let totalCollected = 0; 
            let rowsHtml = ""; 
            const colRef = collection(db, "collections"); 
            const q = query(colRef, where("customerId", "==", custId)); 
            const querySnapshot = await getDocs(q); 
            let logs = []; 
            
            querySnapshot.forEach(d => logs.push({ colId: d.id, ...d.data() })); 
            logs.sort((a,b) => new Date(b.date) - new Date(a.date)); 

            if (logs.length === 0) { 
                rowsHtml = `<tr><td colspan="4" style="text-align:center;color:#64748b;">कोई किस्त जमा नहीं हुई है।</td></tr>`; 
            } else { 
                logs.forEach((log) => { 
                    const amt = Number(log.amount) || 0; 
                    totalCollected += amt; 
                    rowsHtml += `<tr><td>📅 ${log.date}</td><td>${log.note || 'EMI Received'}</td><td style="text-align:right;font-weight:bold;color:#22c55e;">+₹${amt}</td><td><button class="btn-row-del" data-colid="${log.colId}" data-amount="${amt}">🗑️</button></td></tr>`; 
                }); 
            } 

            const paidDaysCount = logs.length; 
            document.getElementById("lblPaidDays").innerText = `${paidDaysCount} दिन`; 
            document.getElementById("lblTotalCollected").innerText = `₹${totalCollected}`; 

            const totalWithInterest = baseLoan + (baseLoan * 0.20); 
            const dynamicRemaining = totalWithInterest - totalCollected; 

            // 🧮 1. गैप दिन (लंबित दिन) और लेट फाइन (Penalty) का लाइव गणित
            let gapDays = 0;
            let penaltyAmount = 0;

            if ((cust.status || "Active") === "Active" && cust.loanDate && cust.loanDate < todayIST) {
                const date1 = new Date(todayIST);
                const date2 = new Date(cust.loanDate);
                const diffTime = Math.abs(date1 - date2);
                const totalDaysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                gapDays = totalDaysPassed - paidDaysCount;
                if (gapDays < 0) gapDays = 0;

                // प्रतिशत नियम: 60-80 दिन पर 10% रोज, 80+ दिन पर 15% रोज
                if (gapDays > 60 && gapDays <= 80) {
                    penaltyAmount = (gapDays - 60) * (emi * 0.10);
                } else if (gapDays > 80) {
                    penaltyAmount = (20 * (emi * 0.10)) + ((gapDays - 80) * (emi * 0.15));
                }
            }

            const finalPayableNow = dynamicRemaining + penaltyAmount;

            // स्क्रीन पर कुल देय राशि और गैप दिन रेंडर करना
            document.getElementById("lblRemaining").innerText = `₹${Math.round(finalPayableNow)}`;

            // यदि एचटीएमएल में गैप दिन या फाइन के एलिमेंट्स नहीं भी हैं, तो उन्हें ढूंढकर सेट करना या बनाना
            let gapRow = document.getElementById("lblGapDaysRow");
            if (!gapRow) {
                const summaryDiv = document.getElementById("lblRemaining").parentElement.parentElement;
                gapRow = document.createElement("div");
                gapRow.id = "lblGapDaysRow";
                gapRow.style = "display:flex; flex-direction:column; gap:4px; margin-top:8px; font-size:13px; font-weight:500; color:#d32f2f;";
                summaryDiv.appendChild(gapRow);
            }
            
            if (penaltyAmount > 0) {
                gapRow.innerHTML = `<span>⚠️ कुल बकाया (गैप) दिन: <b>${gapDays} दिन</b></span>
                                    <span>🔥 कुल शामिल लेट फाइन: <b>₹${Math.round(penaltyAmount)}</b></span>`;
            } else {
                gapRow.innerHTML = `<span style="color:#2e7d32;">✅ कुल बकाया (गैप) दिन: <b>${gapDays} दिन</b></span>`;
            }

            document.getElementById("historyRows").innerHTML = rowsHtml; 

            // 🗑️ किस्त लॉग डिलीट करने का सिस्टम
            document.querySelectorAll(".btn-row-del").forEach(btn => { 
                btn.onclick = async (e) => { 
                    e.stopPropagation();
