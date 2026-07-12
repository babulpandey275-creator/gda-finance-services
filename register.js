import { db } from "./firebase.js"; 
import { collection, addDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

const storage = getStorage();

window.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById("registerForm");
    const saveBtn = document.getElementById("saveBtn");

    if (registerForm) {
        registerForm.onsubmit = async (e) => {
            e.preventDefault();
            saveBtn.disabled = true;
            saveBtn.innerText = "⏳ Saving Data...";

            try {
                const data = {
                    name: document.getElementById("customerName").value,
                    mobile: document.getElementById("mobileNumber").value,
                    loanAmount: Number(document.getElementById("loanAmount").value),
                    dailyEmi: Number(document.getElementById("emi").value),
                    loanDate: document.getElementById("loanDate").value,
                    status: "Active",
                    createdAt: new Date().toISOString().split('T')[0]
                };

                // Create document first
                const docRef = await addDoc(collection(db, "customers"), data);
                
                // Optional File Handling
                const photoInput = document.getElementById("customerPhotoFile");
                if (photoInput && photoInput.files.length > 0) {
                    const storageRef = ref(storage, `photos/${docRef.id}.jpg`);
                    await uploadBytes(storageRef, photoInput.files[0]);
                    const url = await getDownloadURL(storageRef);
                    await updateDoc(docRef, { photoUrl: url });
                }

                alert("Successfully Registered!");
                window.location.href = "index.html";
            } catch (err) {
                alert("Error: " + err.message);
                saveBtn.disabled = false;
                saveBtn.innerText = "Save";
            }
        };
    }
});
