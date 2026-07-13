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
    let capturedBlobUri = null; 

    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const todayParts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date());
    const todayIST = `${todayParts.find(p => p.type === 'year').value}-${todayParts.find(p => p.type === 'month').value}-${todayParts.find(p => p.type === 'day').value}`;
    
    if (document.getElementById("loanDate")) {
        document.getElementById("loanDate").value = todayIST;
    }

    // 📸 REAR/BACK CAMERA ONLY START LOGIC
    async function startRearCamera() {
        try {
            if (streamInstance) {
                streamInstance.getTracks().forEach(track => track.stop());
            }
            streamInstance = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { exact: "environment" } },
                audio: false
            }).catch(async () => {
                return await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" },
                    audio: false
                });
            });
            
            if (video) {
                video.srcObject = streamInstance;
            }
        } catch (err) {
            console.error("Rear camera activation failure:", err);
        }
    }

    if (captureBtn && video && canvas) {
        captureBtn.onclick = () => {
            const ctx = canvas.getContext('2d');
            
            // 🎯 ULTRA COMPRESSION FIX: आयामी साइज़ को छोटा (320x240) किया ताकि KB बहुत कम हो जाए
            canvas.width = 320;
            canvas.height = 240;
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Quality scale को 0.4 पर सेट किया जिससे फ़ोटो 30-40 KB में बदल जाएगी
            capturedBlobUri = canvas.toDataURL('image/jpeg', 0.4); 
            
            video.style.display = "none";
            canvas.style.display = "block";
            captureBtn.style.display = "none";
            if (reTakeBtn) reTakeBtn.style.display = "block";
        };
    }

    if (reTakeBtn && video && canvas && captureBtn) {
        reTakeBtn.onclick = () => {
            capturedBlobUri = null;
            canvas.style.display = "none";
            video.style.display = "block";
            reTakeBtn.style.display = "none";
            captureBtn.style.display = "block";
        };
    }

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

    // 💾 DIRECT SUBMISSION ROUTINE (SAFE & FIX FOR MOBILE LOCKING)
    if (saveBtn) {
        saveBtn.onclick = async (e) => {
            e.preventDefault();
            
            const name = document.getElementById("customerName").value.trim();
            const mobile = document.getElementById("mobileNumber").value.trim();
            const address = document.getElementById("address").value.trim();
            const aadhaar = document.getElementById("aadhaarNumber").value.trim();

            if (!name || !mobile || !address || !aadhaar || !loanAmountInput.value) {
                alert("Please fill out all mandatory fields.");
                return;
            }

            if (!capturedBlobUri) {
                alert("⚠️ Customer verification photo is mandatory!");
                return;
            }

            saveBtn.disabled = true;
            saveBtn.innerText = "⏳ Saving Data...";

            try {
                const idDetails = await generateNextGdaId();
                const loanAmount = Number(loanAmountInput.value);
                const planDuration = Number(loanPlanSelect.value) || 60;
                const emi = Number(emiInput.value) || Math.round((loanAmount + (loanAmount * 0.20)) / planDuration);

                const newCustomerData = {
                    name: name,
                    mobile: mobile,
                    address: address,
                    aadharCard: "[Aadhaar Redacted]",
                    aadhaar: "[Aadhaar Redacted]",
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

                const docRef = await addDoc(collection(db, "customers"), newCustomerData);

                saveBtn.innerText = "⏳ Uploading Photo...";
                const storageRef = ref(storage, `photos/${docRef.id}.jpg`);
                await uploadString(storageRef, capturedBlobUri, 'data_url');
                const downloadUrl = await getDownloadURL(storageRef);
                await updateDoc(doc(db, "customers", docRef.id), { customerPhoto: downloadUrl });

                if (streamInstance) {
                    streamInstance.getTracks().forEach(track => track.stop());
                }

                alert(`🎉 Customer ${idDetails.member_id} Registered Successfully!`);
                window.location.href = `disbursement-bond.html?id=${docRef.id}`;
            } catch (err) {
                alert("Error: " + err.message);
                saveBtn.disabled = false;
                saveBtn.innerText = "💰 Disburse Loan & Save";
            }
        };
    }

    await startRearCamera();
});
