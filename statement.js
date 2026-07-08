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
    🆔 0. ऑटोमैटिक GDA ID जेनरेट करने का लॉजिक (Fullproof System)
    ========================================= */ 
    async function generateNextGdaId() {
        try {
            // 'member_no' (नंबर) के हिसाब से सबसे बड़ा नंबर ढूंढेंगे ताकि स्ट्रिंग सॉर्टिंग की गड़बड़ी न हो
            const q = query(collection(db, "customers"), orderBy("member_no", "desc"), limit(1));
            const querySnapshot = await getDocs(q);
            
            let nextNumber = 1; // डिफ़ॉल्ट 1 (अगर डेटाबेस बिल्कुल खाली है)

            if (!querySnapshot.empty) {
                const lastCustomer = querySnapshot.docs[0].data();
                // अगर पुराना नंबर मौजूद है, तो उसमें +1 कर देंगे
                if (lastCustomer.member_no !== undefined) {
                    nextNumber = parseInt(lastCustomer.member_no, 10) + 1;
                }
            }

            // नंबर को 3 डिजिट में बदलेंगे (जैसे: 5 को 005)
            const formattedNumber = String(nextNumber).padStart(3, '0');
            
            return {
                member_id: `GDA${formattedNumber}`,
                member_no: nextNumber
            };
        } catch (error) {
            console.error("Error generating GDA ID:", error);
            alert("⚠️ फायरबेस इंडेक्स बन रहा है या कोई गड़बड़ी है। कृपया कंसोल एरर चेक करें या दोबारा दबाएं।");
            return null;
        }
    }

    /* ========================================= 
    📸 1. कैमरा लॉजिक
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
    🎯 2. लाइव ऑटो-कैलकुलेशन 
    ========================================= */ 
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

    /* ========================================= 
    💾 3. फ़ायरबेस में डेटा सेव करने का लॉजिक 
    ========================================= */ 
    saveBtn.onclick = async () => {
        const name = document.getElementById("customerName").value.trim();
        const mobile = document.getElementById("mobileNumber").value.trim();
        const address = document.getElementById("address").value.trim();
        const loanAmount = Number(loanAmountInput.value);
        const selectedPlan = Number(loanPlanSelect.value);
        const totalCollection = Number(ttalCollectionInput.value);
        const emi = Number(emiInput.value);

        if (!name || !mobile || !address || !loanAmount) {
            alert("⚠️ कृपया सभी जरूरी जानकारी दर्ज करें!");
            return;
        }

        try {
            saveBtn.disabled = true;
            saveBtn.innerText = "⏳ ग्राहक जोड़ा जा रहा है...";

            // आईडी जेनरेट करने वाले ऑब्जेक्ट को मंगाए
            const idObj = await generateNextGdaId();
            if (!idObj) {
                throw new Error("GDA ID जेनरेट नहीं हो सकी।");
            }

            // 📅 आज की तारीख 'YYYY-MM-DD' फॉर्मेट में ऑटोमैटिक जनरेट करने के लिए
            const todayDate = new Date().toISOString().split('T')[0];

            // 'customers' कलेक्शन में डेटा सेव करना
            await addDoc(collection(db, "customers"), {
                member_id: idObj.member_id, // "GDA001", "GDA002" आदि
                member_no: idObj.member_no, // सॉर्टिंग नंबर
                name: name,
                mobile: mobile,
                address: address,
                loanAmount: loanAmount,
                loanPlan: selectedPlan,
                totalCollection: totalCollection,
                remainingAmount: totalCollection, 
                totalCollected: 0,
                emi: emi,
                paidDays: 0,
                status: "Active",
                customerPhoto: capturedImageData || null, 
                loanDate: todayDate, // 📅 यह लोन की तारीख को डेटाबेस में सेव करेगा
                createdAt: new Date().toISOString()
            });

            alert(`🎉 ग्राहक सफलतापूर्वक रजिस्टर हो गया है!\nMember ID: ${idObj.member_id}`);
            window.location.href = "customer-list.html"; 

        } catch (error) {
            console.error("कस्टमर सेव करने में तकनीकी एरर:", error);
            alert("⚠️ डेटाबेस में ग्राहक सुरक्षित नहीं हो सका।");
            saveBtn.disabled = false;
            saveBtn.innerText = "💾 ग्राहक सुरक्षित करें";
        }
    };
});
