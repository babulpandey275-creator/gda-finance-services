import { db } from "./firebase.js"; 
import { collection, addDoc, updateDoc, doc, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 
import { getStorage, ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

const storage = getStorage();

window.addEventListener('DOMContentLoaded', async () => {
    const registerForm = document.getElementById("registerForm");
    const saveBtn = document.getElementById("saveBtn");
    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    const captureBtn = document.getElementById("captureBtn");
    const reTakeBtn = document.getElementById("reTakeBtn");

    let streamInstance = null;
    let capturedBlobUri = null; // Base64 Data Holder

    // 🇮🇳 Timezone Synchronizer (IST) Date Setup
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const todayParts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date());
    const todayIST = `${todayParts.find(p => p.type === 'year').value}-${todayParts.find(p => p.type === 'month').value}-${todayParts.find(p => p.type === 'day').value}`;
    
    if (document.getElementById("loanDate")) {
        document.getElementById("loanDate").value = todayIST;
    }

    // 📸 SELFIE/FRONT CAMERA ONLY START LOGIC
    async function startSelfieCamera() {
        try {
            if (streamInstance) {
                streamInstance.getTracks().forEach(track => track.stop());
            }
            // Strict facingMode set to 'user' to enforce front camera activation
            streamInstance = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" },
                audio: false
            });
            if (video) {
                video.srcObject = streamInstance;
            }
        } catch (err) {
            console.error("Camera access failed:", err);
        }
    }

    // Capture Image Action
    if (captureBtn && video && canvas) {
        captureBtn.onclick = () => {
            const ctx = canvas.getContext('2d');
            canvas.width = video.videoWidth || 480;
            canvas.height = video.videoHeight || 640;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            capturedBlobUri = canvas.toDataURL('image/jpeg', 0.7); // Compressed to 70% quality base64
            
            video.style.display = "none";
            canvas.style.display = "block";
            captureBtn.style.display = "none";
            if (reTakeBtn) reTakeBtn.style.display = "block";
        };
    }

    // Retake Action
    if (reTakeBtn && video && canvas && captureBtn) {
        reTakeBtn.onclick = () => {
            capturedBlobUri = null;
            canvas.style.display = "none";
            video.style.display = "block";
            reTakeBtn.style.display = "none";
            captureBtn.style.display = "block";
        };
    }

    // Dynamic Interest and EMI Autocalculator
    const loanAmountInput = document.getElementById("loanAmount");
    const loanPlanSelect = document.getElementById("loanPlan");
    const remainingAmountInput = document.getElementById("remainingAmount");
    const emiInput = document.getElementById("emi");

    function calculateFinance() {
        const amt = Number(loanAmountInput.value) || 0;
        const days = Number(loanPlanSelect.value) || 60;
        if (amt > 0) {
            const total = amt + (amt * 0.20);
            const daily = total / days;
            if (remainingAmountInput) remainingAmountInput.value = Math.round(total);
            if (emiInput) emiInput.value = Math.round(daily);
        }
    }

    if (loanAmountInput) loanAmountInput.oninput = calculateFinance;
    if (loanPlanSelect) loanPlanSelect.onchange = calculateFinance;

    // Smart Recycled ID Generation Loop
    async function generateNextGdaId() {
        try {
            const querySnapshot = await getDocs(collection(db, "customers"));
            let existingNumbers = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.member_no !== undefined) {
                    existingNumbers.push(parseInt(data.member_no, 10));
                }
            });
            existingNumbers.sort((a, b) => a - b);
            
            let nextNumber = 1;
            for (let i = 1; i <= existingNumbers.length + 1; i++) {
                if (!existingNumbers.includes(i)) { nextNumber = i; break; }
            }
            return { member_id: `GDA${String(nextNumber).padStart(3, '0')}`, member_no: nextNumber };
        } catch (error) {
            return { member_id: "GDA001", member_no: 1 };
        }
    }

    // Save Customer Data Form Trigger
    if (saveBtn) {
        saveBtn.onclick = async (e) => {
            e.preventDefault();
            saveBtn.disabled = true;
            saveBtn.innerText = "⏳ Saving Data...";

            try {
                const idDetails = await generateNextGdaId();
                const loanAmount = Number(document.getElementById("loanAmount").value);
                const planDuration = Number(document.getElementById("loanPlan").value) || 60;
                const emi = Number(document.getElementById("emi").value);

                const newCustomerData = {
                    name: document.getElementById("customerName").value.trim(),
                    mobile: document.getElementById("mobileNumber").value.trim(),
                    address: document.getElementById("address").value.trim(),
                    aadharCard: document.getElementById("aadhaarNumber").value.trim(),
                    aadhaar: document.getElementById("aadhaarNumber").value.trim(),
                    panCard: document.getElementById("panNumber") ? document.getElementById("panNumber").value.trim().toUpperCase() : "",
                    loanAmount: loanAmount,
                    planDuration: planDuration,
                    duration: planDuration,
                    dailyEmi: emi,
                    emi: emi,
                    totalCollection: loanAmount + (loanAmount * 0.20),
                    remainingAmount: loanAmount + (loanAmount * 0.20),
                    paidAmount: 0,
                    paidDays: 0,
                    loanDate: document.getElementById("loanDate").value,
                    status: "Active",
                    customerCode: idDetails.member_id,
                    member_no: idDetails.member_no,
                    createdAt: todayIST,
                    customerPhoto: null
                };

                // Add document first
                const docRef = await addDoc(collection(db, "customers"), newCustomerData);

                // If selfie image string is available, upload to storage bucket
                if (capturedBlobUri) {
                    saveBtn.innerText = "⏳ Uploading Selfie Picture...";
                    const storageRef = ref(storage, `photos/${docRef.id}.jpg`);
                    await uploadString(storageRef, capturedBlobUri, 'data_url');
                    const downloadUrl = await getDownloadURL(storageRef);
                    await updateDoc(doc(db, "customers", docRef.id), { customerPhoto: downloadUrl });
                }

                if (streamInstance) {
                    streamInstance.getTracks().forEach(track => track.stop());
                }

                alert(`🎉 Customer ${idDetails.member_id} Registered Successfully!`);
                window.location.href = `disbursement-bond.html?id=${docRef.id}`;
            } catch (err) {
                console.error("Submission crash: ", err);
                alert("Error: " + err.message);
                saveBtn.disabled = false;
                saveBtn.innerText = "💰 Save Customer";
            }
        };
    }

    await startSelfieCamera();
});
