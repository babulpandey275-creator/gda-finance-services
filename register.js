import { db } from "./firebase.js"; 
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {

    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    const captureBtn = document.getElementById("captureBtn");
    const reTakeBtn = document.getElementById("reTakeBtn");
    let capturedImageData = null; 

    const loanAmountInput = document.getElementById("loanAmount");
    const loanPlanSelect = document.getElementById("loanPlan");
    const totalCollectionInput = document.getElementById("remainingAmount");
    const emiInput = document.getElementById("emi");
    const saveBtn = document.getElementById("saveBtn");

    /* ========================================= 
    📸 1. वीवो और एंड्रॉयड के लिए बैक कैमरा (Strict Rule)
    ========================================= */ 
    if (video) {
        // ब्राउज़र को मजबूर करना कि वो सिर्फ पीछे का ही कैमरा खोले
        const constraints = {
            video: { facingMode: { exact: "environment" } },
            audio: false
        };

        navigator.mediaDevices.getUserMedia(constraints)
        .then((stream) => {
            video.srcObject = stream;
        })
        .catch((err) => {
            console.warn("Exact back camera failed, trying normal environment...", err);
            // Fallback 1: सामान्य एनवायरनमेंट ट्राई करें
            navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
            .then((stream) => {
                video.srcObject = stream;
            })
            .catch((e) => {
                // Fallback 2: कोई भी कैमरा मिले उसे चालू कर दो
                navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                .then(stream => { video.srcObject = stream; })
                .catch(err2 => console.log("कैमरा पूरी तरह ब्लॉक है।", err2));
            });
        });
    }

    // फोटो कैप्चर बटन लॉजिक
    if (captureBtn) {
        captureBtn.onclick = () => {
            const context = canvas.getContext("2d");
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            capturedImageData = canvas.toDataURL("image/jpeg"); 
            
            video.style.display = "none";
            canvas.style.display = "block";
            captureBtn.style.display = "none";
            reTakeBtn.style.display = "block";
        };
    }

    // दोबारा फोटो खींचने का लॉजिक
    if (reTakeBtn) {
        reTakeBtn.onclick = () => {
            capturedImageData = null;
            canvas.style.display = "none";
            video.style.display = "block";
            reTakeBtn.style.display = "none";
            captureBtn.style.display = "block";
        };
    }

    /* ========================================= 
    🎯 2. लाइव ऑटो-कैलकुलेशन (60 और 80 दिन)
    ========================================= */ 
    function doCalculation() {
        const loanAmount = Number(loanAmountInput.value);
        const selectedPlan = Number(loanPlanSelect.value); // 60 या 80 दिन

        if (!loanAmount || loanAmount <= 0) {
            totalCollectionInput.value = "";
            emiInput.value = "";
            return;
        }

        // सीधा नियम: 20% ब्याज जोड़ना (जैसे 10000 का 12000)
        const totalCollection = loanAmount + (loanAmount * 0.20);
        
        // प्लान के हिसाब से रोजाना की किस्त भाग देना (EMI)
        const dailyEmi = totalCollection / selectedPlan;

        // वैल्यू इनपुट बॉक्स में डालना
        totalCollectionInput.value = Math.round(totalCollection);
        emiInput.value = Math.round(dailyEmi);
    }

    if (loanAmountInput) loanAmountInput.addEventListener("input", doCalculation);
    if (loanPlanSelect) loanPlanSelect.addEventListener("change", doCalculation);

    /* ========================================= 
    💾 3. फ़ायरबेस में डेटा सेव करने का लॉजिक 
    ========================================= */ 
    saveBtn.onclick = async () => {
        const name = document.getElementById("customerName").value.trim();
        const mobile = document.getElementById("mobileNumber").value.trim();
        const address = document.getElementById("address").value.trim();
        const aadhaar = document.getElementById("aadhaarNumber").value.trim();
        const loanAmount = Number(loanAmountInput.value);
        const planDays = Number(loanPlanSelect.value);

        if (!name || !mobile || !address || !aadhaar || !loanAmount) {
            alert("⚠️ कृपया सभी कॉलम सही-सही भरें!");
            return;
        }

        const totalCollection = Math.round(loanAmount + (loanAmount * 0.20));
        const dailyEmi = Math.round(totalCollection / planDays);

        try {
            saveBtn.disabled = true;
            saveBtn.innerText = "सुरक्षित किया जा रहा है...";

            await addDoc(collection(db, "customers"), {
                name: name,
                mobile: mobile,
                address: address,
                aadhaar: aadhaar,
                loan: loanAmount,
                planDays: planDays,
                emi: dailyEmi,
                remainingAmount: totalCollection, 
                customerPhoto: capturedImageData || "", 
                paidDays: 0,
                totalCollected: 0,
                status: "Active",
                loanDate: new Date().toISOString().split('T')[0] 
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
