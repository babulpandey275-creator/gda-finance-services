editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const photoInput = document.getElementById("customerPhoto");
    
    // डेटाबेस के फील्ड नामों के साथ मैचिंग ऑब्जेक्ट
    let updateData = {
        name: document.getElementById("customerName").value,
        mobile: document.getElementById("mobileNumber").value,
        address: document.getElementById("address").value,
        panCard: document.getElementById("panNumber").value, // यह आपके डेटाबेस के 'panCard' फील्ड से मैच होगा
        loanAmount: document.getElementById("loanAmount").value,
        loanPlan: document.getElementById("loanPlan").value,
        loanDate: document.getElementById("loanDate").value
        // totalAmount, emi आदि को यहाँ से हटा दिया है क्योंकि वे readonly हैं और डेटाबेस में शायद ऑटो-कैलकुलेट होते हैं
    };

    try {
        if (photoInput.files && photoInput.files[0]) {
            const file = photoInput.files[0];
            const storageRef = ref(storage, 'customers/' + custId);
            await uploadBytes(storageRef, file);
            const photoUrl = await getDownloadURL(storageRef);
            updateData.customerPhoto = photoUrl;
        }

        // अब यहाँ केवल वही फील्ड्स अपडेट होंगे जो हमने ऊपर लिखे हैं
        await updateDoc(doc(db, "customers", custId), updateData);
        
        alert("✅ डिटेल्स सफलतापूर्वक अपडेट हो गई!");
        window.location.href = "index.html"; 
    } catch (err) {
        console.error("Update Error:", err);
        alert("❌ एरर: " + err.message);
    }
});
