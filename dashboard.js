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
        const renewalCandidates = []; // 🔥 जिनका Plan अगले 7 दिन में खत्म होने वाला है

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

            // ---- 🔥 Renewal Due Soon Check (Settled को छोड़कर) ----
            if (cust.status !== 'Settled') {
                const planDur = Number(cust.planDuration || cust.duration || 60);
                const loanDate = new Date(cust.loanDate || cust.startDate || todayIST);
                const today = new Date();
                const daysElapsed = Math.max(0, Math.floor((today - loanDate) / (1000 * 60 * 60 * 24))) + 1;
                const daysLeft = planDur - daysElapsed;

                if (daysLeft >= 0 && daysLeft <= 7) {
                    const loanAmount = Number(cust.loanAmount || 0);
                    const totalPaid = Number(cust.totalCollected || 0);
                    const expectedTotal = Math.max(loanAmount * 1.2, planDur * dailyEmi);
                    const remaining = Math.max(0, expectedTotal - totalPaid);
                    const fullyPaid = remaining <= 0;

                    renewalCandidates.push({
                        id: doc.id,
                        name: cust.name || "N/A",
                        code: cust.customerCode || "GDA",
                        mobile: cust.mobile || "",
                        daysLeft,
                        fullyPaid,
                        remaining,
                        emi: dailyEmi
                    });
                }
            }
        });

        // सबसे जल्दी खत्म होने वाला सबसे ऊपर
        renewalCandidates.sort((a, b) => a.daysLeft - b.daysLeft);

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

        // ---- 6. Render Loan Renewal Due Soon ----
        const renewalSection = document.getElementById("renewalSection");
        const renewalList = document.getElementById("renewalList");
        const renewalCountBadge = document.getElementById("renewalCountBadge");
        if (renewalSection && renewalList) {
            if (renewalCandidates.length === 0) {
                renewalSection.style.display = "none";
            } else {
                renewalSection.style.display = "block";
                if (renewalCountBadge) renewalCountBadge.innerText = renewalCandidates.length;
                renewalList.innerHTML = renewalCandidates.map(c => {
                    const dayLabel = c.daysLeft === 0 ? "आज खत्म" : `${c.daysLeft} din baaki`;
                    if (c.fullyPaid) {
                        return `
                        <div class="renewal-item">
                            <div class="r-info">
                                <h4>${c.name} <small style="color:#64748B;">(${c.code})</small></h4>
                                <small>${dayLabel}</small>
                                <span class="renewal-badge ready">✅ Poora Paid — Renew Ready</span>
                            </div>
                            <div class="r-action">
                                <a class="act-renew" href="statement.html?id=${c.id}">Renew</a>
                            </div>
                        </div>`;
                    } else {
                        const msg = encodeURIComponent(
                            `Namaste ${c.name} ji,\n\nAapke GDA Finance Services loan ka plan ${dayLabel === "आज खत्म" ? "aaj khatam ho raha hai" : `sirf ${c.daysLeft} din mein khatam ho raha hai`}.\nAbhi ₹${c.remaining.toLocaleString('en-IN')} baki hai.\n\nKripya jald se jald payment poora kar dein.\n\nDhanyawad,\nGDA Finance Services`
                        );
                        const waLink = c.mobile ? `https://wa.me/91${c.mobile}?text=${msg}` : "#";
                        return `
                        <div class="renewal-item">
                            <div class="r-info">
                                <h4>${c.name} <small style="color:#64748B;">(${c.code})</small></h4>
                                <small>${dayLabel} · ⚠️ ₹${c.remaining.toLocaleString('en-IN')} baki</small>
                                <span class="renewal-badge pending">⚠️ Payment Baki</span>
                            </div>
                            <div class="r-action">
                                <a class="act-remind" href="${waLink}" target="_blank">💬 Remind</a>
                            </div>
                        </div>`;
                    }
                }).join('');
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
