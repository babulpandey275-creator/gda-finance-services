import { db } from "./firebase.js"; 
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {

    // कैमरा एलिमेंट्स
    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    const captureBtn = document.getElementById("captureBtn");
    const reTakeBtn = document.getElementById("reTakeBtn");
    let capturedImageData = null; // इसमें फोटो का डेटा सेव होगा

    // इनपुट फील्ड्स
    const loanAmountInput = document.getElementById("loanAmount");
    const totalCollectionInput = document.getElementById("remainingAmount");
    const emiInput = document.getElementById("emi");
    const saveBtn = document.getElementById("saveBtn");

    /* ========================================= 
    📸 1. पुराना लाइव कैमरा चालू करने का लॉजिक 
    ========================================= */ 
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        video.srcObject = stream;
    } catch (err) {
        console.error("कैमरा चालू करने में असमर्थ: ", err);
        alert("कैमरा चालू नहीं हो सका, कृपया परमिशन चेक करें।");
    }

    // फोटो खींचने का बटन क्लिक इवेंट
    captureBtn.onclick = () => {
        const context = canvas.getContext("2d");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        
        capturedImageData = canvas.toDataURL("image/jpeg"); // फोटो को Base64 फॉर्मेट में बदलना
        
        video.style.display = "none";
        canvas.style.display = "block";
        captureBtn.style.display = "none";
        reTakeBtn.style.display = "inline-block";
    };

    // दोबारा फोटो खींचने का बटन क्लिक इवेंट
    reTakeBtn.onclick = () => {
        capturedImageData = null;
        canvas.style.display = "none";
        video.style.display = "block";
        reTakeBtn.style.display = "none";
        captureBtn.style.display = "inline-block";
    };

    /* ========================================= 
    🎯 2. ऑटोमैटिक कैलकुलेशन (जैसे 5000 का 6000 और ₹100 रोज़) 
    ========================================= */ 
    if (loanAmountInput) {
        loanAmountInput.addEventListener("input", () => {
            const loanAmount = Number(loanAmountInput.value);

            if (!loanAmount || loanAmount <= 0) {
                totalCollectionInput.value = "";
                emiInput.value = "";
                return;
            }

            // सीधा नियम: ब्याज जोड़कर ₹5000 का ₹6000 बनाना
            const totalCollection = loanAmount + (loanAmount * 0.20);
            
            // 60 दिन के हिसाब से रोजाना की किस्त
            const dailyEmi = totalCollection / 60;

            // कॉलम में वैल्यू तुरंत सेट करना
            totalCollectionInput.value = Math.round(totalCollection);
            emiInput.value = Math.round(dailyEmi);
        });
    }

    /* ========================================= 
    💾 3. फ़ायरबेस में डेटा सेव करने का लॉजिक 
    ========================================= */ 
    saveBtn.onclick = async () => {
        const name = document.getElementById("customerName").value.trim();
        const mobile = document.getElementById("mobileNumber").value.trim();
        const address = document.getElementById("address").value.trim();
        const aadhaar = document.getElementById("aadhaarNumber").value.trim();
        const loanAmount = Number(loanAmountInput.value);

        if (!name || !mobile || !address || !aadhaar || !loanAmount) {
            alert("⚠️ कृपया सभी कॉलम सही-सही भरें!");
            return;
        }

        const totalCollection = Math.round(loanAmount + (loanAmount * 0.20));
        const dailyEmi = Math.round(totalCollection / 60);

        try {
            saveBtn.disabled = true;
            saveBtn.innerText = "सुरक्षित किया जा रहा है...";

            // फ़ायरबेस डेटाबेस में रिकॉर्ड सेव करना
            await addDoc(collection(db, "customers"), {
                name: name,
                mobile: mobile,
                address: address,
                aadhaar: aadhaar,
                loan: loanAmount,
                emi: dailyEmi,
                remainingAmount: totalCollection, // शुरुआत में Remaining = Total Collection
                customerPhoto: capturedImageData || "", // खींची गई फोटो का डेटा
                paidDays: 0,
                totalCollected: 0,
                status: "Active",
                loanDate: new Date().toISOString().split('T')[0] // आज की तारीख
            });

            alert("✅ ग्राहक का खाता सफलतापुर्वक खुल गया है!");
            window.location.href = "customer-list.html";

        } catch (error) {
            console.error("सेव करने में एरर: ", error);
            alert("डेटाबेस एरर: सुरक्षित नहीं हो सका।");
            saveBtn.disabled = false;
            saveBtn.innerText = "💰 ग्राहक सुरक्षित करें";
        }
    };
});
