// documents.js - फोटो अपलोड और फायरबेस मैनेजमेंट
import { db } from "./firebase.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const storage = getStorage();

// फोटो को कंप्रेस करने वाला फंक्शन
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
                const maxW = 1000; // फोटो की चौड़ाई फिक्स
                const scale = maxW / img.width;
                canvas.width = maxW;
                canvas.height = img.height * scale;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
            };
        };
    });
}

document.getElementById("uploadDocsBtn").onclick = async () => {
    const custId = new URLSearchParams(window.location.search).get('id');
    const aadharFile = document.getElementById("docAadharFile").files[0];
    const panFile = document.getElementById("docPanFile").files[0];

    if (!custId) return alert("Customer ID missing!");
    if (!aadharFile && !panFile) return alert("Select at least one file!");

    try {
        let updateData = {};
        
        // Aadhaar Upload
        if (aadharFile) {
            const compressedAadhar = await compressImage(aadharFile);
            const aadharRef = ref(storage, `client_documents/${custId}_aadhar.jpg`);
            await uploadBytes(aadharRef, compressedAadhar);
            updateData.aadharPhotoUrl = await getDownloadURL(aadharRef);
        }

        // PAN Upload
        if (panFile) {
            const compressedPan = await compressImage(panFile);
            const panRef = ref(storage, `client_documents/${custId}_pan.jpg`);
            await uploadBytes(panRef, compressedPan);
            updateData.panPhotoUrl = await getDownloadURL(panRef);
        }

        await updateDoc(doc(db, "customers", custId), updateData);
        alert("✅ Documents saved successfully!");
        window.location.href = "customer-list.html";
    } catch (error) {
        alert("⚠️ Error: " + error.message);
    }
};
