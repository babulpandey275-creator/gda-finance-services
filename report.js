import { db } from "./firebase.js"; 
import { collection, getDocs, addDoc, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {

    // HTML के सभी डिस्प्ले एलिमेंट्स को कनेक्ट करना
    const lblCustomers = document.getElementById("customers");
    const lblLoan = document.getElementById("loan");
    const lblRemaining = document.getElementById("remaining");
    const lblTodayEarning = document.getElementById("today");
    const lblTotalCollection = document.getElementById("total"); // मंथली कलेक्शन

    const lblTodayExpense = document.getElementById("lblTodayExpense");
    const lblTodayNet = document.getElementById("lblTodayNet");
    const lblMonthExpense = document.getElementById("lblMonthExpense");
    const lblMonthNet = document.getElementById("lblMonthNet");

    // खर्च फॉर्म के एलिमेंट्स
    const expenseAmountInput = document.getElementById("expenseAmount");
    const expenseTypeSelect = document.getElementById("expenseType");
    const expenseNoteInput = document.getElementById("expenseNote");
    const expenseDateInput = document.getElementById("expenseDate");
    const saveExpenseBtn = document.getElementById("saveExpenseBtn");

    // 📅 आज की तारीख और इस महीने का कोड सेट करना (Format: YYYY-MM-DD)
    const todayDate = new Date().toISOString().split('T')[0];
    const currentMonthPrefix = todayDate.substring(0, 7); // YYYY-MM

    if (expenseDateInput) expenseDateInput.value = todayDate;

    /* ========================================= 
    📉 1. नया खर्च (Expense) डेटाबेस में सेव करने का लॉजिक
    ========================================= */ 
    if (saveExpenseBtn) {
        saveExpenseBtn.onclick = async () => {
            const amount = Number(expenseAmountInput.value);
            const type = expenseTypeSelect.value;
            const note = expenseNoteInput.value.trim();
            const selectDate = expenseDateInput.value;

            if (!amount || amount <= 0 || !note || !selectDate) {
                alert("⚠️ कृपया खर्च की राशि, विवरण और तारीख सही-सही दर्ज करें!");
                return;
            }

            try {
                saveExpenseBtn.disabled = true;
                saveExpenseBtn.innerText = "⏳ दर्ज हो रहा है...";

                await addDoc(collection(db, "expenses"), {
                    amount: amount,
                    type: type,
                    note: note,
                    date: selectDate,
                    createdAt: new Date().toISOString()
                });

                alert("🎉 खर्च सफलतापूर्वक दर्ज हो गया!");
                window.location.reload(); // पेज रीलोड करके रिपोर्ट अपडेट करें

            } catch (error) {
                console.error("खर्च सेव करने में एरर:", error);
                alert("⚠️ खर्च सुरक्षित नहीं हो सका।");
                saveExpenseBtn.disabled = false;
                saveExpenseBtn.innerText = "खर्च सुरक्षित करें";
            }
        };
    }

    /* ========================================= 
    📊 2. लाइव रिपोर्ट और वित्तीय सारांश कैलकुलेट करना
    ========================================= */ 
    async function calculateReports() {
        try {
            let totalCustomersCount = 0;
            let totalLoanDistributed = 0;
            let totalRemainingAmount = 0;

            let todayTotalEarning = 0;
            let monthTotalEarning = 0;

            let todayTotalExpense = 0;
            let monthTotalExpense = 0;

            // A. ग्राहकों का डेटा (Customers Summary) लोड करना
            const customerSnap = await getDocs(collection(db, "customers"));
            totalCustomersCount = customerSnap.size;

            customerSnap.forEach((docSnap) => {
                const cust = docSnap.data();
                if (cust.status !== "Closed") {
                    totalLoanDistributed += Number(cust.loanAmount || 0);
                    totalRemainingAmount += Number(cust.remainingAmount || 0);
                }
            });

            // B. कलेक्शन (कमाई) का डेटा निकालना
            const collectionSnap = await getDocs(collection(db, "collections"));
            collectionSnap.forEach((docSnap) => {
                const data = docSnap.data();
                const amount = Number(data.amount || 0);
                const colDate = data.date;

                if (colDate) {
                    if (colDate === todayDate) todayTotalEarning += amount;
                    if (colDate.startsWith(currentMonthPrefix)) monthTotalEarning += amount;
                }
            });

            // C. खर्चों (Expenses) का डेटा निकालना
            const expenseSnap = await getDocs(collection(db, "expenses"));
            expenseSnap.forEach((docSnap) => {
                const data = docSnap.data();
                const amount = Number(data.amount || 0);
                const expDate = data.date;

                if (expDate) {
                    if (expDate === todayDate) todayTotalExpense += amount;
                    if (expDate.startsWith(currentMonthPrefix)) monthTotalExpense += amount;
                }
            });

            /* ========================================= 
            🖥️ 3. स्क्रीन पर सारा डेटा रेंडर करना
            ========================================= */ 
            lblCustomers.textContent = totalCustomersCount;
            lblLoan.textContent = `₹${totalLoanDistributed}`;
            lblRemaining.textContent = `₹${totalRemainingAmount}`;
            
            // आज की कमाई और खर्चे
            lblTodayEarning.textContent = `₹${todayTotalEarning}`;
            lblTodayExpense.textContent = `₹${todayTotalExpense}`;
            const todayNet = todayTotalEarning - todayTotalExpense;
            lblTodayNet.textContent = `₹${todayNet}`;
            lblTodayNet.style.color = todayNet >= 0 ? "#22c55e" : "#ef4444";

            // मंथली कमाई (Monthly Collection) और खर्चे
            lblTotalCollection.textContent = `₹${monthTotalEarning}`;
            lblMonthExpense.textContent = `₹${monthTotalExpense}`;
            const monthNet = monthTotalEarning - monthTotalExpense;
            lblMonthNet.textContent = `₹${monthNet}`;
            lblMonthNet.style.color = monthNet >= 0 ? "#22c55e" : "#ef4444";

        } catch (error) {
            console.error("रिपोर्ट लोड करने में समस्या आई:", error);
        }
    }

    // रन करें
    await calculateReports();
});
