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

// Firebase Storage Engine Integration for Document Stream Capturing
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
        alert("Customer validation parameter not found!");
        window.location.href = "customer-list.html";
        return;
    }

    // 🔐 Admin Security Access Gate
    const adminPassword = prompt("🔐 Security Lock: Enter Admin Password to Edit Records:");
    if (adminPassword !== "GDA@2026") {
        alert("❌ Access Denied! Incorrect administrative credentials.");
        window.location.href = "customer-list.html";
        return;
    }

    // Load Existing Profile Data Stream from Database
    async function loadCustomerData() {
        try {
            const docSnap = await getDoc(doc(db, "customers", custId));
            if (!docSnap.exists()) {
                alert("Customer ledger profile not found in system storage!");
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
            console.error("Data fetch exception: ", err);
            alert("⚠️ Synchronization Error loading customer records.");
        }
    }
    await loadCustomerData();

    // 🗜️ Mathematical Canvas Processing Engine for Image Compression
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
                    }, 'image/jpeg', 0.7); // Compression metrics scaled to 70% bounds
                };
            };
        });
    }

    // 💾 Master Sync Module: Record Updates and File Storage Engine
    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) {
        saveBtn.onclick = async (e) => {
            e.preventDefault();
            
            const name = document.getElementById("customerName").value.trim();
            const mobile = document.getElementById("mobileNumber").value.trim();
            const address = document.getElementById("address").value.trim();
            let photoUrlText = document.getElementById("customerPhoto").value.trim();
            const aadhaar = document.getElementById("aadhaarNumber").value.trim();
            const pan = document.getElementById("panNumber").value.trim().toUpperCase();
            const loanAmount = Number(document.getElementById("loanAmount").value);
            const planDuration = Number(document.getElementById("loanPlan").value);
            const emi = Number(document.getElementById("emi").value);
            const loanDate = document.getElementById("loanDate").value;

            // Live Camera File Selector Objects
            const customerPhotoFileInput = document.getElementById("customerPhotoFile");
            const aadharFileInput = document.getElementById("docAadharFile");
            const panFileInput = document.getElementById("docPanFile");

            try {
                saveBtn.disabled = true;
                saveBtn.innerText = "⏳ Uploading Documents & Saving...";

                // A. Process Live Customer Profile Picture (Front Camera)
                if (customerPhotoFileInput && customerPhotoFileInput.files.length > 0) {
                    const compressedBlob = await compressImage(customerPhotoFileInput.files[0]);
                    const storageRef = ref(storage, `client_photos/${custId}_profile.jpg`);
                    await uploadBytes(storageRef, compressedBlob);
                    photoUrlText = await getDownloadURL(storageRef);
                }

                let updatePayload = {
                    name, mobile, address, customerPhoto: photoUrlText || null, aadharCard: aadhaar, aadhaar, panCard: pan,
                    loanAmount, planDuration, duration: planDuration, dailyEmi: emi, emi, 
                    totalCollection: loanAmount + (loanAmount * 0.20), loanDate
                };

                // B. Process Live Aadhaar Capture Stream
                if (aadharFileInput && aadharFileInput.files.length > 0) {
                    const compressedBlob = await compressImage(aadharFileInput.files[0]);
                    const storageRef = ref(storage, `client_documents/${custId}_aadhar.jpg`);
                    await uploadBytes(storageRef, compressedBlob);
                    const downloadUrl = await getDownloadURL(storageRef);
                    updatePayload.aadharPhotoUrl = downloadUrl;
                }

                // C. Process Live PAN Capture Stream
                if (panFileInput && panFileInput.files.length > 0) {
                    const compressedBlob = await compressImage(panFileInput.files[0]);
                    const storageRef = ref(storage, `client_documents/${custId}_pan.jpg`);
                    await uploadBytes(storageRef, compressedBlob);
                    const downloadUrl = await getDownloadURL(storageRef);
                    updatePayload.panPhotoUrl = downloadUrl;
                }

                // Execute Final Update Push to Firestore Cloud Instance
                await updateDoc(doc(db, "customers", custId), updatePayload);
                
                alert("🎉 Customer records and multimedia documents synchronized successfully!");
                window.location.href = "customer-list.html";
                
            } catch (error) {
                console.error("Runtime commit rejection: ", error);
                alert("⚠️ Update Process Rejected: " + error.message);
                saveBtn.disabled = false;
                saveBtn.innerText = "💾 Update & Save Records";
            }
        };
    }

    // 🗑️ Master Purge System Action
    const deleteBtn = document.getElementById("deleteBtn");
    if (deleteBtn) {
        deleteBtn.onclick = async (e) => {
            e.preventDefault();
            
            if (!confirm("🚨 Critical System Warning! Are you sure you want to permanently delete this customer? This will wipe out all tracking ledgers and historical records!")) return;
            
            try {
                deleteBtn.disabled = true;
                
                // Clear linked collections logs sub-streams
                const q = query(collection(db, "collections"), where("customerId", "==", custId));
                const querySnapshot = await getDocs(q);
                const deletePromises = [];
                querySnapshot.forEach((cDoc) => deletePromises.push(deleteDoc(doc(db, "collections", cDoc.id))));
                await Promise.all(deletePromises);
                
                // Pure master record removal execution
                await deleteDoc(doc(db, "customers", custId));
                
                alert("🗑️ Profile architecture and associated files purged successfully.");
                window.location.href = "customer-list.html";
                
            } catch (error) {
                console.error("Purge failure exception: ", error);
                alert("⚠️ System error encountered during data purge.");
                deleteBtn.disabled = false;
            }
        };
    }
});
