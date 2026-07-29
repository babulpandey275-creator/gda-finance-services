// btn-row-del wala part isse replace karo
btn.onclick = async (e) => {
    const pass = prompt("Admin Password डालें:");
    if (pass!== "GDA@2026") {
        if (pass!== null) alert("❌ गलत पासवर्ड!");
        return;
    }
    if (confirm("⚠️ क्या आप वाकई इस पेमेंट एंट्री को डिलीट करना चाहते हैं?")) {
        const colId = e.target.getAttribute("data-colid");
        const colDoc = await getDoc(doc(db, "collections", colId));
        const colAmount = colDoc.exists()? Number(colDoc.data().amount || 0) : 0;

        await deleteDoc(doc(db, "collections", colId));

        // 🔥 FIX: Customer ka totalCollected bhi kam karo
        const custRef = doc(db, "customers", custId);
        const custSnap = await getDoc(custRef);
        if(custSnap.exists()){
            const cData = custSnap.data();
            await updateDoc(custRef, {
                totalCollected: Math.max(0, Number(cData.totalCollected || 0) - colAmount),
                paidDays: Math.max(0, Number(cData.paidDays || 0) - 1)
            });
        }

        alert("✅ एंट्री डिलीट हो गई!");
        location.reload();
    }
};
