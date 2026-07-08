import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    // 🛡️ सुरक्षा जांच
    if (localStorage.getItem("gdaLoggedIn") !== "true") {
        window.location.href = "login.html";
        return;
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            if (confirm("क्या आप सच में लॉगआउट करना चाहते हैं?")) {
                localStorage.removeItem("gdaLoggedIn");
                window.location.href = "login.html";
            }
        };
    }

    // लाइव डैशबोर्ड लोड करें
    await loadDashboardData();
});

async function loadDashboardData() {
    try {
        const customerSnap = await getDocs(collection(db, "customers")); 
        const collectionSnap = await getDocs(collection(db, "collections")); 

        const todayStr = new Date().toISOString().split("T")[0]; 

        let todayCollectionAmount = 0;
        let dueCustomersCount = 0;
        let activeAccountsCount = 0;

        // 1. आज की वसूली का हिसाब निकालना
        collectionSnap.forEach((docSnap) => {
            const item = docSnap.data();
            if (item.date === todayStr) {
                todayCollectionAmount += Number(item.amount || 0);
            }
        });

        // 2. एडवांस्ड ड्यू और सक्रिय खातों का हिसाब निकालना
        customerSnap.forEach((docSnap) => {
            const customer = docSnap.data();
            
            if (customer.status !== "Closed") {
                activeAccountsCount++;

                // 🎯 एडवांस्ड ड्यू लॉजिक
                if (customer.loanDate) {
                    const loanDate = new Date(customer.loanDate);
                    const today = new Date();
                    
                    // लोन लिए कितने दिन बीत चुके हैं
                    const passedDays = Math.floor((today - loanDate) / (1000 * 60 * 60 * 24));
                    const paidDays = Number(customer.paidDays || 0);
                    const loanPlan = Number(customer.loanPlan || 60);

                    // स्थिति A: अगर लोन की मियाद (60/80 दिन) पार हो चुकी है
                    if (passedDays > loanPlan && Number(customer.remainingAmount || 0) > 0) {
                        dueCustomersCount++;
                    } 
                    // स्थिति B: मियाद के अंदर है, लेकिन लगातार 3 दिन या उससे ज्यादा से किस्त गायब है
                    else {
                        const missedDays = passedDays - paidDays;
                        if (missedDays >= 3 && Number(customer.remainingAmount || 0) > 0) {
                            dueCustomersCount++;
                        }
                    }
                }
            }
        });

        // 🖥️ छोटे लाइव डिब्बों में डेटा प्रिंट करना
        document.getElementById("miniTodayCollection").textContent = `₹${todayCollectionAmount}`;
        document.getElementById("miniDueCustomers").textContent = dueCustomersCount;
        document.getElementById("miniActiveAccounts").textContent = activeAccountsCount;
        
        // पेंडिंग ड्यू लिस्ट का बगल वाला बैज अपडेट करना
        const badgeDue = document.getElementById("badgeDue");
        if (badgeDue) badgeDue.textContent = dueCustomersCount;

    } catch (err) {
        console.error("डैशबोर्ड लाइव डेटा लोड करने में त्रुटि:", err);
    }
}
