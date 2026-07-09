import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => { 
    // 🛡️ सुरक्षा जांच (लॉगिन चेक)
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

    // लाइव डैशबोर्ड डेटा लोड करें
    await loadDashboardData(); 
}); 

async function loadDashboardData() { 
    try { 
        const customerSnap = await getDocs(collection(db, "customers")); 
        const collectionSnap = await getDocs(collection(db, "collections")); 

        // 🇮🇳 शुद्ध भारतीय समय (IST) के अनुसार आज की तारीख (Format: YYYY-MM-DD)
        const todayStr = new Date().toLocaleDateString('en-ZA', { timeZone: 'Asia/Kolkata' }); 

        let todayCollectionAmount = 0; 
        let dueCustomersCount = 0; 
        let activeAccountsCount = 0; 

        // 1. आज की वसूली का हिसाब (भारतीय समय के अनुसार)
        collectionSnap.forEach((docSnap) => { 
            const item = docSnap.data(); 
            if (item.date === todayStr) { 
                todayCollectionAmount += Number(item.amount || 0); 
            } 
        }); 

        // 2. ड्यू लिस्ट और सक्रिय खातों का सटीक वित्तीय गणित
        customerSnap.forEach((docSnap) => { 
            const customer = docSnap.data(); 
            if (customer.status !== "Closed") { 
                activeAccountsCount++; 

                if (customer.loanDate) { 
                    const loanAmount = Number(customer.loanAmount || 0); 
                    const totalCollected = Number(customer.totalCollected || 0); 

                    // 20% ब्याज दर का गणित (₹10,000 -> ₹12,000)
                    const totalPayableWithInterest = loanAmount + (loanAmount * 0.20); 
                    const dynamicRemaining = totalPayableWithInterest - totalCollected; 

                    const loanDate = new Date(customer.loanDate); 
                    const today = new Date(); 

                    // लोन लिए कितने दिन बीत चुके हैं
                    const passedDays = Math.floor((today - loanDate) / (1000 * 60 * 60 * 24)); 
                    const paidDays = Number(customer.paidDays || 0); 
                    const loanPlan = Number(customer.loanPlan || 60); 

                    // स्थिति A: अगर प्लान अवधि (60 दिन) पार हो चुकी है और बैलेंस बाकी है
                    if (passedDays > loanPlan && dynamicRemaining > 0) { 
                        dueCustomersCount++; 
                    } 
                    // स्थिति B: अवधि के अंदर है, लेकिन लगातार 3 दिन या उससे ज्यादा से किस्त गायब है
                    else { 
                        const missedDays = passedDays - paidDays; 
                        if (missedDays >= 3 && dynamicRemaining > 0) { 
                            dueCustomersCount++; 
                        } 
                    } 
                } 
            } 
        }); 

        // 🖥️ स्क्रीन के समरी कार्ड्स में डेटा दिखाना
        if (document.getElementById("miniTodayCollection")) { 
            document.getElementById("miniTodayCollection").textContent = `₹${todayCollectionAmount}`; 
        } 
        if (document.getElementById("miniDueCustomers")) { 
            document.getElementById("miniDueCustomers").textContent = dueCustomersCount; 
        } 
        if (document.getElementById("miniActiveAccounts")) { 
            document.getElementById("miniActiveAccounts").textContent = activeAccountsCount; 
        } 

        // पेंडिंग ड्यू लिस्ट का बगल वाला बैज (Badge) अपडेट करना
        const badgeDue = document.getElementById("badgeDue"); 
        if (badgeDue) {
            badgeDue.textContent = dueCustomersCount; 
        }

    } catch (err) { 
        console.error("डैशबोर्ड लाइव डेटा लोड करने में त्रुटि:", err); 
    } 
}
