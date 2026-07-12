// ==========================================
// 🚀 GDA FINANCE - STABLE EXPENSE MANAGER SCRIPT (v12)
// ==========================================

import { db } from "./firebase.js"; 
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    const inpId = document.getElementById("expenseId");
    const inpAmount = document.getElementById("expAmount");
    const inpTitle = document.getElementById("expTitle");
    const inpDate = document.getElementById("expDate");
    const btnSave = document.getElementById("btnSaveExpense");
    const listContainer = document.getElementById("expenseListContainer");

    // 📅 आज की तारीख सेट करना
    if (inpDate) {
        inpDate.value = new Date().toISOString().split('T')[0];
    }

    let localExpenses = [];

    // 🔄 डेटाबेस से खर्चे लोड करने का फंक्शन
    async function loadExpenses() {
        try {
            listContainer.innerHTML = "⏳ लोड हो रहा है...";
            localExpenses = [];
            
            // तारीख के हिसाब से नए खर्चे ऊपर दिखाना
            const q = query(collection(db, "expenses"), orderBy("date", "desc"));
            const querySnapshot = await getDocs(q);
            listContainer.innerHTML = "";

            if (querySnapshot.empty) {
                listContainer.innerHTML = "<p style='text-align:center;color:#64748b;'>कोई खर्चा दर्ज नहीं है।</p>";
                return;
            }

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                localExpenses.push({ id: docSnap.id, ...data });

                const div = document.createElement("div");
                div.className = "expense-item";
                div.innerHTML = `
                    <div class="exp-details">
                        <p>${data.title}: <span>₹${data.amount}</span></p>
                        <span>📅 ${data.date}</span>
                    </div>
                    <div class="exp-actions">
                        <button class="btn-edit" data-id="${docSnap.id}">✏️</button>
                        <button class="btn-delete" data-id="${docSnap.id}">🗑️</button>
                    </div>
                `;
                listContainer.appendChild(div);
            });

            // ✏️ एडिट बटन का सही और फिक्स लॉजिक
            document.querySelectorAll(".btn-edit").forEach(btn => {
                btn.onclick = (e) => {
                    // e.currentTarget से हमेशा बटन की ID ही मिलेगी, चाहे इमोजी पर क्लिक हो
                    const id = e.currentTarget.getAttribute("data-id");
                    const item = localExpenses.find(x => x.id === id);
                    if (item) {
                        inpId.value = item.id;
                        inpAmount.value = item.amount;
                        inpTitle.value = item.title;
                        inpDate.value = item.date;
                        
                        btnSave.innerText = "🔄 खर्चा सुधारें (Update)";
                        btnSave.style.background = "#ffb703";
                        btnSave.style.color = "black";
                        window.scrollTo(0, 0); // स्क्रीन को ऊपर ले जाएं
                    }
                };
            });

            // 🗑️ डिलीट बटन का सही और फिक्स लॉजिक
            document.querySelectorAll(".btn-delete").forEach(btn => {
                btn.onclick = async (e) => {
                    const id = e.currentTarget.getAttribute("data-id");
                    if (confirm("❌ क्या आप इस खर्चे को सच में डिलीट करना चाहते हैं?")) {
                        try {
                            await deleteDoc(doc(db, "expenses", id));
                            alert("🗑️ खर्चा सफलतापूर्वक डिलीट हो गया!");
                            loadExpenses(); // लिस्ट दोबारा लोड करें
                        } catch (err) {
                            console.error(err);
                            alert("⚠️ डिलीट करने में एरर आया।");
                        }
                    }
                };
            });

        } catch (err) {
            console.error(err);
            listContainer.innerHTML = "⚠️ डेटा लोड नहीं हो सका।";
        }
    }

    // 💾 खर्चे सेव या अपडेट करने का बटन एक्शन
    if (btnSave) {
        btnSave.onclick = async () => {
            const id = inpId.value;
            const amount = Number(inpAmount.value);
            const title = inpTitle.value.trim();
            const date = inpDate.value;

            if (!amount || !title || !date) {
                alert("⚠️ कृपया सभी फ़ील्ड भरें!");
                return;
            }

            try {
                btnSave.disabled = true;
                btnSave.innerText = "⏳ सुरक्षित हो रहा है...";

                if (id) {
                    // अगर ID पहले से है, तो अपडेट करें
                    await updateDoc(doc(db, "expenses", id), {
                        amount: amount,
                        title: title,
                        date: date
                    });
                    alert("🎉 खर्चा सफलतापूर्वक सुधार दिया गया है!");
                } else {
                    // अगर ID नहीं है, तो नया खर्चा जोड़ें
                    await addDoc(collection(db, "expenses"), {
                        amount: amount,
                        title: title,
                        date: date,
                        createdAt: new Date().toISOString()
                    });
                    alert("🎉 नया खर्चा जुड़ गया है!");
                }

                // फॉर्म को वापस खाली (Reset) करना
                inpId.value = "";
                inpAmount.value = "";
                inpTitle.value = "";
                if (inpDate) inpDate.value = new Date().toISOString().split('T')[0];
                
                btnSave.innerText = "💾 खर्चा सुरक्षित करें";
                btnSave.style.background = "#dc3545";
                btnSave.style.color = "white";
                btnSave.disabled = false;
                
                loadExpenses(); // लिस्ट अपडेट करें

            } catch (err) {
                console.error(err);
                alert("⚠️ खर्चे को सेव करने में समस्या आई।");
                btnSave.disabled = false;
            }
        };
    }

    // पेज लोड होते ही खर्चे दिखाएं
    loadExpenses();
});
