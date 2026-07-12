// ==========================================
// 🚀 GDA FINANCE - NEW CUSTOMER REGISTRATION & CAMERA COMPRESSION ENGINE (v12)
// ==========================================

import { db } from "./firebase.js"; 
import { 
    collection, 
    addDoc, 
    getDocs,
    updateDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

// Firebase Storage Engine Integration for Document Stream Capturing
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.jpg.js" // Fixed clean direct path handling
import { getStorage as initStorage } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

const storage = initStorage();

window.addEventListener('DOMContentLoaded', async () => {
    const registerForm = document.getElementById("registerForm") || document.getElementById("editForm");
    const saveBtn = document.getElementById("saveBtn");

    // 🇮🇳 Timezone Synchronizer (IST) Default Date setup - Format: YYYY-MM-DD
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const todayParts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date());
    const todayIST = `${todayParts.find(p => p.type === 'year').value}-${todayParts.find(p => p.type === 'month').value}-${todayParts.find(p => p.type === 'day').value}`;
    
    if (document.getElementById("loanDate")) {
        document.getElementById("loanDate").value = todayIST;
    }

    // 🗜️ Advanced Canvas Processing Engine for Image Compression
    function compressImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    const maxW = 1000; 
                    const scale = maxW / img.width;
                    canvas.width = maxW;
                    canvas.height = img.height * scale;
                    
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/jpeg', 0.7); 
                };
            };
        });
    }

    // 🆔 SMART FUNCTION: Auto-Recycle Purged Member IDs
    async function generateNextGdaId() {
        try {
            const querySnapshot = await getDocs(collection(db, "customers"));
            let existingNumbers = [];
            if (!querySnapshot.empty) {
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.member_no !== undefined) {
                        existingNumbers.push(parseInt(data.member_no, 10));
                    }
                });
            }
            existingNumbers.sort((a, b) => a - b);
            
            let nextNumber = 1;
            for (let i = 1; i <= existingNumbers.length + 1; i++) {
                if (!existingNumbers.includes(i)) {
                    nextNumber = i;
                    break;
                }
            }
            const formattedNumber = String(nextNumber).padStart(3, '0');
            return { member_id: `GDA${formattedNumber}`, member_no: nextNumber };
        } catch (error) {
            console.error("ID Generation Core Error:", error);
            return { member_id: "GDA001", member_no: 1 };
        }
    }

    // 💾 Master Sync Module: Record Submissions and File Storage Allocation
    if (registerForm) {
        registerForm.onsubmit = async (e) => {
            e.preventDefault();
            
            const name = document.getElementById("customerName").value.trim();
            const mobile = document.getElementById("mobileNumber").value.trim();
            const address = document.getElementById("address").value.trim();
            let photoUrlText = document.getElementById("customerPhoto") ? document.getElementById("customerPhoto").value.trim() : "";
            const aadhaar = document.getElementById("aadhaarNumber").value.trim();
            const pan = document.getElementById("panNumber").value.trim().toUpperCase();
            const loanAmount = Number(document.getElementById("loanAmount").value);
            const planDuration = Number(document.getElementById("loanPlan").value) || 60;
            const emi = Number(document.getElementById("emi").value);
            const loanDate = document.getElementById("loanDate").value;

            // Live Camera File Selector Objects
            const customerPhotoFileInput = document.getElementById("customerPhotoFile");
            const aadharFileInput = document.getElementById("docAadharFile");
            const panFileInput = document.getElementById("docPanFile");

            try {
                saveBtn.disabled = true;
                saveBtn.innerText = "⏳ Allocating ID & Registering Loan...";

                // 1. Get Next Recycled ID
                const idDetails = await generateNextGdaId();

                // 2. Build Base Payload Pipeline
                let newCustomerData = {
                    name,
                    mobile,
                    address,
                    customerPhoto: photoUrlText || null,
                    aadharCard: aadhaar,
                    aadhaar,
                    panCard: pan,
                    loanAmount,
                    planDuration,
                    duration: planDuration,
                    dailyEmi: emi,
                    emi,
                    totalCollection: loanAmount + (loanAmount * 0.20), 
                    remainingAmount: loanAmount + (loanAmount * 0.20),
                    paidAmount: 0,
                    paidDays: 0,
                    loanDate,
                    status: "Active",
                    customerCode: idDetails.member_id,
                    member_no: idDetails.member_no,
                    createdAt: todayIST
                };

                // 3. Document Insertion Initial Handshake
                const docRef = await addDoc(collection(db, "customers"), newCustomerData);
                const generatedId = docRef.id;

                let mediaPayload = {};

                // A. Upload Live Profile Picture Stream (Front Camera Capture)
                if (customerPhotoFileInput && customerPhotoFileInput.files.length > 0) {
                    saveBtn.innerText = "⏳ Compressing & Uploading Profile Photo...";
                    const compressedBlob = await compressImage(customerPhotoFileInput.files[0]);
                    const storageRef = ref(storage, `client_photos/${generatedId}_profile.jpg`);
                    await uploadBytes(storageRef, compressedBlob);
                    mediaPayload.customerPhoto = await getDownloadURL(storageRef);
                }

                // B. Upload Live Aadhaar Capture Stream
                if (aadharFileInput && aadharFileInput.files.length > 0) {
                    saveBtn.innerText = "⏳ Compressing & Uploading Aadhaar...";
                    const compressedBlob = await compressImage(aadharFileInput.files[0]);
                    const storageRef = ref(storage, `client_documents/${generatedId}_aadhar.jpg`);
                    await uploadBytes(storageRef, compressedBlob);
                    mediaPayload.aadharPhotoUrl = await getDownloadURL(storageRef);
                }

                // C. Upload Live PAN Capture Stream
                if (panFileInput && panFileInput.files.length > 0) {
                    saveBtn.innerText = "⏳ Compressing & Uploading PAN Card...";
                    const compressedBlob = await compressImage(panFileInput.files[0]);
                    const storageRef = ref(storage, `client_documents/${generatedId}_pan.jpg`);
                    await uploadBytes(storageRef, compressedBlob);
                    mediaPayload.panPhotoUrl = await getDownloadURL(storageRef);
                }

                // Update Master Customer Document if Multimedia Streams Exist
                if (Object.keys(mediaPayload).length > 0) {
                    await updateDoc(doc(db, "customers", generatedId), mediaPayload);
                }

                alert(`🎉 Customer ${idDetails.member_id} Registered Successfully!`);
                
                // Redirect straight to digital agreement bond view
                window.location.href = `disbursement-bond.html?id=${generatedId}`;

            } catch (error) {
                console.error("Registration Pipeline Processing Failure: ", error);
                alert("⚠️ System Registry Error: " + error.message);
                saveBtn.disabled = false;
                saveBtn.innerText = "💾 Register & Disburse Loan";
            }
        };
    }
});
