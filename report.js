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
    const txtNewCustomers = document.getElementById("txtNewCustomers"); 

    let allCustomers = []; 
    let allCollections = []; 
    let allExpenses = []; 

    // 🇮🇳 डिफ़ॉल्ट रूप से आज की शुद्ध भारतीय तारीख सेट करना (YYYY-MM-DD)
    const todayIST = new Date().toLocaleDateString('en-ZA', { timeZone: 'Asia/Kolkata' });
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

    function calculateReport(type) { 
        const now = new Date(); 
        const targetDailyDate = inpReportDate ? inpReportDate.value : todayIST; // सेलेक्ट की गई तारीख

        let totalDisbursed = 0; 
        let totalCollected = 0; 
        let totalExp = 0; 
        let newCustCount = 0; 

        // 1. वितरित लोन (Disbursement) और नए ग्राहकों का हिसाब
        allCustomers.forEach(cust => { 
            if (!cust.loanDate) return; 
            let match = false; 

            if (type === "daily") {
                if (cust.loanDate === targetDailyDate) match = true;
            } else {
                const cDate = new Date(cust.loanDate); 
                if (type === "monthly") { 
                    if (cDate.getMonth() === now.getMonth() && cDate.getFullYear() === now.getFullYear()) match = true; 
                } else if (type === "quarterly") { 
                    const currentQuarter = Math.floor(now.getMonth() / 3); 
                    const custQuarter = Math.floor(cDate.getMonth() / 3); 
                    if (currentQuarter === custQuarter && cDate.getFullYear() === now.getFullYear()) match = true; 
                } else if (type === "yearly") { 
                    if (cDate.getFullYear() === now.getFullYear()) match = true; 
                }
            }

            if (match) { 
                totalDisbursed += (Number(cust.loanAmount) || 0); 
                newCustCount++; 
            } 
        }); 

        // 2. वसूली कलेक्शन (Collection) का हिसाब
        allCollections.forEach(col => { 
            let colDateStr = ""; 
            if (col.date) { 
                if (col.date.toDate) colDateStr = col.date.toDate().toISOString().split("T")[0]; 
                else if (col.date.seconds) colDateStr = new Date(col.date.seconds * 1000).toISOString().split("T")[0]; 
                else colDateStr = col.date; 
            } 
            if (!colDateStr) return; 

            let match = false; 

            if (type === "daily") {
                if (colDateStr === targetDailyDate) match = true;
            } else {
                const colDate = new Date(colDateStr);
                if (type === "monthly") { 
                    if (colDate.getMonth() === now.getMonth() && colDate.getFullYear() === now.getFullYear()) match = true; 
                } else if (type === "quarterly") { 
                    const currentQuarter = Math.floor(now.getMonth() / 3); 
                    const colQuarter = Math.floor(colDate.getMonth() / 3); 
                    if (currentQuarter === colQuarter && colDate.getFullYear() === now.getFullYear()) match = true; 
                } else if (type === "yearly") { 
                    if (colDate.getFullYear() === now.getFullYear()) match = true; 
                }
            }

            if (match) { 
                totalCollected += (Number(col.amount) || 0); 
            } 
        }); 

        // 3. खर्चे (Expenses) का हिसाब
        allExpenses.forEach(exp => { 
            if (!exp.date) return; 
            let match = false; 

            if (type === "daily") {
                if (exp.date === targetDailyDate) match = true;
            } else {
                const eDate = new Date(exp.date); 
                if (type === "monthly") { 
                    if (eDate.getMonth() === now.getMonth() && eDate.getFullYear() === now.getFullYear()) match = true; 
                } else if (type === "quarterly") { 
                    const currentQuarter = Math.floor(now.getMonth() / 3); 
                    const expQuarter = Math.floor(eDate.getMonth() / 3); 
                    if (currentQuarter === expQuarter && eDate.getFullYear() === now.getFullYear()) match = true; 
                } else if (type === "yearly") { 
                    if (eDate.getFullYear() === now.getFullYear()) match = true; 
                }
            }

            if (match) { 
                totalExp += (Number(exp.amount) || 0); 
            } 
        }); 

        txtDisbursement.textContent = `₹${totalDisbursed}`; 
        txtCollection.textContent = `₹${totalCollected}`; 
        txtExpenses.textContent = `₹${totalExp}`; 
        txtNewCustomers.textContent = newCustCount; 
    } 

    // 🔘 बटन क्लिक इवेंट्स
    if (btnDaily) {
        btnDaily.onclick = () => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            btnDaily.classList.add("active");
            if (dateFilterBox) dateFilterBox.style.display = "block"; // कैलेंडर दिखाओ
            reportTitle.textContent = "तारीख के अनुसार दैनिक लाइव रिपोर्ट";
            calculateReport("daily");
        };
    }

    if (btnMonthly) { 
        btnMonthly.onclick = () => { 
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active")); 
            btnMonthly.classList.add("active"); 
            if (dateFilterBox) dateFilterBox.style.display = "none"; // कैलेंडर छुपाओ
            reportTitle.textContent = "इस महीने की लाइव रिपोर्ट (Current Month)"; 
            calculateReport("monthly"); 
        }; 
    } 

    if (btnQuarterly) { 
        btnQuarterly.onclick = () => { 
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active")); 
            btnQuarterly.classList.add("active"); 
            if (dateFilterBox) dateFilterBox.style.display = "none"; // कैलेंडर छुपाओ
            reportTitle.textContent = "इस तिमाही की लाइव रिपोर्ट (Current Quarter)"; 
            calculateReport("quarterly"); 
        }; 
    } 

    if (btnYearly) { 
        btnYearly.onclick = () => { 
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active")); 
            btnYearly.classList.add("active"); 
            if (dateFilterBox) dateFilterBox.style.display = "none"; // कैलेंडर छुपाओ
            reportTitle.textContent = "इस साल की लाइव रिपोर्ट (Current Year)"; 
            calculateReport("yearly"); 
        }; 
    } 

    // 📅 कैलेंडर में तारीख बदलने पर ऑटो-अपडेट
    if (inpReportDate) {
        inpReportDate.onchange = () => {
            calculateReport("daily");
        };
    }

    // डिफ़ॉल्ट रूप से पहली बार 'Daily' रिपोर्ट लोड करना
    if (btnDaily) {
        btnDaily.click();
    } else {
        calculateReport("monthly");
    }
});
