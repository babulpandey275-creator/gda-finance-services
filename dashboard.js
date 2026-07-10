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

    // ⚙️ पासवर्ड बदलने वाले बटन का लॉजिक चालू करें
    initPasswordChangeLogic();

    // लाइव डैशबोर्ड डेटा लोड करें 
    await loadDashboardData(); 
}); 

async function loadDashboardData() { 
    try { 
        const customerSnap = await getDocs(collection(db, "customers")); 
        const collectionSnap = await getDocs(collection(db, "collections")); 

        // 🇮🇳 भारतीय समय (IST) के अनुसार आज का दिन, महीना और साल अलग-अलग निकालें
        const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric', day: 'numeric' };
        const todayParts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date());
        
        const todayDay = todayParts.find(p => p.type === 'day').value;
        const todayMonth = todayParts.find(p => p.type === 'month').value;
        const todayYear = todayParts.find(p => p.type === 'year').value;
        
        let todayCollectionAmount = 0; 
        let dueCustomersCount = 0; 
        let activeAccountsCount = 0; 

        // 1. आज की वसूली का हिसाब (सबसे सटीक तारीख मिलान लॉजिक) 
        collectionSnap.forEach((docSnap) => { 
            const item = docSnap.data(); 
            if (!item.date) return;

            let colDateObj = null;

            // तारीख को सही JavaScript Date में बदलना
            if (item.date.toDate) {
                colDateObj = item.date.toDate();
            } else if (item.date.seconds) {
                colDateObj = new Date(item.date.seconds * 1000);
            } else {
                // अगर तारीख टेक्स्ट है तो स्लैश और डैश दोनों को ठीक करके डेट बनाएँ
                const cleanDateStr = String(item.date).replace(/\//g, '-').trim();
                colDateObj = new Date(cleanDateStr);
            }

            if (colDateObj && !isNaN(colDateObj.getTime())) {
                // कलेक्शन की तारीख का दिन, महीना, साल भी IST के अनुसार निकालें
                const colParts = new Intl.DateTimeFormat('en-US', options).formatToParts(colDateObj);
                const colDay = colParts.find(p => p.type === 'day').value;
                const colMonth = colParts.find(p => p.type === 'month').value;
                const colYear = colParts.find(p => p.type === 'year').value;

                // 🎯 दिन, महीना और साल तीनों का एकदम पक्का मिलान
                if (colDay === todayDay && colMonth === todayMonth && colYear === todayYear) { 
                    todayCollectionAmount += Number(item.amount || 0); 
                } 
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
                    
                    const totalPayableWithInterest = loanAmount + (loanAmount * 0.20); 
                    const dynamicRemaining = totalPayableWithInterest - totalCollected; 
                    
                    const loanDate = new Date(customer.loanDate); 
                    const today = new Date(); 
                    
                    const passedDays = Math.floor((today - loanDate) / (1000 * 60 * 60 * 24)); 
                    const paidDays = Number(customer.paidDays || 0); 
                    const loanPlan = Number(customer.loanPlan || 60); 

                    if (passedDays > loanPlan && dynamicRemaining > 0) { 
                        dueCustomersCount++; 
                    } 
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

        const badgeDue = document.getElementById("badgeDue"); 
        if (badgeDue) { 
            badgeDue.textContent = dueCustomersCount; 
        } 
    } catch (err) { 
        console.error("डैशबोर्ड लाइव डेटा लोड करने में त्रुटि:", err); 
    } 
}

// ⚙️ खुद से मोबाइल द्वारा पासवर्ड बदलने का फंक्शन
function initPasswordChangeLogic() {
    if (!document.getElementById("btnOpenPassChange")) {
        const btnContainer = document.createElement("div");
        btnContainer.style.cssText = "text-align: center; margin: 30px 0; padding: 0 15px;";
        
        const changePassBtn = document.createElement("button");
        changePassBtn.id = "btnOpenPassChange";
        changePassBtn.innerHTML = "⚙️ सुरक्षा सेटिंग्स (Change Password)";
        changePassBtn.style.cssText = "background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white; padding: 12px 24px; border: none; border-radius: 10px; font-weight: bold; font-size: 14px; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.15); transition: all 0.3s;";
        
        btnContainer.appendChild(changePassBtn);
        document.body.appendChild(btnContainer);
    }

    document.getElementById("btnOpenPassChange").onclick = function() {
        const oldPass = prompt("सुरक्षा जांच: अपना मौजूदा (पुराना) पासवर्ड डालें:");
        if (!oldPass) return;

        const currentSavedPass = localStorage.getItem("appPassword") || "gda123"; 

        if (oldPass !== currentSavedPass) {
            alert("❌ गलत पुराना पासवर्ड! सुरक्षा कारणों से बदलाव रद्द किया गया।");
            return;
        }

        const currentSavedUser = localStorage.getItem("appUsername") || "admin";
        const newUser = prompt("नया यूज़रनेम डालें (पुराना रखने के लिए इसे ऐसे ही छोड़ दें):", currentSavedUser);
        const newPass = prompt("अब अपना नया सीक्रेट पासवर्ड दर्ज करें:");

        if (newUser && newPass && newPass.trim() !== "") {
            localStorage.setItem("appUsername", newUser.trim());
            localStorage.setItem("appPassword", newPass.trim());
            alert("🎉 मुबारक हो भाई! आपका नया यूज़रनेम और पासवर्ड सेव हो गया है। अगली बार से इसी नए पासवर्ड से ऐप खुलेगी।");
        } else {
            alert("⚠️ पासवर्ड खाली नहीं हो सकता, कोई बदलाव नहीं किया गया!");
        }
    };
}
