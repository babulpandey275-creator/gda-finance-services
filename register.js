import { db } from "./firebase.js"; 
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => {

    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    const captureBtn = document.getElementById("captureBtn");
    const reTakeBtn = document.getElementById("reTakeBtn");
    let capturedImageData = null; 

    const loanAmountInput = document.getElementById("loanAmount");
    const loanPlanSelect = document.getElementById("loanPlan"); // प्लान ड्रॉपडाउन
    const totalCollectionInput = document.getElementById("remainingAmount");
    const emiInput = document.getElementById("emi");
    const saveBtn = document.getElementById("saveBtn");

    /* ========================================= 
    📸 1. लाइव कैमरा सेटअप (सुरक्षित लॉजिक)
    ========================================= */ 
    if (video) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
        .then((stream) => {
            video.srcObject = stream;
        })
        .catch((err) => {
            console.error("कैमरा एक्सेस एरर: ", err);
            // मोबाइल ब्राउज़र सपोर्ट के लिए अल्टरनेटिव
            navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then(stream => { video.srcObject = stream; })
            .catch(e => console.log("कैमरा पूरी तरह ब्लॉक है।"));
        });
    }

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
    🎯 2. ऑटोमैटिक कैलकुलेशन (60 दिन और 80 दिन दोनों के लिए)
    ========================================= */ 
    function doCalculation() {
        const loanAmount = Number(loanAmountInput.value);
        const selectedPlan = Number(loanPlanSelect.value); // या तो 60 या 80 आएगा

        if (!loanAmount || loanAmount <= 0) {
            totalCollectionInput.value = "";
            emiInput.value = "";
            return;
        }

        // सीधा नियम: 20% ब्याज जोड़ना (जैसे 10000 का 12000 बनाना)
        const totalCollection = loanAmount + (loanAmount * 0.20);
        
        // चुने हुए प्लान के दिनों से भाग देकर डेली EMI निकालना (Total / 60 या Total / 80)
        const dailyEmi = totalCollection / selectedPlan;

        // इनपुट बॉक्स में वैल्यू सेट करना
        totalCollectionInput.value = Math.round(totalCollection);
        emiInput.value = Math.round(dailyEmi);
    }

    // जब अमाउंट टाइप करें या प्लान बदलें, दोनों समय कैलकुलेशन चले
    if (loanAmountInput) loanAmountInput.addEventListener("input", doCalculation);
    if (loanPlanSelect) loanPlanSelect.addEventListener("change", doCalculation);

    /* ========================================= 
    💾 3. डेटाबेस में सुरक्षित करने का लॉजिक 
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
                planDays: planDays, // 60 या 80 दिन डेटाबेस में जाएगा
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
