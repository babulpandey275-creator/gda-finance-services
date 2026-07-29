import { db, auth } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

export async function loadDashboard() {
    // Get DOM references
    const txtTodayCollected = document.getElementById("txtTodayCollected");
    const txtTodayMissed = document.getElementById("txtTodayMissed");
    const txtActiveAccounts = document.getElementById("txtActiveAccounts");
    const txtTodayDemand = document.getElementById("txtTodayDemand");
    const lblDueCount = document.getElementById("lblDueCount");
    const txtCollectedSub = document.getElementById("txtCollectedSub");
    const progressBar = document.getElementById("progressBar");
    const pendingDueList = document.getElementById("pendingDueList");
    const dueTotalBadge = document.getElementById("dueTotalBadge");
    const greetDate = document.getElementById("greetDate");
    const clockDisplay = document.getElementById("clockDisplay");

    // Set date and time
    const now = new Date();
    const hrs = now.getHours();
    let greet = "Good Morning";
    if (hrs >= 12 && hrs < 16) greet = "Good Afternoon";
    else if (hrs >= 16) greet = "Good Evening";
    document.querySelector('.sub-header span:first-child').innerHTML = 
        `<i class="material-symbols-outlined" style="font-size:16px; vertical-align:middle;">account_circle</i> Babul • <span id="greetDate">${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>`;
    if (clockDisplay) {
        clockDisplay.innerText = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }

    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    try {
        // Fetch customers and collections in parallel
        const [custSnap, collectSnap] = await Promise.all([
            getDocs(collection(db, "customers")),
            getDocs(collection(db, "collections"))
        ]);

        // ---- 1. Today's Collected ----
        let todayCollected = 0;
        const paidTodayIds = new Set();
        collectSnap.forEach(doc => {
            const data = doc.data();
            const cDate = (data.date || data.collectionDate || "").split('T')[0];
            if (cDate === todayIST) {
                todayCollected += Number(data.amount || data.collectionAmount || 0);
                if (data.customerId) paidTodayIds.add(data.customerId);
            }
        });

        // ---- 2. Process Customers ----
        let active = 0;
        let totalDemand = 0;
        const dueCustomers = []; // जिन्होंने आज नहीं दिया

        custSnap.forEach(doc => {
            const cust = doc.data();
            if (cust.status === "Closed") return;

            const dailyEmi = Number(cust.dailyEmi || cust.emi || 0);
            if (dailyEmi <= 0) return;

            active++;
            totalDemand += dailyEmi;

            // अगर आज EMI नहीं दी, तो Due List में डालें
            if (!paidTodayIds.has(doc.id)) {
                dueCustomers.push({
                    id: doc.id,
                    name: cust.name || "N/A",
                    code: cust.customerCode || "GDA",
                    mobile: cust.mobile || "",
                    emi: dailyEmi
                });
            }
        });

        // ---- 3. Calculate Today's Overdue ----
        const overdueToday = Math.max(0, totalDemand - todayCollected);
        const pendingCount = dueCustomers.length;

        // ---- 4. Update UI ----
        const percent = totalDemand > 0 ? Math.round((todayCollected / totalDemand) * 100) : 0;
        if (txtTodayCollected) txtTodayCollected.innerText = `₹${todayCollected.toLocaleString('en-IN')} / ₹${totalDemand.toLocaleString('en-IN')}`;
        if (txtTodayDemand) txtTodayDemand.innerText = `₹${totalDemand.toLocaleString('en-IN')}`;
        if (txtTodayMissed) txtTodayMissed.innerText = `₹${overdueToday.toLocaleString('en-IN')}`; // ✅ ₹3,400
        if (txtActiveAccounts) txtActiveAccounts.innerText = active;
        if (lblDueCount) lblDueCount.innerText = `Pending: ${pendingCount}`; // ✅ 8
        if (txtCollectedSub) txtCollectedSub.innerText = `${percent}% Completed`;
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (dueTotalBadge) dueTotalBadge.innerText = `₹${overdueToday.toLocaleString('en-IN')}`;

        // ---- 5. Render Daily Collection List ----
        if (pendingDueList) {
            if (dueCustomers.length === 0) {
                pendingDueList.innerHTML = `<div style="text-align:center; padding:20px; color:#10B981; font-weight:800;">✅ Aaj koi bakaya nahi!</div>`;
            } else {
                pendingDueList.innerHTML = dueCustomers.map(c => `
                    <div class="due-item">
                        <div class="info">
                            <h4>${c.name} <small style="color:#64748B;">(${c.code})</small></h4>
                            <small>📱 ${c.mobile} | EMI: ₹${c.emi}</small>
                        </div>
                        <div class="amount">
                            <b>₹${c.emi}</b><br>
                            <a href="collection.html?id=${c.id}">Collect</a>
                        </div>
                    </div>
                `).join('');
            }
        }

    } catch (err) {
        console.error("Dashboard load error:", err);
        if (pendingDueList) pendingDueList.innerHTML = `<p style="text-align:center;padding:20px;color:#DC2626;">Error: ${err.message}</p>`;
    }
}

// ---- Auth ----
onAuthStateChanged(auth, user => {
    if (!user) {
        location.href = "login.html";
    } else {
        loadDashboard();
        setInterval(loadDashboard, 60000);
    }
});

// ---- Logout ----
document.getElementById("logoutBtn")?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (confirm("Logout karna hai?")) {
        await signOut(auth);
        location.href = "login.html";
    }
});
