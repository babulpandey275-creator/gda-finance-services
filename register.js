import { db } from "./firebase.js"; 
import { collection, addDoc, updateDoc, doc, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

const storage = getStorage();

window.addEventListener('DOMContentLoaded', async () => {
    const registerForm = document.getElementById("registerForm");
    const saveBtn = document.getElementById("saveBtn");

    // 🇮🇳 IST Current Date Setup
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const todayParts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date());
    const todayIST = `${todayParts.find(p => p.type === 'year').value}-${todayParts.find(p => p.type === 'month').value}-${todayParts.find(p => p.type === 'day').value}`;
    
    if (document.getElementById("loanDate")) {
        document.getElementById("loanDate").value = todayIST;
    }

    // Smart Recycled ID Generation
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
                if (!existingNumbers.includes(i)) {
                    nextNumber = i;
                    break;
                }
            }
            return { member_id: `GDA${String(nextNumber).padStart(3, '0')}`, member_no: nextNumber };
        } catch (error) {
            return { member_id: "GDA001", member_no: 1 };
        }
    }

    if (registerForm) {
        registerForm.onsubmit = async (e) => {
            e.preventDefault();
            saveBtn.disabled = true;
            saveBtn.innerText = "⏳ Saving Data...";

            try {
                const idDetails = await generateNextGdaId();
                const loanAmount = Number(document.getElementById("loanAmount").value);
                const planDuration = Number(document.getElementById("loanPlan")?.value) || 60;
                const emi = Number(document.getElementById("emi").value);

                const data = {
                    name: document.getElementById("customerName").value.trim(),
                    mobile: document.getElementById("mobileNumber").value.trim(),
                    address: document.getElementById("address") ? document.getElementById("address").value.trim() : "",
                    aadharCard: document.getElementById("aadhaarNumber") ? document.getElementById("aadhaarNumber").value.trim() : "",
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
                    createdAt: todayIST
                };

                // Save initial payload
                const docRef = await addDoc(collection(db, "customers"), data);
                let mediaPayload = {};

                // A. Customer Photo File Handle (Fixed Backticks Error)
                const photoInput = document.getElementById("customerPhotoFile");
                if (photoInput && photoInput.files.length > 0) {
                    const storageRef = ref(storage, `photos/${docRef.id}.jpg`);
                    await uploadBytes(storageRef, photoInput.files[0]);
                    mediaPayload.customerPhoto = await getDownloadURL(storageRef);
                }

                // B. Aadhaar Document File Handle
                const aadharInput = document.getElementById("docAadharFile");
                if (aadharInput && aadharInput.files.length > 0) {
                    const storageRef = ref(storage, `documents/${docRef.id}_aadhar.jpg`);
                    await uploadBytes(storageRef, aadharInput.files[0]);
                    mediaPayload.aadharPhotoUrl = await getDownloadURL(storageRef);
                }

                // Update database if media files exist
                if (Object.keys(mediaPayload).length > 0) {
                    await updateDoc(doc(db, "customers", docRef.id), mediaPayload);
                }

                alert(`🎉 Customer ${idDetails.member_id} Registered Successfully!`);
                window.location.href = `disbursement-bond.html?id=${docRef.id}`;
            } catch (err) {
                console.error("Submission failed:", err);
                alert("Error: " + err.message);
                saveBtn.disabled = false;
                saveBtn.innerText = "Save";
            }
        };
    }
});
