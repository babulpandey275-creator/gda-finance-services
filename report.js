import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    
    // --- 🔐 एडमिन पासवर्ड लॉक सिस्टम ---
    const ADMIN_PIN = "8271"; // बाबू भाई, यहाँ आप अपना मनपसंद पासवर्ड बदल सकते हैं
    const lockScreen = document.getElementById("lockScreen");
    const pinInput = document.getElementById("pinInput");
    const btnUnlock = document.getElementById("btnUnlock");
    const errorMsg = document.getElementById("errorMsg");

    if (btnUnlock && pinInput && lockScreen) {
        btnUnlock.onclick = () => {
            if (pinInput.value === ADMIN_PIN) {
                lockScreen.style.display = "none"; // सही पासवर्ड होने पर लॉक स्क्रीन हट जाएगी
                errorMsg.style.display = "none";
            } else {
                errorMsg.style.display = "block"; // गलत पासवर्ड पर एरर दिखेगा
                pinInput.value = "";
                pinInput.focus();
            }
        };

        // Enter की (Key) दबाने पर भी अनलॉक हो जाए
        pinInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                btnUnlock.click();
            }
        });
    }

    // --- 📊 बाकी एलिमेंट्स ---
    const btnDaily = document.getElementById("btnDaily");
    const btnMonthly = document.getElementById("btnMonthly");
    const btnQuarterly = document.getElementById("btnQuarterly");
    const btnYearly = document.getElementById("btnYearly");
    const dateFilterBox = document.getElementById("dateFilterBox");
    const inpReportDate = document.getElementById("inpReportDate");
    const reportTitle = document.getElementById("reportTitle");
    
    const txtDisbursement = document.getElementById("txtDisbursement");
    const txtCollection = document.getElementById("txtCollection");
    const txtExpenses = document.getElementById("txtExpenses");
    const txtNewCustomers = document.getElementById("txtNewCustomers");
    
    // नए अपग्रेड एलिमेंट्स
    const txtInterestEarned = document.getElementById("txtInterestEarned");
    const txtNetProfit = document.getElementById("txtNetProfit");
    const txtTotalPortfolio = document.getElementById("txtTotalPortfolio");

    let allCustomers = []; 
    let allCollections = []; 
    let allExpenses = []; 

    // 🇮🇳 शुद्ध भारतीय समय (IST)
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }; 
    let todayIST = new Date().toISOString().split('T')[0]; 

    try { 
        const todayParts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date()); 
        const yyyy = todayParts.find(p => p.type === 'year').value; 
        const mm = todayParts.find(p => p.type === 'month').value; 
        const dd = todayParts.find(p => p.type === 'day').value; 
        todayIST = `${yyyy}-${mm}-${dd}`; 
    } catch(e) { 
        console.error(e); 
    } 

    if (inpReportDate) inpReportDate.value = todayIST; 

    // 📥 डेटाबेस से डेटा लोड करना
    try { 
        const custSnap = await getDocs(collection(db, "customers")); 
        custSnap.forEach(doc => allCustomers.push(doc.data())); 
        
        const collectSnap = await getDocs(collection(db, "collections")); 
        collectSnap.forEach(doc => allCollections.push(doc.data())); 
        
        const expSnap = await getDocs(collection(db, "expenses")); 
        expSnap.forEach(doc => allExpenses.push(doc.data())); 
    } catch (err) { 
        console.error("Error loading report data:", err); 
    } 

    function cleanDateToYYYYMMDD(dateVal) { 
        if (!dateVal) return ""; 
        let dObj = null; 
        if (dateVal.toDate) { 
            dObj = dateVal.toDate(); 
        } else if (dateVal.seconds) { 
            dObj = new Date(dateVal.seconds * 1000); 
        } else { 
            const cleanStr = String(dateVal).replace(/\//g, '-').trim(); 
            if (cleanStr.includes('-') && cleanStr.split('-')[0].length === 4) { 
                return cleanStr.split(' ')[0]; 
            } 
            dObj = new Date(cleanStr); 
        } 
        if (dObj && !isNaN(dObj.getTime())) { 
            try { 
                const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(dObj); 
                const y = parts.find(p => p.type === 'year').value; 
                const m = parts.find(p => p.type === 'month').value; 
                const d = parts.find(p => p.type === 'day').value; 
                return `${y}-${m}-${d}`; 
            } catch(e) { 
                return dObj.toISOString().split('T')[0]; 
            } 
        } 
        return ""; 
    } 

    // 🧮 रिपोर्ट और ब्याज समेत कुल पोर्टफोलियो कैलकुलेशन
    function calculateReport(type) { 
        let currentMonth = new Date().getMonth(); 
        let currentYear = new Date().getFullYear(); 
        
        try { 
            const nowObj = new Date(); 
            const nowParts = new Intl.DateTimeFormat('en-US', options).formatToParts(nowObj); 
            currentMonth = parseInt(nowParts.find(p => p.type === 'month').value) - 1; 
            currentYear = parseInt(nowParts.find(p => p.type === 'year').value); 
        } catch(e) {} 

        const targetDailyDate = inpReportDate ? inpReportDate.value : todayIST; 
        
        let totalDisbursed = 0; 
        let totalCollected = 0; 
        let totalExp = 0; 
        let newCustCount = 0; 

        // 1. वितरित लोन और कस्टमर काउंट
        allCustomers.forEach(cust => { 
            if (!cust.loanDate) return; 
            const custDateStr = cleanDateToYYYYMMDD(cust.loanDate); 
            if (!custDateStr) return; 
            
            let match = false; 
            if (type === "daily") { 
                if (custDateStr === targetDailyDate) match = true; 
            } else { 
                const parts = custDateStr.split('-'); 
                const cYear = parseInt(parts[0]); 
                const cMonth = parseInt(parts[1]) - 1; 
                
                if (type === "monthly") { 
                    if (cMonth === currentMonth && cYear === currentYear) match = true; 
                } else if (type === "quarterly") { 
                    const currentQuarter = Math.floor(currentMonth / 3); 
                    const custQuarter = Math.floor(cMonth / 3); 
                    if (currentQuarter === custQuarter && cYear === currentYear) match = true; 
                } else if (type === "yearly") { 
                    if (cYear === currentYear) match = true; 
                } 
            } 
            if (match) { 
                totalDisbursed += (Number(cust.loanAmount) || 0); 
                newCustCount++; 
            } 
        }); 

        // 2. कलेक्शन कैलकुलेशन
        allCollections.forEach(col => { 
            const colDateStr = cleanDateToYYYYMMDD(col.date || col.createdAt); 
            if (!colDateStr) return; 
            
            let match = false; 
            if (type === "daily") { 
                if (colDateStr === targetDailyDate) match = true; 
            } else { 
                const parts = colDateStr.split('-'); 
                const cYear = parseInt(parts[0]); 
                const cMonth = parseInt(parts[1]) - 1; 
                
                if (type === "monthly") { 
                    if (cMonth === currentMonth && cYear === currentYear) match = true; 
                } else if (type === "quarterly") { 
                    const currentQuarter = Math.floor(currentMonth / 3); 
                    const colQuarter = Math.floor(cMonth / 3); 
                    if (currentQuarter === colQuarter && cYear === currentYear) match = true; 
                } else if (type === "yearly") { 
                    if (cYear === currentYear) match = true; 
                } 
            } 
            if (match) { 
                totalCollected += (Number(col.amount) || 0); 
            } 
        }); 

        // 3. खर्चे कैलकुलेशन
        allExpenses.forEach(exp => { 
            if (!exp.date) return; 
            const expDateStr = cleanDateToYYYYMMDD(exp.date); 
            if (!expDateStr) return; 
            
            let match = false; 
            if (type === "daily") { 
                if (expDateStr === targetDailyDate) match = true; 
            } else { 
                const parts = expDateStr.split('-'); 
                const cYear = parseInt(parts[0]); 
                const cMonth = parseInt(parts[1]) - 1; 
                
                if (type === "monthly") { 
                    if (cMonth === currentMonth && cYear === currentYear) match = true; 
                } else if (type === "quarterly") { 
                    const currentQuarter = Math.floor(currentMonth / 3); 
                    const expQuarter = Math.floor(cMonth / 3); 
                    if (currentQuarter === expQuarter && cYear === currentYear) match = true; 
                } else if (type === "yearly") { 
                    if (cYear === currentYear) match = true; 
                } 
            } 
            if (match) { 
                totalExp += (Number(exp.amount) || 0); 
            } 
        }); 

        // 📊 शुद्ध मुनाफा और ब्याज की गणना
        const interestEarned = Math.round(totalCollected / 6); 
        const netProfit = interestEarned - totalExp; 

        // 💰 लाइफटाइम या ओवरऑल एक्टिव पोर्टफोलियो (मूलधन + कुल ब्याज)
        let overallActivePrincipal = 0;
        allCustomers.forEach(c => {
            overallActivePrincipal += (Number(c.loanAmount) || 0);
        });
        
        let overallTotalInterest = 0;
        allCollections.forEach(col => {
            overallTotalInterest += (Number(col.amount) || 0);
        });
        let overallInterestPart = Math.round(overallTotalInterest / 6);

        // कुल पोर्टफोलियो = कुल मार्केट लोन वैल्यू + ब्याज की कमाई
        const totalPortfolioValue = overallActivePrincipal + overallInterestPart;

        // UI पर डेटा दिखाना
        if (txtDisbursement) txtDisbursement.textContent = `₹${totalDisbursed}`; 
        if (txtCollection) txtCollection.textContent = `₹${totalCollected}`; 
        if (txtExpenses) txtExpenses.textContent = `₹${totalExp}`; 
        if (txtNewCustomers) txtNewCustomers.textContent = newCustCount; 
        if (txtInterestEarned) txtInterestEarned.textContent = `₹${interestEarned}`; 
        if (txtTotalPortfolio) txtTotalPortfolio.textContent = `₹${totalPortfolioValue}`;

        if (txtNetProfit) { 
            txtNetProfit.textContent = `₹${netProfit}`; 
            txtNetProfit.style.color = netProfit >= 0 ? "#22c55e" : "#ef4444"; 
        } 
    } 

    // बटन क्लिक इवेंट्स
    if (btnDaily) { 
        btnDaily.onclick = () => { 
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active")); 
            btnDaily.classList.add("active"); 
            if (dateFilterBox) dateFilterBox.style.display = "block"; 
            if (reportTitle) reportTitle.textContent = "तारीख के अनुसार दैनिक लाइव रिपोर्ट"; 
            calculateReport("daily"); 
        }; 
    } 
    if (btnMonthly) { 
        btnMonthly.onclick = () => { 
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active")); 
            btnMonthly.classList.add("active"); 
            if (dateFilterBox) dateFilterBox.style.display = "none"; 
            if (reportTitle) reportTitle.textContent = "इस महीने की लाइव रिपोर्ट (Current Month)"; 
            calculateReport("monthly"); 
        }; 
    } 
    if (btnQuarterly) { 
        btnQuarterly.onclick = () => { 
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active")); 
            btnQuarterly.classList.add("active"); 
            if (dateFilterBox) dateFilterBox.style.display = "none"; 
            if (reportTitle) reportTitle.textContent = "इस तिमाही की लाइव रिपोर्ट (Current Quarter)"; 
            calculateReport("quarterly"); 
        }; 
    } 
    if (btnYearly) { 
        btnYearly.onclick = () => { 
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active")); 
            btnYearly.classList.add("active"); 
            if (dateFilterBox) dateFilterBox.style.display = "none"; 
            if (reportTitle) reportTitle.textContent = "इस साल की लाइव रिपोर्ट (Current Year)"; 
            calculateReport("yearly"); 
        }; 
    } 

    if (inpReportDate) { 
        inpReportDate.onchange = () => { 
            calculateReport("daily"); 
        }; 
    } 

    // डिफ़ॉल्ट रूप से डेली रिपोर्ट लोड करें
    if (btnDaily) { 
        btnDaily.click(); 
    } else { 
        calculateReport("monthly"); 
    } 
});
