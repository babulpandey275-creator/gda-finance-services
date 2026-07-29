// ==========================================================
// 🚀 GDA FINANCE - DASHBOARD FINAL - PENDING DUE LIST FIX
// ==========================================================
import { db, auth } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

export async function loadDashboard() {
    const txtTodayCollected = document.getElementById("txtTodayCollected");
    const txtTodayMissed = document.getElementById("txtTodayMissed");
    const txtActiveAccounts = document.getElementById("txtActiveAccounts");
    const txtTodayDemand = document.getElementById("txtTodayDemand");
    const lblDueCount = document.getElementById("lblDueCount");
    const txtCollectedSub = document.getElementById("txtCollectedSub");
    const progressBar = document.getElementById("progressBar");
    const pendingDueList = document.getElementById("pendingDueList");
    const dueTotalBadge = document.getElementById("dueTotalBadge");
    const greetText = document.getElementById("greetText");

    if(greetText){
        const d=new Date(); let g="Good Morning"; const hr=d.getHours();
        if(hr>=12&&hr<16) g="Good Afternoon"; else if(hr>=16) g="Good Evening";
        greetText.innerText=`${g}, Babul • ${d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})} • Garhwa`;
    }

    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    try {
        const [collectSnap, custSnap] = await Promise.all([
            getDocs(collection(db, "collections")),
            getDocs(collection(db, "customers"))
        ]);

        let todayCollected = 0;
        const paidTodayIds = new Set();

        collectSnap.forEach(doc=>{
            const data=doc.data();
            // Aapke DB me date ya collectionDate dono ho sakta hai
            const rawDate = (data.date || data.collectionDate || data.createdAt || "");
            const cDate = rawDate.split('T')[0].split(' ')[0];
            if(cDate === todayIST){
                todayCollected += Number(data.amount || data.collectionAmount || 0);
                if(data.customerId) paidTodayIds.add(data.customerId);
            }
        });

        let active=0, totalDemand=0;
        let dueCustomers=[];

        custSnap.forEach(doc=>{
            const cust=doc.data();
            const emi=Number(cust.dailyEmi || cust.emi || 0);
            // Active account ka rule
            if(cust.status!=="Closed" && cust.status!=="Settled" && emi>0){
                active++; totalDemand+=emi;
                // Aaj jisne pay nahi kiya
                if(!paidTodayIds.has(doc.id)){
                    dueCustomers.push({
                        id: doc.id,
                        name: cust.name || "No Name",
                        code: cust.customerCode || "GDA",
                        mobile: cust.mobile || "",
                        emi: emi
                    });
                }
            }
        });

        const overdue = Math.max(0, totalDemand - todayCollected);
        const percent = totalDemand>0? Math.round((todayCollected/totalDemand)*100) : 0;

        if(txtTodayCollected) txtTodayCollected.innerText=`₹${todayCollected.toLocaleString('en-IN')} / ₹${totalDemand.toLocaleString('en-IN')}`;
        if(txtTodayDemand) txtTodayDemand.innerText=`₹${totalDemand.toLocaleString('en-IN')}`;
        if(txtTodayMissed) txtTodayMissed.innerText=`₹${overdue.toLocaleString('en-IN')}`;
        if(txtActiveAccounts) txtActiveAccounts.innerText=active;
        if(lblDueCount) lblDueCount.innerText=dueCustomers.length;
        if(txtCollectedSub) txtCollectedSub.innerText=`${percent}% Completed`;
        if(progressBar) progressBar.style.width=`${percent}%`;
        if(dueTotalBadge) dueTotalBadge.innerText=`₹${overdue.toLocaleString('en-IN')}`;

        // ===== PENDING DUE LIST - DIRECT DASHBOARD PE =====
        if(pendingDueList){
            if(dueCustomers.length===0){
                pendingDueList.innerHTML=`<div style="text-align:center;padding:24px;"><p style="color:#10B981;font-weight:800;font-size:13px;">✅ Aaj sabka collection ho gaya!</p></div>`;
            }else{
                pendingDueList.innerHTML = dueCustomers.map(c=>`
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #F8FAFF;">
                    <div style="flex:1;min-width:0;">
                      <h4 style="font-size:13px;font-weight:800;color:#0F172A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.name} <small style="color:#64748B;font-weight:600;">(${c.code})</small></h4>
                      <p style="font-size:11px;color:#64748B;margin-top:2px;">📱 ${c.mobile} | EMI: ₹${c.emi}</p>
                    </div>
                    <div style="text-align:right;margin-left:10px;">
                      <b style="font-size:13px;color:#DC2626;display:block;">₹${c.emi.toLocaleString('en-IN')}</b>
                      <a href="collection.html?id=${c.id}" style="font-size:10px;background:#0F172A;color:#fff;padding:5px 10px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:4px;display:inline-block;">Collect</a>
                    </div>
                  </div>
                `).join('');
            }
        }

    } catch(err){
        console.error("Dashboard Error:", err);
        if(pendingDueList) pendingDueList.innerHTML=`<p style="text-align:center;padding:20px;color:#DC2626;font-size:12px;">❌ Error: ${err.message}</p>`;
    }
}

onAuthStateChanged(auth, (user)=>{ if(!user) location.href="login.html"; else loadDashboard(); });

document.getElementById("logoutBtn")?.addEventListener('click', async(e)=>{ e.preventDefault(); await signOut(auth); location.href="login.html"; });
