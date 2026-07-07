import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 
// 🔓 लॉगआउट के लिए फायरबेस ऑथेंटिकेशन इम्पोर्ट किया गया
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js"; 

/* ========================================= 
GDA Finance Services V3 Dashboard Data Object 
========================================= */ 
let dashboardData = { 
    totalCustomers: 0, 
    totalLoan: 0, 
    totalCollection: 0, 
    todayCollection: 0, 
    totalRemaining: 0, 
    dueCustomers: 0 
}; 

// मुख्य फ़ंक्शन जो पूरा लाइव डेटा लोड करेगा 
export async function loadDashboard() { 
    try { 
        // पुराने लोड हुए डेटा को रीसेट करें 
        resetDashboard(); 

        // फायरबेस से ग्राहकों और कलेक्शन्स का स्नैपशॉट लें 
        const customerSnap = await getDocs(collection(db, "customers")); 
        const collectionSnap = await getDocs(collection(db, "collections")); 

        dashboardData.totalCustomers = customerSnap.size; 

        // आज की तारीख (YYYY-MM-DD फॉर्मेट में स्थानीय समयानुसार) 
        const tzOffset = (new Date()).getTimezoneOffset() * 60000; 
        const today = (new Date(Date.now() - tzOffset)).toISOString().split("T")[0]; 

        // 1. प्रत्येक ग्राहक के डेटा की गणना 
        customerSnap.forEach((docSnap) => { 
            const customer = docSnap.data(); 
            // केवल सक्रिय ग्राहकों का ही हिसाब जोड़ें (क्लोज्ड खातों को छोड़ें) 
            if(customer.status !== "Closed") { 
                dashboardData.totalLoan += Number(customer.loan || 0); 
                dashboardData.totalRemaining += Number(customer.remainingAmount || 0); 
                calculateDue(customer); 
            } 
        }); 

        // 2. प्रत्येक कलेक्शन (किस्त) के डेटा की गणना 
        collectionSnap.forEach((docSnap) => { 
            const item = docSnap.data(); 
            dashboardData.totalCollection += Number(item.amount || 0); 
            checkTodayCollection(item, today); 
        }); 

        // इंटरफ़ेस (UI) पर नया डेटा दिखाना 
        updateDashboardUI(); 
    } catch (err) { 
        console.error("डैशबोर्ड डेटा लोड करने में समस्या: ", err); 
    } 
} 

/* डेटा रीसेट फ़ंक्शन */ 
function resetDashboard(){ 
    dashboardData.totalCustomers = 0; 
    dashboardData.totalLoan = 0; 
    dashboardData.totalCollection = 0; 
    dashboardData.todayCollection = 0; 
    dashboardData.totalRemaining = 0; 
    dashboardData.dueCustomers = 0; 
} 

/* बकाया ग्राहकों (Due Customers) की गणना */ 
function calculateDue(customer) { 
    if (!customer.loanDate) return; 
    const loanDate = new Date(customer.loanDate); 
    const today = new Date(); 
    const passedDays = Math.floor( (today - loanDate) / (1000 * 60 * 60 * 24) ); 
    const paidDays = Number(customer.paidDays || 0); 
    const dueDays = passedDays - paidDays; 

    // यदि दिन बकाया हैं और शेष राशि अभी बची है 
    if ( dueDays > 0 && Number(customer.remainingAmount || 0) > 0 ) { 
        dashboardData.dueCustomers++; 
    } 
} 

/* आज के कलेक्शन की जांच (बैक-डेट के हिसाब से सुधरा हुआ लॉजिक) */ 
function checkTodayCollection(item, today) { 
    if (!item.date) return; 
    let collectionDate = ""; 

    // यदि तारीख फायरबेस का टाइमस्टैम्प ऑब्जेक्ट है
    if (item.date.toDate) { 
        collectionDate = item.date.toDate().toISOString().split("T")[0]; 
    } else if (item.date.seconds) { 
        collectionDate = new Date( item.date.seconds * 1000 ).toISOString().split("T")[0]; 
    } else if (typeof item.date === "string") {
        // यदि बैक-डेट एंट्री से तारीख सीधे स्ट्रिंग (YYYY-MM-DD) के रूप में आई है
        collectionDate = item.date;
    } 

    if (collectionDate === today) { 
        dashboardData.todayCollection += Number(item.amount || 0); 
    } 
} 

/* भारतीय मुद्रा नंबर फ़ॉर्मेटर (जैसे: 150000 -> 1,50,000) */ 
function formatNumber(value) { 
    return Number(value || 0).toLocaleString("en-IN"); 
} 

/* UI पर लाइव वैल्यू अपडेट करना */ 
function updateDashboardUI() { 
    const setText = (id, value) => { 
        const el = document.getElementById(id); 
        if (el) { 
            el.textContent = value; 
        } 
    }; 
    setText("totalCustomers", dashboardData.totalCustomers); 
    setText("totalLoan", formatNumber(dashboardData.totalLoan)); 
    setText("totalCollection", formatNumber(dashboardData.totalCollection)); 
    setText("todayCollection", formatNumber(dashboardData.todayCollection)); 
    setText("totalRemaining", formatNumber(dashboardData.totalRemaining)); 
    setText("dueCustomers", dashboardData.dueCustomers); 
} 

/* मैनुअल रिफ्रेश फ़ंक्शन */ 
window.refreshDashboard = function () { 
    loadDashboard(); 
}; 

/* ========================================= 
🔓 लाइव लॉगआउट (Logout) सिस्टम का लॉजिक 
========================================= */ 
window.addEventListener('DOMContentLoaded', () => {
    const auth = getAuth();

    async function handleLogout(e) {
        e.preventDefault(); 
        const confirmLogout = confirm("क्या आप सच में लॉगआउट करना चाहते हैं?");
        if (confirmLogout) {
            try {
                await signOut(auth);
                alert("🔒 आप सफलतापूर्वक लॉगआउट हो गए हैं।");
                window.location.href = "login.html"; // लॉगआउट के बाद लॉगिन पेज पर ट्रांसफर
            } catch (error) {
                console.error("लॉगआउट एरर:", error);
                alert("लॉगआउट विफल रहा, कृपया फिर से प्रयास करें।");
            }
        }
    }

    // साइडबार लॉगआउट बटन एक्टिवेट करें
    const sidebarLogoutBtn = document.getElementById("sidebarLogout");
    if (sidebarLogoutBtn) sidebarLogoutBtn.addEventListener("click", handleLogout);

    // मोबाइल बॉटम लॉगआउट बटन एक्टिवेट करें
    const bottomLogoutBtn = document.getElementById("bottomLogout");
    if (bottomLogoutBtn) bottomLogoutBtn.addEventListener("click", handleLogout);
});

// पेज लोड होते ही ऑटोमैटिक डेटा लोड करें 
loadDashboard();
