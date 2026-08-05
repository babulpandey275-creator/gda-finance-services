// ==========================================================
// 🚀 GDA FINANCE - BUSINESS ADVISOR (RISK ANALYSIS ENGINE)
// हर ग्राहक की payment history के आधार पर risk score निकालता है
// और Hindi में advice + description देता है।
// ==========================================================

import { db, auth } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const riskList = document.getElementById("riskList");
const growthTips = document.getElementById("growthTips");
const statSafe = document.getElementById("statSafe");
const statWatch = document.getElementById("statWatch");
const statRisky = document.getElementById("statRisky");

let allAnalyzed = [];
let currentFilter = "all";

const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

// ==========================================================
// 1️⃣ एक ग्राहक का RISK SCORE + Hindi Description निकालना
// ==========================================================
function analyzeCustomer(id, cust, collections) {
    const custCollections = collections.filter(c => c.customerId === id);

    const dailyEmi = Number(cust.dailyEmi || cust.emi || 0);
    const loanAmount = Number(cust.loanAmount || 0);
    const totalCollected = Number(cust.totalCollected || 0);
    const planDuration = Number(cust.planDuration || cust.duration || 60);

    const loanDate = cust.loanDate ? new Date(cust.loanDate) : new Date();
    const today = new Date();
    let daysElapsed = Math.floor((today - loanDate) / (1000 * 60 * 60 * 24)) + 1;
    if (daysElapsed < 1) daysElapsed = 1;
    const cappedDays = Math.min(daysElapsed, planDuration);

    const expectedTillNow = cappedDays * dailyEmi;
    const overdue = Math.max(0, expectedTillNow - totalCollected);
    const collectionRatio = expectedTillNow > 0 ? Math.min(1, totalCollected / expectedTillNow) : 1;

    // पिछले 10 दिनों में कितनी EMI मिस हुई (सिर्फ loan शुरू होने के बाद वाले दिन गिने)
    const paidDates = new Set(custCollections.map(c => c.date || c.collectionDate));
    let recentWindow = 0, recentMissed = 0;
    for (let i = 0; i < 10; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        if (d < loanDate) continue;
        recentWindow++;
        const dStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        if (!paidDates.has(dStr)) recentMissed++;
    }
    const recentMissRatio = recentWindow > 0 ? recentMissed / recentWindow : 0;
    const overdueVsLoan = loanAmount > 0 ? overdue / loanAmount : 0;

    // ---- Score (0-100, jitna zyada utna safe) ----
    let score = 100;
    score -= (1 - collectionRatio) * 50;
    score -= recentMissRatio * 35;
    score -= Math.min(overdueVsLoan, 1) * 15;
    score = Math.max(0, Math.min(100, Math.round(score)));

    const isClosed = (cust.status === "Closed" || cust.status === "Settled");

    let level, badgeClass, barColor, label;
    if (isClosed) {
        level = "closed"; badgeClass = "badge-green"; barColor = "#10B981"; label = "🤝 भरोसेमंद";
    } else if (score >= 80) {
        level = "safe"; badgeClass = "badge-green"; barColor = "#10B981"; label = "✅ सुरक्षित";
    } else if (score >= 60) {
        level = "watch"; badgeClass = "badge-yellow"; barColor = "#F59E0B"; label = "👀 निगरानी में";
    } else if (score >= 35) {
        level = "risky"; badgeClass = "badge-orange"; barColor = "#EA580C"; label = "⚠️ जोखिम भरा";
    } else {
        level = "risky"; badgeClass = "badge-red"; barColor = "#DC2626"; label = "🚫 लोन ना दें";
    }

    // ---- Hindi Description Generate karna ----
    let desc;
    if (isClosed) {
        desc = `${cust.name} ने अपना पूरा लोन चुका दिया है और भुगतान का रिकॉर्ड अच्छा रहा है। यह ग्राहक भरोसेमंद है — भविष्य में दोबारा लोन देने पर विचार किया जा सकता है।`;
    } else {
        desc = `${cust.name} ने अब तक ₹${totalCollected.toLocaleString('en-IN')} जमा किए हैं, जबकि अब तक करीब ₹${expectedTillNow.toLocaleString('en-IN')} जमा हो जाने चाहिए थे। `;
        if (overdue > 0) {
            desc += `इस समय ₹${overdue.toLocaleString('en-IN')} बकाया है। `;
        } else {
            desc += `फिलहाल कोई बकाया नहीं है। `;
        }
        if (recentWindow > 0) {
            if (recentMissed > 0) {
                desc += `पिछले ${recentWindow} दिनों में इस ग्राहक ने ${recentMissed} दिन EMI मिस की है। `;
            } else {
                desc += `पिछले ${recentWindow} दिनों में इसने कोई भी EMI मिस नहीं की, भुगतान नियमित है। `;
            }
        }
        if (level === "risky" && score < 35) {
            desc += `सलाह: इस ग्राहक को अभी नया या अतिरिक्त लोन देना जोखिम भरा हो सकता है — पहले पुराना बकाया वसूल करें।`;
        } else if (level === "risky") {
            desc += `सलाह: सावधानी बरतें, नया लोन देने से पहले पुराना हिसाब पूरा करवाएं।`;
        } else if (level === "watch") {
            desc += `सलाह: भुगतान पर नज़र बनाए रखें, अभी बड़ी समस्या नहीं है।`;
        } else {
            desc += `सलाह: यह ग्राहक समय पर भुगतान कर रहा है, भरोसा किया जा सकता है।`;
        }
    }

    return {
        id, name: cust.name || "N/A", code: cust.customerCode || "GDA",
        mobile: cust.mobile || "", score, level, badgeClass, barColor, label, desc, overdue
    };
}

// ==========================================================
// 2️⃣ ऊपर वाला GROWTH ADVICE बनाना (पूरे बिज़नेस के आधार पर)
// ==========================================================
function renderGrowthTips(activeList) {
    if (activeList.length === 0) {
        growthTips.innerHTML = `<div class="tip">अभी कोई एक्टिव ग्राहक नहीं है — नए ग्राहक जोड़ें और business grow करें।</div>`;
        return;
    }

    const totalOverdue = activeList.reduce((s, c) => s + c.overdue, 0);
    const riskyCount = activeList.filter(c => c.level === "risky").length;
    const watchCount = activeList.filter(c => c.level === "watch").length;
    const safeCount = activeList.filter(c => c.level === "safe").length;
    const riskyPct = Math.round((riskyCount / activeList.length) * 100);

    const tips = [];

    if (riskyPct >= 30) {
        tips.push(`⚠️ आपके ${riskyPct}% ग्राहक जोखिम भरे हैं। नए ग्राहकों को लोन देने से पहले गारंटर और पहचान पत्र की जांच सख्त करें।`);
    } else if (riskyPct > 0) {
        tips.push(`आपके ${riskyCount} ग्राहक जोखिम में हैं (${riskyPct}%) — इन पर पहले वसूली का फोकस रखें, नए लोन इन्हें ना दें।`);
    } else {
        tips.push(`✅ फिलहाल कोई भी ग्राहक हाई-रिस्क में नहीं है — यह अच्छा संकेत है, इसी तरह भुगतान पर नज़र बनाए रखें।`);
    }

    if (totalOverdue > 0) {
        tips.push(`कुल ₹${totalOverdue.toLocaleString('en-IN')} बकाया है। पहले पुरानी वसूली पूरी करें, इससे नए लोन देने के लिए पूंजी (capital) भी बढ़ेगी।`);
    }

    if (safeCount > 0) {
        tips.push(`आपके ${safeCount} ग्राहक भुगतान में एकदम नियमित हैं — इन्हें प्राथमिकता के साथ ज़्यादा लोन राशि या नया लोन दिया जा सकता है, इससे business grow होगा।`);
    }

    if (watchCount > 0) {
        tips.push(`${watchCount} ग्राहकों पर नज़र रखें — समय रहते इन्हें रिमाइंडर कॉल करने से यह "जोखिम भरा" श्रेणी में जाने से बच सकते हैं।`);
    }

    growthTips.innerHTML = tips.map(t => `<div class="tip">${t}</div>`).join('');
}

// ==========================================================
// 3️⃣ LIST RENDER करना (फ़िल्टर के अनुसार)
// ==========================================================
function renderList() {
    let filtered = allAnalyzed;
    if (currentFilter === "risky") filtered = allAnalyzed.filter(c => c.level === "risky");
    else if (currentFilter === "watch") filtered = allAnalyzed.filter(c => c.level === "watch");
    else if (currentFilter === "safe") filtered = allAnalyzed.filter(c => c.level === "safe");
    else if (currentFilter === "closed") filtered = allAnalyzed.filter(c => c.level === "closed");

    if (filtered.length === 0) {
        riskList.innerHTML = `<div class="empty-state">इस श्रेणी में कोई ग्राहक नहीं मिला।</div>`;
        return;
    }

    riskList.innerHTML = filtered.map(c => `
        <div class="risk-card">
            <div class="risk-top">
                <div>
                    <h3>${c.name} <small style="color:#64748B;">(${c.code})</small></h3>
                    <small>📱 ${c.mobile || 'N/A'}</small>
                </div>
                <span class="risk-badge ${c.badgeClass}">${c.label}</span>
            </div>
            <div class="score-bar"><div class="fill" style="width:${c.score}%; background:${c.barColor};"></div></div>
            <div class="risk-desc">${c.desc}</div>
            <div class="risk-bottom">
                <a href="tel:${c.mobile}" class="btn-sm btn-call">📞 Call</a>
                <a href="statement.html?id=${c.id}" class="btn-sm btn-view">👁️ Profile Dekhein</a>
            </div>
        </div>
    `).join('');
}

// ==========================================================
// 4️⃣ मुख्य लोड फंक्शन
// ==========================================================
async function loadAdvisor() {
    riskList.innerHTML = `<div class="loading-text">⏳ ग्राहकों का डेटा एनालाइज़ हो रहा है...</div>`;
    try {
        const [custSnap, colSnap] = await Promise.all([
            getDocs(collection(db, "customers")),
            getDocs(collection(db, "collections"))
        ]);
        const collections = colSnap.docs.map(d => d.data());

        allAnalyzed = custSnap.docs.map(d => analyzeCustomer(d.id, d.data(), collections));

        const activeList = allAnalyzed.filter(c => c.level !== "closed");
        statSafe.innerText = activeList.filter(c => c.level === "safe").length;
        statWatch.innerText = activeList.filter(c => c.level === "watch").length;
        statRisky.innerText = activeList.filter(c => c.level === "risky").length;

        // सबसे risky ग्राहक सबसे ऊपर दिखेंगे
        allAnalyzed.sort((a, b) => a.score - b.score);

        renderGrowthTips(activeList);
        renderList();
    } catch (err) {
        console.error("Advisor load error:", err);
        riskList.innerHTML = `<div class="empty-state">❌ डेटा लोड करने में गलती: ${err.message}</div>`;
        growthTips.innerHTML = `<div class="tip">❌ Advice लोड नहीं हो पाई।</div>`;
    }
}

// ==========================================================
// 5️⃣ FILTER TAB EVENTS
// ==========================================================
document.querySelectorAll(".filter-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        currentFilter = tab.dataset.filter;
        renderList();
    });
});

// ==========================================================
// 6️⃣ AUTH CHECK
// ==========================================================
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        loadAdvisor();
    }
});
