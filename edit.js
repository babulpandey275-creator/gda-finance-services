// ==========================================
// 🚀 GDA FINANCE - LOAN ID GENERATOR & TIME-BASED REAL REPORT SCRIPT (v12)
// ==========================================

import { db } from "./firebase.js"; 
import { 
    doc, 
    getDoc, 
    updateDoc, 
    deleteDoc, 
    collection, 
    query, 
    where, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

// 📸 फायरबेस स्टोरेज इम्पोर्ट (कैमरा डॉक्यूमेंट अपलोड के लिए)
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

const storage = getStorage();

window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const custId = urlParams.get('id');

    if (!custId) {
        alert("Customer ID not found!");
        window.location.href = "customer-list.html";
        return;
    }

    // 🔐 Admin Security Lock Gate
    const adminPassword = prompt("🔐 Security Lock: Enter Admin Password to Edit Records:");
    if (adminPassword !== "GDA@2026") {
        alert("❌ Access Denied! Incorrect Password.");
        window.location.href = "customer-list.html";
        return;
    }

    // 🔄 डेटाबेस से ग्राहक का पुराना डेटा लोड करना
    async function loadCustomerData() {
        try {
            const docSnap = await getDoc(doc(db, "customers", custId));
            if (!docSnap.exists()) {
                alert("Customer record not found in database!");
                window.location.href = "customer-list.html";
                return;
            }
            const cust = docSnap.data();
            
            if(document.getElementById("customerName")) document.getElementById("customerName").value = cust.name || "";
            if(document.getElementById("mobileNumber")) document.getElementById("mobileNumber").value = cust.mobile || "";
            if(document.getElementById("address")) document.getElementById("address").value = cust.address || "";
            if(document.getElementById("customerPhoto")) document.getElementById("customerPhoto").value = cust.customerPhoto || "";
            if(document.getElementById("aadhaarNumber")) document.getElementById("aadhaarNumber").value = cust.aadharCard || cust.aadhaar || "";
            if(document.getElementById("panNumber")) document.getElementById("panNumber").value = cust.panCard || "";
            if(document.getElementById("loanAmount")) document.getElementById("loanAmount").value = cust.loanAmount || "";
            if(document.getElementById("loanPlan")) document.getElementById("loanPlan").value = cust.planDuration || "";
            if(document.getElementById("emi")) document.getElementById("emi").value = cust.dailyEmi || cust.emi || "";
            if(document.getElementById("loanDate")) document.getElementById("loanDate").value = cust.loanDate || "";
            
        } catch (err) {
            console.error(err);
            alert("⚠️ Error loading customer records.");
        }
    }
    await loadCustomerData();

    // 🗜️ मोबाइल कैमरे की भारी फोटो को कंप्रेस (छोटा) करने का फंक्शन
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
                    
                    // अधिकतम चौड़ाई 1000px सेट करके साइज कंट्रोल करना
                    const maxW = 1000;
                    const scale = maxW / img.width;
                    canvas.width = maxW;
                    canvas.height = img.height * scale;
                    
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    // 0.7 क्वालिटी यानी फोटो का साइज 80% तक छोटा हो जाएगा
                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/jpeg', 0.7);
                };
            };
        });
    }

    // 💾 रिकॉर्ड अपडेट और फोटो सुरक्षित सेव करने का बटन लॉजिक
    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) {
        saveBtn.onclick = async (e) => {
            e.preventDefault();
            
            const name = document.getElementById("customerName").value.trim();
            const mobile = document.getElementById("mobileNumber").value.trim();
            const address = document.getElementById("address").value.trim();
            const photo = document.getElementById("customerPhoto").value.trim();
            const aadhaar = document.getElementById("aadhaarNumber").value.trim();
            const pan = document.getElementById("panNumber").value.trim().toUpperCase();
            const loanAmount = Number(document.getElementById("loanAmount").value);
            const planDuration = Number(document.getElementById("loanPlan").value);
            const emi = Number(document.getElementById("emi").value);
            const loanDate = document.getElementById("loanDate").value;

            // HTML कैमरा इनपुट एलिमेंट्स उठाना
            const aadharFileInput = document.getElementById("docAadharFile");
            const panFileInput = document.getElementById("docPanFile");

            try {
                saveBtn.disabled = true;
                saveBtn.innerText = "⏳ Uploading Documents & Saving...";

                let updatePayload = {
                    name, mobile, address, customerPhoto: photo || null, aadharCard: aadhaar, aadhaar, panCard: pan,
                    loanAmount, planDuration, duration: planDuration, dailyEmi: emi, emi, 
                    totalCollection: loanAmount + (loanAmount * 0.20), loanDate
                };

                // A. अगर आधार की लाइव फोटो खींची गई है, तो उसे कंप्रेस करके अपलोड करें
                if (aadharFileInput && aadharFileInput.files.length > 0) {
                    const compressedBlob = await compressImage(aadharFileInput.files[0]);
                    const storageRef = ref(storage, `client_documents/${custId}_aadhar.jpg`);
                    await uploadBytes(storageRef, compressedBlob);
                    const downloadUrl = await getDownloadURL(storageRef);
                    updatePayload.aadharPhotoUrl = downloadUrl; // डेटाबेस में लिंक सुरक्षित ऐड
                }

                // B. अगर पैन/वोटर कार्ड की लाइव फोटो खींची गई है, तो उसे कंप्रेस करके अपलोड करें
                if (panFileInput && panFileInput.files.length > 0) {
                    const compressedBlob = await compressImage(panFileInput.files[0]);
                    const storageRef = ref(storage, `client_documents/${custId}_pan.jpg`);
                    await uploadBytes(storageRef, compressedBlob);
                    const downloadUrl = await getDownloadURL(storageRef);
                    updatePayload.panPhotoUrl = downloadUrl; // डेटाबेस में लिंक सुरक्षित ऐड
                }

                // फाइनल मास्टर डेटाबेस को अपडेट फायर करना
                await updateDoc(doc(db, "customers", custId), updatePayload);
                
                alert("🎉 Customer records and documents updated successfully!");
                window.location.href = "customer-list.html";
                
            } catch (error) {
                console.error(error);
                alert("⚠️ Update Process Failed: " + error.message);
                saveBtn.disabled = false;
                saveBtn.innerText = "💾 Update & Save Records";
            }
        };
    }

    // 🗑️ ग्राहक का पूरा इतिहास एक क्लिक में डिलीट करने का मास्टर एक्शन
    const deleteBtn = document.getElementById("deleteBtn");
    if (deleteBtn) {
        deleteBtn.onclick = async (e) => {
            e.preventDefault();
            
            if (!confirm("🚨 Warning! Are you sure you want to permanently delete this customer? This will wipe out all EMI collection history logs!")) return;
            
            try {
                deleteBtn.disabled = true;
                
                // ग्राहक की पूरी किस्त हिस्ट्री (collections) साफ करना
                const q = query(collection(db, "collections"), where("customerId", "==", custId));
                const querySnapshot = await getDocs(q);
                const deletePromises = [];
                querySnapshot.forEach((cDoc) => deletePromises.push(deleteDoc(doc(db, "collections", cDoc.id))));
                await Promise.all(deletePromises);
                
                // मास्टर कस्टमर रिकॉर्ड डिलीट करना
                await deleteDoc(doc(db, "customers", custId));
                
                alert("🗑️ Customer profile and history logs cleared from systems!");
                window.location.href = "customer-list.html";
                
            } catch (error) {
                console.error(error);
                alert("⚠️ Deletion Error occurred.");
                deleteBtn.disabled = false;
            }
        };
    }
});
