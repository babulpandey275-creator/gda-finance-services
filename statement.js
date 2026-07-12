// ==========================================
// 🚀 GDA FINANCE - CUSTOMER LEDGER STATEMENT & ACTION HANDLER (v13)
// ==========================================

import { db } from "./firebase.js"; 
import { 
    doc, 
    getDoc, 
    collection, 
    getDocs, 
    query, 
    where, 
    deleteDoc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const custId = urlParams.get('id');

    if (!custId) {
        window.location.href = "customer-list.html";
        return;
    }

    // 🇮🇳 Indian Standard Time (IST) Date Configurator (YYYY-MM-DD)
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
                alert("Customer ledger record not found in system databases!");
                return;
            }
            const cust = custDoc.data();

            // 1. Injecting Profile Data Into English Fields Safely
            if (document.getElementById("lblName")) document.getElementById("lblName").innerText = cust.name || "-";
            if (document.getElementById("lblId")) document.getElementById("lblId").innerText = cust.customerCode || "GDA" + custId.substring(0,3).toUpperCase();
            if (document.getElementById("lblMobile")) document.getElementById("lblMobile").innerText = cust.mobile || "-";
            if (document.getElementById("lblAadhar")) document.getElementById("lblAadhar").innerText = cust.aadharCard || cust.aadhaar || "-";
            if (document.getElementById("lblPan")) document.getElementById("lblPan").innerText = cust.panCard || cust.pan || "-";
            if (document.getElementById("lblAddress")) document.getElementById("lblAddress").innerText = cust.address || "-";
            
            const baseLoan = Number(cust.loanAmount) || 0;
            if (document.getElementById("lblLoanAmount")) document.getElementById("lblLoanAmount").innerText = `₹${baseLoan}`;
            
            const rawDuration = cust.planDuration || cust.duration || "60";
            if (document.getElementById("lblPlan")) document.getElementById("lblPlan").innerText = rawDuration.toString().includes("Days") ? rawDuration : `${rawDuration} Days`;
            
            const emi = Number(cust.dailyEmi || cust.emi || 0);
            if (document.getElementById("lblEmi")) document.getElementById("lblEmi").innerText = `₹${emi}`;
            if (document.getElementById("lblLoanDate")) document.getElementById("lblLoanDate").innerText = cust.loanDate || "-";
            
            if (cust.customerPhoto && document.getElementById("custPhoto")) {
                document.getElementById("custPhoto").src = cust.customerPhoto;
            }

            // 2. Load and Accumulate Complete Collection Logs
            let totalCollected = 0;
            let rowsHtml = "";
            const colRef = collection(db, "collections");
            const q = query(colRef, where("customerId", "==", custId));
            const querySnapshot = await getDocs(q);
            let logs = [];

            querySnapshot.forEach(d => logs.push({ colId: d.id, ...d.data() }));
            logs.sort((a,b) => new Date(b.date) - new Date(a.date));

            if (logs.length === 0) {
                rowsHtml = `<tr><td colspan="4" style="text-align:center; color:#64748b;">No installments recorded yet.</td></tr>`;
            } else {
                logs.forEach((log) => {
                    const amt = Number(log.amount) || 0;
                    totalCollected += amt;
                    rowsHtml += `<tr>
                        <td>📅 ${log.date}</td>
                        <td>${log.note || 'EMI Received'}</td>
                        <td style="text-align:right; font-weight:bold; color:#22c55e;">+₹${amt}</td>
                        <td><button class="btn-row-del" data-colid="${log.colId}" data-amount="${amt}">🗑️</button></td>
                    </tr>`;
                });
            }

            const paidDaysCount = logs.length;
            if (document.getElementById("lblPaidDays")) document.getElementById("lblPaidDays").innerText = `${paidDaysCount} Days`;
            if (document.getElementById("lblTotalCollected")) document.getElementById("lblTotalCollected").innerText = `₹${totalCollected}`;

            const totalWithInterest = baseLoan + (baseLoan * 0.20);
            const dynamicRemaining = totalWithInterest - totalCollected;

            // 🧮 Pure Mathematical Engine for Gap Days & Late Penalty Processing
            let gapDays = 0;
            let penaltyAmount = 0;

            if ((cust.status || "Active") === "Active" && cust.loanDate && cust.loanDate < todayIST) {
                const date1 = new Date(todayIST);
                const date2 = new Date(cust.loanDate);
                const diffTime = Math.abs(date1 - date2);
                const totalDaysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                gapDays = totalDaysPassed - paidDaysCount;
                if (gapDays < 0) gapDays = 0;

                if (gapDays > 60 && gapDays <= 80) {
                    penaltyAmount = (gapDays - 60) * (emi * 0.10);
                } else if (gapDays > 80) {
                    penaltyAmount = (20 * (emi * 0.10)) + ((gapDays - 80) * (emi * 0.15));
                }
            }

            const finalPayableNow = dynamicRemaining + penaltyAmount;

            // 🖥️ UI Warning Rendering Panel (Converted to Crisp Technical English Messages)
            const lblRemaining = document.getElementById("lblRemaining");
            if (lblRemaining) {
                lblRemaining.innerText = `₹${Math.round(finalPayableNow)}`;
                let gapRow = document.getElementById("lblGapDaysRow");
                
                if (!gapRow) {
                    gapRow = document.createElement("div");
                    gapRow.id = "lblGapDaysRow";
                    gapRow.style = "margin-top:6px; font-size:12px; font-weight:bold;";
                    lblRemaining.parentNode.appendChild(gapRow);
                }

                if (penaltyAmount > 0) {
                    gapRow.innerHTML = `<span style="color:#d32f2f;">⚠️ GAP DETECTED: ${gapDays} Days | Fine Charged: ₹${Math.round(penaltyAmount)}</span>`;
                } else {
                    gapRow.innerHTML = `<span style="color:#2e7d32;">✅ GAP ANALYSIS: ${gapDays} Days (No Penalty Imposed)</span>`;
                }
            }

            if (document.getElementById("historyRows")) {
                document.getElementById("historyRows").innerHTML = rowsHtml;
            }

            // 🗑️ Secure Action: Rollback/Delete Specific Installment Entry
            document.querySelectorAll(".btn-row-del").forEach(btn => {
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    const colId = e.currentTarget.getAttribute("data-colid");
                    const amt = Number(e.currentTarget.getAttribute("data-amount"));
                    
                    const adminPassword = prompt("🔐 Security Access Gate: Enter Admin Password to delete this log:");
                    if (adminPassword === "GDA@2026") {
                        if (confirm(`⚠️ Warning! Are you sure you want to delete this recorded payment of ₹${amt}? Ledger will be updated.`)) {
                            try {
                                await deleteDoc(doc(db, "collections", colId));
                                const updatedCollected = totalCollected - amt;
                                const newRemaining = totalWithInterest - updatedCollected;
                                const newPaidDays = paidDaysCount - 1;

                                await updateDoc(doc(db, "customers", custId), {
                                    remainingAmount: newRemaining,
                                    totalCollected: updatedCollected,
                                    paidDays: newPaidDays >= 0 ? newPaidDays : 0
                                });

                                alert("🗑️ Transaction logs deleted and customer profile updated successfully!");
                                loadFullStatement();
                            } catch (err) {
                                alert("⚠️ System Error during deletion process.");
                            }
                        }
                    } else if (adminPassword !== null) {
                        alert("❌ Access Denied! Incorrect administrator credentials.");
                    }
                };
            });

            // 🤝 Settlement Panel Functionality Injection
            const btnPdf = document.getElementById("btnPdf");
            if (btnPdf) {
                let btnSettlement = document.getElementById("btnSettlement");
                if (!btnSettlement && (cust.status || "Active") === "Active") {
                    btnSettlement = document.createElement("button");
                    btnSettlement.id = "btnSettlement";
                    btnSettlement.innerText = "🤝 Close Account (Settlement)";
                    btnSettlement.style = "padding:12px; background:#d32f2f; color:white; border:none; border-radius:10px; font-weight:bold; cursor:pointer; width:100%; margin-top:12px; font-size:14px; transition: 0.2s;";
                    
                    btnPdf.parentNode.appendChild(btnSettlement);
                    
                    btnSettlement.onclick = async () => {
                        const settleAmountStr = prompt(`💰 Net current system liability is ₹${Math.round(finalPayableNow)}.\nEnter Final One-Time Settlement (OTS) Amount:`);
                        if (!settleAmountStr) return;
                        
                        const settleAmount = Number(settleAmountStr);
                        const adminPassword = prompt("🔐 Security Access Gate: Enter Admin Password for Account Settlement:");
                        
                        if (adminPassword === "GDA@2026") {
                            if (confirm(`⚠️ Warning! Are you sure you want to close ${cust.name}'s account permanently by accepting an OTS of ₹${settleAmount}?`)) {
                                try {
                                    const updatedCollected = totalCollected + settleAmount;
                                    await updateDoc(doc(db, "customers", custId), {
                                        status: "Closed",
                                        totalCollected: updatedCollected,
                                        remainingAmount: 0,
                                        settlementNote: `Closed via OTS. Paid ₹${settleAmount} instead of ₹${Math.round(finalPayableNow)}`
                                    });
                                    alert("🎉 Account status changed to CLOSED. Profile settled successfully.");
                                    window.location.href = "customer-list.html";
                                } catch (err) {
                                    alert("⚠️ Settlement execution failed.");
                                }
                            }
                        } else if (adminPassword !== null) {
                            alert("❌ Access Denied! Invalid admin credentials.");
                        }
                    };
                }
            }

            // 📜 ACTION LINK TRIGGER: Open Live Disbursement Bond Paper
            const btnOpenBond = document.getElementById("btnOpenBond");
            if (btnOpenBond) {
                btnOpenBond.onclick = () => {
                    window.open(`disbursement-bond.html?id=${custId}`, '_blank');
                };
            }

            // 🖨️ PDF Printing Action
            if (btnPdf) {
                btnPdf.onclick = () => { window.print(); };
            }

            // 📲 WhatsApp Statement Exporter Module
            const btnWhatsapp = document.getElementById("btnWhatsapp");
            if (btnWhatsapp) {
                btnWhatsapp.onclick = () => {
                    let historyText = "";
                    if (logs.length > 0) {
                        logs.forEach((log, index) => {
                            const displayIndex = logs.length - index;
                            historyText += `\n${displayIndex}. 🗓️ ${log.date} ➡️ ₹${log.amount}`;
                        });
                    } else {
                        historyText = "\nNo payment history available.";
                    }

                    const msg = encodeURIComponent(`🏦 *GDA Finance Services*\n*Account Statement*\n\n👤 *Name:* ${cust.name}\n🆔 *Account ID:* ${cust.customerCode || 'GDA'}\n🗓 *Disbursal Date:* ${cust.loanDate || '-'}\n💵 *Principal Loan:* ₹${baseLoan}\n✅ *Paid Installments:* ${paidDaysCount} Days\n⚠️ *Defaulter Gap Days:* ${gapDays} Days\n💰 *Total Recovered:* ₹${totalCollected}\n🔥 *Accrued Penalty:* ₹${Math.round(penaltyAmount)}\n🔻 *Net Outstanding Due:* ₹${Math.round(finalPayableNow)}\n\n📊 *EMI Logs History:*${historyText}`);
                    window.open(`https://api.whatsapp.com/send?phone=91${cust.mobile}&text=${msg}`);
                };
            }

        } catch (err) {
            console.error("Statement Load Error: ", err);
            if (document.getElementById("historyRows")) {
                document.getElementById("historyRows").innerHTML = "<tr><td colspan='4'>Ledger synchronization failed! Please check cloud network logs.</td></tr>";
            }
        }
    }

    loadFullStatement();
});
