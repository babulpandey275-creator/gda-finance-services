// ⚡ सीधे Firebase SDK इम्पोर्ट कर रहे हैं ताकि कोई वर्ज़न या पाथ का एरर न आए
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ⚙️ आपका अपना Firebase कॉन्फ़िगरेशन (यह हर जगह समान रहता है)
const firebaseConfig = {
    authDomain: "gda-finance-services.firebaseapp.com",
    projectId: "gda-finance-services",
    storageBucket: "gda-finance-services.appspot.com",
    messagingSenderId: "367375263673",
    appId: "1:367375263673:web:5d2a9d604e3c35b62e49c9"
};

// 🔥 यहाँ 'db' को सीधे इनिशियलाइज़ कर दिया ताकि इसे बाहर से कोई गड़बड़ी न मिले
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

    // 🆔 ऑटोमैटिक GDA आईडी जेनरेट करने का बिना-इंडेक्स वाला नया फंक्शन
    async function generateNextGdaId() {
        try {
            const querySnapshot = await getDocs(collection(db, "customers"));
            let nextNumber = 1;
            
            if (!querySnapshot.empty) {
                let maxNo = 0;
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.member_no !== undefined) {
                        const currentNo = parseInt(data.member_no, 10);
                        if (currentNo > maxNo) {
                            maxNo = currentNo;
                        }
                    }
                });
                nextNumber = maxNo + 1;
            }
            
            const formattedNumber = String(nextNumber).padStart(3, '0');
            return { member_id: `GDA${formattedNumber}`, member_no: nextNumber };
        } catch (error) {
            console.error("Error generating GDA ID:", error);
            alert("⚠️ आईडी जेनरेट करने में दिक्कत: " + error.message);
            return null;
        }
    }

    // 📷 कैमरा लॉजिक
    if (video) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
            .then((stream) => { video.srcObject = stream; })
            .catch(() => {
                navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                    .then(stream => { video.srcObject = stream; })
                    .catch(err => console.log("कैमरा ब्लॉक है।", err));
            });
    }

    // 📸 फ़ोटो कैप्चर बटन
    if (captureBtn) {
        captureBtn.onclick = () => {
            const context = canvas.getContext("2d");
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            capturedImageData = canvas.toDataURL("image/jpeg", 0.5); 
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

    // 🧮 ब्याज कैलकुलेटर
    function doCalculation() {
        const loanAmount = Number(loanAmountInput.value);
        const selectedPlan = Number(loanPlanSelect.value);
        if (!loanAmount || loanAmount <= 0) {
            totalCollectionInput.value = "";
            emiInput.value = "";
            return;
        }
        const totalCollection = loanAmount + (loanAmount * 0.20);
        const dailyEmi = totalCollection / selectedPlan;
        totalCollectionInput.value = Math.round(totalCollection);
        emiInput.value = Math.round(dailyEmi);
    }

    if (loanAmountInput) loanAmountInput.addEventListener("input", doCalculation);
    if (loanPlanSelect) loanPlanSelect.addEventListener("change", doCalculation);

    // 💾 डेटा सुरक्षित सेव करने का लॉजिक
    saveBtn.onclick = async () => {
        const name = document.getElementById("customerName").value.trim();
        const mobile = document.getElementById("mobileNumber").value.trim();
        const address = document.getElementById("address").value.trim();
        const aadhaar = document.getElementById("aadhaarNumber").value.trim();
        const pan = document.getElementById("panNumber") ? document.getElementById("panNumber").value.trim().toUpperCase() : "-";
        
        const loanAmount = Number(loanAmountInput.value);
        const selectedPlan = Number(loanPlanSelect.value);
        const totalCollection = Number(totalCollectionInput.value);
        const emi = Number(emiInput.value);

        if (!name || !mobile || !address || !aadhaar || !loanAmount) {
            alert("⚠️ कृपया सभी जरूरी जानकारी दर्ज करें!");
            return;
        }

        try {
            saveBtn.disabled = true;
            saveBtn.innerText = "⏳ ग्राहक जोड़ा जा रहा है...";

            const idObj = await generateNextGdaId();
            if (!idObj) {
                throw new Error("GDA ID जेनरेट नहीं हो सकी।");
            }

            const todayDate = new Date().toISOString().split('T')[0];

            await addDoc(collection(db, "customers"), {
                customerCode: idObj.member_id,
                member_no: idObj.member_no,
                name: name,
                mobile: mobile,
                address: address,
                aadharCard: aadhaar,
                panCard: pan,
                loanAmount: loanAmount,
                planDuration: selectedPlan,
                duration: selectedPlan,
                totalCollection: totalCollection,
                remainingAmount: totalCollection,
                totalCollected: 0,
                dailyEmi: emi,
                emi: emi,
                paidDays: 0,
                status: "Active",
                customerPhoto: capturedImageData || null,
                loanDate: todayDate,
                createdAt: new Date().toISOString()
            });

            alert(`🎉 ग्राहक सफलतापूर्वक रजिस्टर हो गया है!\nMember ID: ${idObj.member_id}`);
            window.location.href = "customer-list.html";

        } catch (error) {
            console.error("Technical Error:", error);
            alert("⚠️ सेव नहीं हो सका!\n\nअसली वजह: " + error.message);
            saveBtn.disabled = false;
            saveBtn.innerText = "💰 ग्राहक सुरक्षित करें";
        }
    };
});
