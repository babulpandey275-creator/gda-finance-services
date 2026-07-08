import { db } from "./firebase.js"; 
import { collection, addDoc, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

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
    🆔 0. ऑटोमैटिक GDA ID जेनरेट करने का लॉजिक
    ========================================= */ 
    async function generateNextGdaId() {
        try {
            // 'customers' कलेक्शन से सबसे बड़ी member_id वाली आखिरी एंट्री उठाएं
            const q = query(collection(db, "customers"), orderBy("member_id", "desc"), limit(1));
            const querySnapshot = await getDocs(q);
            
            let nextNumber = 1; // अगर डेटाबेस खाली है, तो 001 से शुरू होगा

            if (!querySnapshot.empty) {
                const lastCustomer = querySnapshot.docs[0].data();
                const lastId = lastCustomer.member_id; // उदाहरण के लिए: "GDA045"
                
                if (lastId && lastId.startsWith("GDA")) {
                    // "GDA" को हटाकर सिर्फ नंबर निकालेंगे
                    const lastNumberStr = lastId.replace("GDA", "");
                    const lastNumber = parseInt(lastNumberStr, 10);
                    
                    if (!isNaN(lastNumber)) {
                        nextNumber = lastNumber + 1; // पिछले नंबर में +1 करेंगे
                    }
                }
            }

            // नंबर को 3 डिजिट के फॉर्मेट में बदलेंगे (जैसे: 1 को 001, 12 को 012)
            const formattedNumber = String(nextNumber).padStart(3, '0');
            return `GDA${formattedNumber}`; // आउटपुट: GDA001, GDA002 आदि
        } catch (error) {
            console.error("Error generating GDA ID:", error);
            return null;
        }
    }

    /* ========================================= 
    📸 1. वीवो और एंड्रॉयड के लिए बैक कामना (Strict Rule)
    ========================================= */ 
    if (video) {
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
            navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
            .then((stream) => {
                video.srcObject = stream;
            })
            .catch((e) => {
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

        const totalCollection = loanAmount + (loanAmount * 0.20); // 20% ब्याज
        const dailyEmi = totalCollection / selectedPlan;

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
        const loanAmount = Number(loanAmountInput.value);
        const selectedPlan = Number(loanPlanSelect.value);
        const totalCollection = Number(totalCollectionInput.value);
        const emi = Number(emiInput.value);

        // बेसिक डेटा वैलिडेशन
        if (!name || !mobile || !address || !loanAmount) {
            alert("⚠️ कृपया सभी जरूरी जानकारी (नाम, मोबाइल, पता, लोन राशि) दर्ज करें!");
            return;
        }

        try {
            saveBtn.disabled = true;
            saveBtn.innerText = "⏳ ग्राहक जोड़ा जा रहा है...";

            // ऑटो-ID जेनरेट करें (जैसे: GDA001)
            const newMemberId = await generateNextGdaId();
            if (!newMemberId) {
                throw new Error("GDA ID जेनरेट नहीं हो सकी।");
            }

            // 'customers' कलेक्शन में डेटा सेव करना
            await addDoc(collection(db, "customers"), {
                member_id: newMemberId, // आपकी नई सीरीज GDA001 यहाँ सेव होगी
                name: name,
                mobile: mobile,
                address: address,
                loanAmount: loanAmount,
                loanPlan: selectedPlan,
                totalCollection: totalCollection,
                remainingAmount: totalCollection, // शुरुआत में बकाया पूरा कलेक्शन होगा
                totalCollected: 0,
                emi: emi,
                paidDays: 0,
                status: "Active",
                customerPhoto: capturedImageData || null, // खींची हुई फोटो बेस64 फॉर्मेट में
                createdAt: new Date().toISOString()
            });

            alert(`🎉 ग्राहक सफलतापूर्वक रजिस्टर हो गया है!\nMember ID: ${newMemberId}`);
            window.location.href = "customer-list.html"; // वापस कस्टमर लिस्ट पर भेजें

        } catch (error) {
            console.error("कस्टमर सेव करने में तकनीकी एरर:", error);
            alert("⚠️ डेटाबेस में ग्राहक सुरक्षित नहीं हो सका। कृपया दोबारा प्रयास करें।");
            saveBtn.disabled = false;
            saveBtn.innerText = "💾 ग्राहक सुरक्षित करें";
        }
    };
});
