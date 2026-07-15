
import { db } from "./firebase.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const storage = getStorage();

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
            const aadharRef = ref(storage, `client_documents/${custId}_aadhar.jpg`);
            await uploadBytes(aadharRef, aadharFile);
            updateData.aadharPhotoUrl = await getDownloadURL(aadharRef);
        }

        // PAN Upload
        if (panFile) {
            const panRef = ref(storage, `client_documents/${custId}_pan.jpg`);
            await uploadBytes(panRef, panFile);
            updateData.panPhotoUrl = await getDownloadURL(panRef);
        }

        await updateDoc(doc(db, "customers", custId), updateData);
        alert("✅ Documents saved successfully!");
        window.location.href = "customer-list.html";
    } catch (error) {
        alert("⚠️ Error: " + error.message);
    }
};
