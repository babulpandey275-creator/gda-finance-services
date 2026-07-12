import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => { 
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
    const txtNewCustomers = document.getElementById("txtNewAccounts"); 
    const txtTotalPortfolio = document.getElementById("txtTotalPortfolio");
    const txtInterestEarned = document.getElementById("txtInterestEarned"); 
    const txtNetProfit = document.getElementById("txtNetProfit"); 
    const txtTotalDue = document.getElementById("txtTotalDue"); 

    let allCustomers = []; 
    let allCollections = []; 
    let allExpenses = []; 

    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    let todayIST = new Date().toISOString().split('T')[0];
    try {
        const todayParts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date());
        const yyyy = todayParts.find(p => p.type === 'year').value;
        const mm = todayParts.find(p => p.type === 'month').value;
        const dd = todayParts.find(p => p.type === 'day').value;
        todayIST = `${yyyy}-${mm}-${dd}`; 
    } catch(e) {}

    if (inpReportDate) inpReportDate.value = todayIST; 

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
                let yVal = dObj.getFullYear();
                let mVal = String(dObj.getMonth() + 1).padStart(2, '0');
                let dVal = String(dObj.getDate()).padStart(2, '0');
                return `${yVal}-${mVal}-${dVal}`;
            } catch(e) {
                return dObj.toISOString().split('T')[0];
            }
        }
        return "";
    }

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
        let runningMarketDue = 0; 

        // 1. Loans / Customers Calculation
        allCustomers.forEach(cust => { 
            const dStr = cust.loanDate || cust.date || cust.createdAt;
            if (!dStr) return; 
            const custDateStr = cleanDateToYYYYMMDD(dStr);
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
                totalDisbursed += (Number(cust.loanAmount) || Number(cust.amount) || 0); 
                newCustCount++; 
                
                // ⚡ यहाँ बदलाव: अगर डैशबोर्ड पर कस्टमर का ओवरड्यू/ड्यू अमाउंट सेव है, तो केवल वही रुका हुआ पैसा जुड़ेगा
                // यह आपके फ़ील्ड के नाम के हिसाब से cust.dueAmount, cust.overdueAmount या cust.due को जोड़ेगा
                const customerSpecificDue = Number(cust.dueAmount) || Number(cust.overdueAmount) || Number(cust.due) || 0;
                runningMarketDue += customerSpecificDue;
            } 
        }); 

        // 2. Collections
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
                totalCollected += (Number(col.amount) || Number(col.collectedAmount) || 0); 
            } 
        }); 

        // 3. Expenses
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

        const interestEarned = Math.round(totalCollected / 6);
        const netProfit = interestEarned - totalExp;
        const totalPortfolio = totalDisbursed + totalCollected;

        if (txtDisbursement) txtDisbursement.textContent = `₹${totalDisbursed.toLocaleString('en-IN')}`; 
        if (txtCollection) txtCollection.textContent = `₹${totalCollected.toLocaleString('en-IN')}`; 
        if (txtExpenses) txtExpenses.textContent = `₹${totalExp.toLocaleString('en-IN')}`; 
        if (txtNewCustomers) txtNewCustomers.textContent = newCustCount; 
        if (txtInterestEarned) txtInterestEarned.textContent = `₹${interestEarned.toLocaleString('en-IN')}`;
        if (txtTotalPortfolio) txtTotalPortfolio.textContent = `₹${totalPortfolio.toLocaleString('en-IN')}`;
        
        // ⚡ अब यहाँ सिर्फ रुका हुआ लाइव ओवरड्यू अमाउंट ही डिस्प्ले होगा!
        if (txtTotalDue) txtTotalDue.textContent = `₹${runningMarketDue.toLocaleString('en-IN')}`;

        if (txtNetProfit) {
            txtNetProfit.textContent = `₹${netProfit.toLocaleString('en-IN')}`;
            txtNetProfit.style.color = netProfit >= 0 ? "#22c55e" : "#ef4444";
        }
    } 

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

    if (btnDaily) { 
        btnDaily.click(); 
    } else { 
        calculateReport("monthly"); 
    } 
});
