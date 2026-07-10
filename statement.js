import { db } from "./firebase.js"; 
import { doc, getDoc, collection, getDocs, query, where, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => { 
    const urlParams = new URLSearchParams(window.location.search); 
    const custId = urlParams.get('id'); 
    if (!custId) { 
        window.location.href = "customer-list.html"; 
        return; 
    } 

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
            
            // आधार फ़ील्ड डिस्प्ले मास्क/सुरक्षित रेंडरिंग
            const rawAadhar = cust.aadharCard || cust.aadhar || "-"; 
            document.getElementById("lblAadhar").innerText = rawAadhar; 
            
            document.getElementById("lblPan").innerText = cust.panCard || cust.pan || "-"; 
            document.getElementById("lblAddress").innerText = cust.address || "-"; 
            const baseLoan = Number(cust.loanAmount) || 0; 
            document.getElementById("lblLoanAmount").innerText = `₹${baseLoan}`; 
            const rawDuration = cust.planDuration || cust.duration || "60"; 
            document.getElementById("lblPlan").innerText = rawDuration.toString().includes("Days") ? rawDuration : `${rawDuration} Days`; 
            document.getElementById("lblEmi").innerText = `₹${cust.dailyEmi || cust.emi || 0}`; 
            document.getElementById("lblLoanDate").innerText = cust.loanDate || "-"; 
            if (cust.customerPhoto) document.getElementById("custPhoto").src = cust.customerPhoto; 

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
            const finalRemain = totalWithInterest - totalCollected; 
            document.getElementById("lblRemaining").innerText = `₹${finalRemain}`; 
            document.getElementById("historyRows").innerHTML = rowsHtml; 

            // 🎯 [सुधार]: यहाँ अब डिलीट करने पर तीनों वैल्यूज़ (Remaining, Total Collected, Paid Days) ऑटो-अपडेट होंगी
            document.querySelectorAll(".btn-row-del").forEach(btn => { 
                btn.onclick = async (e) => { 
                    e.stopPropagation(); 
                    const colId = e.currentTarget.getAttribute("data-colid"); 
                    const amt = Number(e.currentTarget.getAttribute("data-amount")); 
                    const adminPassword = prompt("🔐 सुरक्षा लॉक: एंट्री डिलीट करने के लिए एडमिन पासवर्ड डालें:"); 
                    
                    if (adminPassword === "GDA@2026") { 
                        if (confirm(`⚠️ क्या आप सच में ₹${amt} की यह किस्त डिलीट करना चाहते हैं?`)) { 
                            try { 
                                // 1. कलेक्शन लॉग से डिलीट करें
                                await deleteDoc(doc(db, "collections", colId)); 

                                // 2. नए सही हिसाब की गणना करें
                                const updatedCollected = totalCollected - amt; 
                                const newRemaining = totalWithInterest - updatedCollected; 
                                const newPaidDays = paidDaysCount - 1; // 1 दिन कम करें

                                // 3. कस्टमर के मास्टर रिकॉर्ड में तीनों वैल्यू एक साथ अपडेट करें
                                await updateDoc(doc(db, "customers", custId), { 
                                    remainingAmount: newRemaining,
                                    totalCollected: updatedCollected,
                                    paidDays: newPaidDays >= 0 ? newPaidDays : 0
                                }); 

                                alert("🗑️ किस्त डिलीट हो गई और ग्राहक का खाता अपडेट कर दिया गया है!"); 
                                loadFullStatement(); 
                            } catch (err) { 
                                alert("⚠️ एरर आया।"); 
                            } 
                        } 
                    } else if (adminPassword !== null) { 
                        alert("❌ गलत पासवर्ड!"); 
                    } 
                }; 
            }); 

            document.getElementById("btnPdf").onclick = () => { 
                window.print(); 
            }; 

            document.getElementById("btnWhatsapp").onclick = () => { 
                let historyText = ""; 
                if (logs.length > 0) { 
                    logs.forEach((log, index) => { 
                        const displayIndex = logs.length - index; 
                        historyText += `\n${displayIndex}. 🗓️ ${log.date} ➡️ ₹${log.amount}`; 
                    }); 
                } else { 
                    historyText = "\nकोई किस्त विवरण नहीं है।"; 
                } 
                const msg = encodeURIComponent(`🏦 *GDA Finance Services*\n*Account Statement*\n\n👤 *नाम:* ${cust.name}\n🆔 *ID:* ${cust.customerCode || 'GDA'}\n🗓️ *लोन तारीख:* ${cust.loanDate || '-'}\n💵 *कुल लोन राशि:* ₹${baseLoan}\n✅ *कुल प्राप्त दिन:* ${paidDaysCount} दिन\n💰 *कुल जमा राशि:* ₹${totalCollected}\n🔻 *शेष बकाया:* ₹${finalRemain}\n\n📊 *किस्त जमा इतिहास (History):*${historyText}`); 
                window.open(`https://api.whatsapp.com/send?phone=91${cust.mobile}&text=${msg}`); 
            }; 
        } catch (err) { 
            console.error(err); 
            document.getElementById("historyRows").innerHTML = "<tr><td colspan='4'>डेटा लोड एरर!</td></tr>"; 
        } 
    } 
    loadFullStatement(); 
});
