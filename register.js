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

// 📸 फायरबेस स्टोरेज इम्पोर्ट (लाइव डॉक्यूमेंट अपलोड के लिए)
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

const storage = getStorage();

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

    // 🗜️ मोबाइल कैमरे की भारी फोटो को कंप्रेस (छोटा) करने का एडवांस फंक्शन
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
                    
                    const maxW = 1000; // अधिकतम चौड़ाई 1000px
                    const scale = maxW / img.width;
                    canvas.width = maxW;
                    canvas.height = img.height * scale;
                    
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/jpeg', 0.7); // 70% क्वालिटी पर कंप्रेस
                };
            };
        });
    }

    // 🆔 SMART FUNCTION: डिलीट की हुई आईडी को ऑटोमैटिक री-साइकिल करना
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
            console.error("ID Generation Error:", error);
            return { member_id: "GDA001", member_no: 1 };
        }
    }

    // 💾 नया लोन वितरण और ग्राहक सेव करने का मास्टर बटन लॉजिक
    if (registerForm) {
        registerForm.onsubmit = async (e) => {
            e.preventDefault();
            
            const name = document.getElementById("customerName").value.trim();
            const mobile = document.getElementById("mobileNumber").value.trim();
            const address = document.getElementById("address").value.trim();
            const photo = document.getElementById("customerPhoto") ? document.getElementById("customerPhoto").value.trim() : "";
            const aadhaar = document.getElementById("aadhaarNumber").value.trim();
            const pan = document.getElementById("panNumber").value.trim().toUpperCase();
            const loanAmount = Number(document.getElementById("loanAmount").value);
            const planDuration = Number(document.getElementById("loanPlan").value) || 60;
            const emi = Number(document.getElementById("emi").value);
            const loanDate = document.getElementById("loanDate").value;

            // HTML कैमरा इनपुट फाइल्स उठाना
            const aadharFileInput = document.getElementById("docAadharFile");
            const panFileInput = document.getElementById("docPanFile");

            try {
                saveBtn.disabled = true;
                saveBtn.innerText = "⏳ Allocating ID & Registering Loan...";

                // 1. री-साइकिल सिस्टम से अगली उपलब्ध आईडी प्राप्त करना
                const idDetails = await generateNextGdaId();

                // 2. नया कस्टमर बेस पेलोड बनाना
                let newCustomerData = {
                    name,
                    mobile,
                    address,
                    customerPhoto: photo || null,
                    aadharCard: aadhaar,
                    aadhaar,
                    panCard: pan,
                    loanAmount,
                    planDuration,
                    duration: planDuration,
                    dailyEmi: emi,
                    emi,
                    totalCollection: loanAmount + (loanAmount * 0.20), // 20% ब्याज जोड़कर
                    remainingAmount: loanAmount + (loanAmount * 0.20),
                    paidAmount: 0,
                    paidDays: 0,
                    loanDate,
                    status: "Active",
                    customerCode: idDetails.member_id,
                    member_no: idDetails.member_no,
                    createdAt: todayIST
                };

                // 3. डेटाबेस (Firestore) में डाक्यूमेंट्स इंसर्ट करना
                const docRef = await addDoc(collection(db, "customers"), newCustomerData);
                const generatedId = docRef.id;

                let mediaPayload = {};

                // A. अगर आधार की लाइव फोटो खींची गई है, तो कंप्रेस करके अपलोड करें
                if (aadharFileInput && aadharFileInput.files.length > 0) {
                    saveBtn.innerText = "⏳ Compressing & Uploading Aadhaar...";
                    const compressedBlob = await compressImage(aadharFileInput.files[0]);
                    const storageRef = ref(storage, `client_documents/${generatedId}_aadhar.jpg`);
                    await uploadBytes(storageRef, compressedBlob);
                    mediaPayload.aadharPhotoUrl = await getDownloadURL(storageRef);
                }

                // B. अगर पैन/वोटर कार्ड की लाइव फोटो खींची गई है, तो कंप्रेस करके अपलोड करें
                if (panFileInput && panFileInput.files.length > 0) {
                    saveBtn.innerText = "⏳ Compressing & Uploading PAN Card...";
                    const compressedBlob = await compressImage(panFileInput.files[0]);
                    const storageRef = ref(storage, `client_documents/${generatedId}_pan.jpg`);
                    await uploadBytes(storageRef, compressedBlob);
                    mediaPayload.panPhotoUrl = await getDownloadURL(storageRef);
                }

                // अगर फोटो अपलोड हुई हैं, तो कस्टमर रिकॉर्ड को मीडिया लिंक्स के साथ अपडेट करना
                if (Object.keys(mediaPayload).length > 0) {
                    await updateDoc(doc(db, "customers", generatedId), mediaPayload);
                }

                alert(`🎉 Customer ${idDetails.member_id} Registered Successfully!`);
                
                // 🚀 जादुई रीडायरेक्ट: सीधे आपके नए लोन बॉन्ड पेपर पर ट्रांसफर करना
                window.location.href = `disbursement-bond.html?id=${generatedId}`;

            } catch (error) {
                console.error("Registration Process Failed: ", error);
                alert("⚠️ System Error: " + error.message);
                saveBtn.disabled = false;
                saveBtn.innerText = "💾 Register & Disburse Loan";
            }
        };
    }
});
