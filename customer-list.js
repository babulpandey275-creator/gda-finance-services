import { db } from "./firebase.js"; 
import { collection, getDocs, doc, deleteDoc, writeBatch, query, where } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => { 
    const listContainer = document.getElementById("listContainer"); 
    const searchInp = document.getElementById("searchInp"); 
    const tabActive = document.getElementById("tabActive"); 
    const tabClosed = document.getElementById("tabClosed"); 
    let allCustomers = []; 
    let currentFilter = "Active"; 

    // 🇮🇳 भारतीय समय (IST) के अनुसार आज की तारीख (YYYY-MM-DD फॉर्मेट)
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const todayParts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date());
    const yyyy = todayParts.find(p => p.type === 'year').value;
    const mm = todayParts.find(p => p.type === 'month').value;
    const dd = todayParts.find(p => p.type === 'day').value;
    const todayIST = `${yyyy}-${mm}-${dd}`;

    async function fetchCustomers() { 
        try { 
            listContainer.innerHTML = "⏳ लोड हो रहा है..."; 
            allCustomers = []; 
            const querySnapshot = await getDocs(collection(db, "customers")); 
            querySnapshot.forEach((docSnap) => { 
                allCustomers.push({ id: docSnap.id, ...docSnap.data() }); 
            }); 
            renderList(); 
        } catch (err) { 
            listContainer.innerHTML = "⚠️ डेटा लोड करने में समस्या आई।"; 
        } 
    } 

    function renderList() { 
        listContainer.innerHTML = ""; 
        const searchText = searchInp.value.trim().toLowerCase(); 
        const filtered = allCustomers.filter(cust => { 
            const statusMatch = (cust.status || "Active") === currentFilter; 
            const nameMatch = (cust.name || "").toLowerCase().includes(searchText); 
            const phoneMatch = (cust.mobile || "").includes(searchText); 
            return statusMatch && (nameMatch || phoneMatch); 
        }); 

        if (filtered.length === 0) { 
            listContainer.innerHTML = `<p style='text-align:center;color:#64748b;padding:20px;'>कोई ग्राहक नहीं मिला।</p>`; 
            return; 
        } 

        filtered.forEach(cust => { 
            const div = document.createElement("div"); 
            div.className = "cust-card"; 
            div.style.display = "flex"; 
            div.style.flexDirection = "column"; 
            div.style.background = "#fff"; 
            div.style.padding = "14px"; 
            div.style.borderRadius = "12px"; 
            div.style.marginBottom = "14px"; 
            div.style.border = "1px solid #e2e8f0"; 
            div.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)"; 

            const photoUrl = cust.customerPhoto || "https://img.icons8.com/color/96/user-male-circle.png"; 

            // 🧮 लेट फाइन (Penalty) का लाइव गणित
            const loanAmount = Number(cust.loanAmount || 0);
            const totalCollected = Number(cust.totalCollected || 0);
            const totalPayableWithInterest = loanAmount + (loanAmount * 0.20);
            const dynamicRemaining = totalPayableWithInterest - totalCollected;

            let penaltyAmount = 0;
            let gapDays = 0;

            // जुर्माना केवल 'Active' खातों पर लाइव कैलकुलेट होगा
            if ((cust.status || "Active") === "Active" && cust.loanDate && cust.loanDate < todayIST) {
                const date1 = new Date(todayIST);
                const date2 = new Date(cust.loanDate);
                const diffTime = Math.abs(date1 - date2);
                const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                const paidDays = Number(cust.paidDays || 0);
                gapDays = totalDays - paidDays;

                const emi = Number(cust.emi || 0);
                if (gapDays > 60 && gapDays <= 80) {
                    penaltyAmount = (gapDays - 60) * (emi * 0.10);
                } else if (gapDays > 80) {
                    penaltyAmount = (20 * (emi * 0.10)) + ((gapDays - 80) * (emi * 0.15));
                }
            }

            const totalPayableNow = dynamicRemaining + penaltyAmount;

            div.innerHTML = ` 
                <div class="clickable-trigger" data-id="${cust.id}" style="display:flex;align-items:center;gap:14px;cursor:pointer;width:100%;"> 
                    <img src="${photoUrl}" style="width:55px;height:55px;border-radius:50%;object-fit:cover;" onerror="this.src='https://img.icons8.com/color/96/user-male-circle.png'"> 
                    <div style="flex:1;"> 
                        <h4 style="margin:0 0 4px 0;font-size:16px;color:#0f172a;font-weight:600;">${cust.name || "N/A"}</h4> 
                        <p style="margin:0 0 2px 0;font-size:13px;color:#64748b;">📞 ${cust.mobile || "-"}</p> 
                        <p style="margin:0;font-size:12px;color:#64748b;">
                            💵 लोन: ₹${loanAmount} | 
                            <span style="color:#ef4444;font-weight:600;">🔻 कुल देय: ₹${Math.round(totalPayableNow)}</span>
                        </p> 
                        ${penaltyAmount > 0 ? `<p style="margin:4px 0 0 0;font-size:11px;color:#d32f2f;font-weight:500;">⚠️ शामिल लेट फाइन: ₹${Math.round(penaltyAmount)} (${gapDays} दिन बकाया)</p>` : ''}
                    </div> 
                </div> 
                <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;border-top:1px dashed #e2e8f0;padding-top:10px;"> 
                    <a href="collection.html?id=${cust.id}" class="btn-action btn-collect" style="flex:1;min-width:120px;padding:10px 0;background:#0d47a1;color:white;border-radius:8px;font-size:13px;font-weight:bold;text-decoration:none;text-align:center;box-shadow:0 2px 4px rgba(13,71,161,0.2);">💸 Collect EMI</a> 
                    <a href="edit.html?id=${cust.id}" class="btn-action btn-edit" style="padding:10px 12px;background:#ffb703;color:black;border-radius:8px;font-size:13px;font-weight:bold;text-decoration:none;text-align:center;box-shadow:0 2px 4px rgba(255,183,3,0.2);">✏️ Edit</a> 
                    <button class="btn-delete" data-id="${cust.id}" style="padding:10px 12px;background:#ef4444;color:white;border:none;border-radius:8px;font-size:13px;font-weight:bold;cursor:pointer;box-shadow:0 2px 4px rgba(239,68,68,0.2);">🗑️ Del</button> 
                </div> 
            `; 
            listContainer.appendChild(div); 
        }); 

        document.querySelectorAll(".clickable-trigger").forEach(elem => { 
            elem.onclick = (e) => { 
                const id = e.currentTarget.getAttribute("data-id"); 
                window.location.href = `statement.html?id=${id}`; 
            }; 
        }); 

        document.querySelectorAll(".btn-delete").forEach(btn => { 
            btn.onclick = async (e) => { 
                e.stopPropagation(); 
                const id = e.target.getAttribute("data-id"); 
                const adminPassword = prompt("🔐 सुरक्षा锁: ग्राहक का पूरा रिकॉर्ड डिलीट करने के लिए एडमिन पासवर्ड डालें:"); 
                if (adminPassword === "GDA@2026") { 
                    if (confirm("⚠️ क्या आप सच में इस ग्राहक का पूरा डेटा और उसकी पूरी कलेक्शन हिस्ट्री हमेशा के लिए डिलीट करना चाहते हैं?")) { 
                        try { 
                            await deleteDoc(doc(db, "customers", id)); 
                            const collectionsRef = collection(db, "collections"); 
                            const q = query(collectionsRef, where("customerId", "==", id)); 
                            const querySnapshot = await getDocs(q); 
                            const batch = writeBatch(db); 
                            querySnapshot.forEach((docSnap) => { 
                                batch.delete(docSnap.ref); 
                            }); 
                            await batch.commit(); 
                            alert("🗑️ ग्राहक का रिकॉर्ड और उसकी पूरी ईएमआई हिस्ट्री सफ़लतापूर्वक साफ़ कर दी गई है!"); 
                            fetchCustomers(); 
                        } catch (err) { 
                            console.error("डिलीट करने में एरर:", err); 
                            alert("⚠️ रिकॉर्ड डिलीट करने में समस्या आई।"); 
                        } 
                    } 
                } else if (adminPassword !== null) { 
                    alert("❌ गलत पासवर्ड! रिकॉर्ड डिलीट नहीं किया गया।"); 
                } 
            }; 
        }); 
    } 

    if(tabActive){ 
        tabActive.onclick = () => { 
            currentFilter = "Active"; 
            tabActive.className = "tab-btn active"; 
            tabClosed.className = "tab-btn"; 
            renderList(); 
        }; 
    } 
    if(tabClosed){ 
        tabClosed.onclick = () => { 
            currentFilter = "Closed"; 
            tabActive.className = "tab-btn"; 
            tabClosed.className = "tab-btn closed-active"; 
            renderList(); 
        }; 
    } 
    if(searchInp){ 
        searchInp.oninput = () => { 
            renderList(); 
        }; 
    } 

    fetchCustomers(); 
});
