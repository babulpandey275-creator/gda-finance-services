import { db } from "./firebase.js"; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {
    const historyTableBody = document.querySelector(".table-responsive tbody") || document.getElementById("historyTableBody") || document.querySelector(".main-wrapper tbody") || document.querySelector("tbody");

    if (!historyTableBody) {
        console.error("Table body elements not found in HTML template layout.");
        return;
    }

    async function loadAllCollectionHistory() {
        try {
            // Loading Spinner UI
            historyTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin"></i> इतिहास लोड हो रहा है...</td></tr>`;

            const qSnap = await getDocs(collection(db, "collections"));
            historyTableBody.innerHTML = "";

            if (qSnap.empty) {
                historyTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">अभी तक कोई लेनदेन दर्ज नहीं हुआ है।</td></tr>`;
                return;
            }

            let logArray = [];
            qSnap.forEach((docSnap) => {
                logArray.push({ id: docSnap.id, ...docSnap.data() });
            });

            // Newest transactions first (tariq ke hisab se sorting)
            logArray.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

            logArray.forEach((collect) => {
                // 📅 1. Date formatting block with automatic fallback system
                let finalDateDisplay = "-";
                if (collect.date) {
                    finalDateDisplay = collect.date; // Standard String format (YYYY-MM-DD)
                } else if (collect.createdAt) {
                    finalDateDisplay = collect.createdAt.split("T")[0]; // ISO dynamic fallback string split
                } else if (collect.timestamp && collect.timestamp.toDate) {
                    finalDateDisplay = collect.timestamp.toDate().toISOString().split("T")[0];
                }

                // 📞 2. Mobile number formatting fallback mechanism
                // Agar database mein customerMobile field khali hai, to dynamic variable check apply hoga
                let finalMobileDisplay = collect.customerMobile || collect.mobile || "दर्ज नहीं";

                // Render dynamic card text block to match your existing clean design view UI
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td style="padding: 12px 8px; vertical-align: middle;">${finalDateDisplay}</td>
                    <td style="padding: 12px 8px; vertical-align: middle;">
                        <div style="font-weight: 600; color: #1e293b;">${collect.customerName || "-"}</div>
                        <div style="font-size: 11px; color: #64748b;">Paid Days: ${collect.paidDays || 0} दिन</div>
                    </td>
                    <td style="padding: 12px 8px; vertical-align: middle; color: #64748b;">${finalMobileDisplay}</td>
                    <td style="padding: 12px 8px; vertical-align: middle; text-align: right; color: #2e7d32; font-weight: bold;">₹${collect.amount || 0}</td>
                `;
                historyTableBody.appendChild(tr);
            });

        } catch (error) {
            console.error("Error fetching ledger reports history logs:", error);
            historyTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red; padding:20px;">⚠️ इतिहास लोड करने में तकनीकी समस्या आई।</td></tr>`;
        }
    }

    await loadAllCollectionHistory();
});
