// ==========================================================
// 🚀 GDA FINANCE - DAILY COLLECTION ENGINE (FIXED)
// ==========================================================
import { db } from "./firebase.js";
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

window.addEventListener('DOMContentLoaded', async () => {
    const customerSelect = document.getElementById("customerSelect");
    const collectAmount = document.getElementById("collectAmount");
    const collectionDate = document.getElementById("collectionDate");
    const submitCollectionBtn = document.getElementById("submitCollectionBtn");
    const detailsBox = document.getElementById("customerDetailsBox");
    const txtEmi = document.getElementById("txtEmi");
    const txtRemaining = document.getElementById("txtRemaining");
    const txtPaidDays = document.getElementById("txtPaidDays");

    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    if (collectionDate) collectionDate.value = todayIST;

    async function loadCustomersDropdown() {
        try {
            const querySnapshot = await getDocs(collection(db, "customers"));
            customerSelect.innerHTML = '<option value="" disabled selected>--- Select Customer ---</option>';
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.status!== "Closed" && data.status!== "Settled") {
                    const option = document.createElement("option");
                    option.value = docSnap.id;
                    option.textContent = `${data.name} (${data.customerCode || 'GDA'})`;
                    customerSelect.appendChild(option);
                }
            });
        } catch (err) { console.error(err); }
    }

    customerSelect.addEventListener('change', async (e) => {
        const selectedId = e.target.value;
        if (!selectedId) return;
        try {
            const custDoc = await getDoc(doc(db, "customers", selectedId));
            if (custDoc.exists()) {
                const data = custDoc.data();
                // 🔥 FIX: Dono field support karega
                const dailyEmi = Number(data.dailyEmi || data.dailyCollection || 0);
                const totalTarget = Number(data.totalCollection || data.totalPayable || 0);
                const collectedSoFar = Number(data.totalCollected || 0);
                const remaining = Math.max(0, totalTarget - collectedSoFar);
                const paidDays = Number(data.paidDays || 0);
                collectAmount.value = dailyEmi;
                txtEmi.innerText = `₹${dailyEmi}`;
                txtRemaining.innerText = `₹${collectedSoFar} / ₹${totalTarget}`;
                txtPaidDays.innerText = `${paidDays} Days`;
                detailsBox.style.display = "block";
            }
        } catch (err) { console.error(err); }
    });

    if (submitCollectionBtn) {
        submitCollectionBtn.onclick = async () => {
            const selectedId = customerSelect.value;
            const amount = Number(collectAmount.value);
            const rawDate = collectionDate.value;
            const date = new Date(rawDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

            if (!selectedId ||!amount || amount <= 0 ||!rawDate) {
                alert("⚠️ कृपया सही जानकारी भरें!"); return;
            }

            try {
                submitCollectionBtn.disabled = true;
                submitCollectionBtn.innerText = "⏳ Saving...";

                // 🔥 FIX: Same din double payment block
                const dupQuery = query(collection(db, "collections"), where("customerId", "==", selectedId), where("date", "==", date));
                const dupSnap = await getDocs(dupQuery);
                if(!dupSnap.empty){
                    alert("⚠️ Is customer ka aaj ka payment already ho chuka hai!");
                    submitCollectionBtn.disabled = false;
                    submitCollectionBtn.innerText = "📥 Post Payment Record";
                    return;
                }

                await addDoc(collection(db, "collections"), {
                    customerId: selectedId,
                    amount: amount,
                    date: date,
                    note: "EMI Received",
                    timestamp: new Date()
                });

                const custRef = doc(db, "customers", selectedId);
                const snap = await getDoc(custRef);
                const data = snap.data();

                await updateDoc(custRef, {
                    totalCollected: Number(data.totalCollected || 0) + amount,
                    paidDays: Number(data.paidDays || 0) + 1
                });

                alert("✅ पैसा सफलतापूर्वक जमा हो गया!");
                window.location.href = "customer-list.html";
            } catch (err) {
                alert("⚠️ Error: " + err.message);
                submitCollectionBtn.disabled = false;
                submitCollectionBtn.innerText = "Submit Collection";
            }
        };
    }
    await loadCustomersDropdown();
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('id');
    if (idFromUrl) {
        customerSelect.value = idFromUrl;
        customerSelect.dispatchEvent(new Event('change'));
    }
});
