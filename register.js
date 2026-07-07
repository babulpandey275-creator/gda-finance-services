import { db } from "./firebase.js"; 
import { collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const saveBtn = document.getElementById("saveBtn"); 

saveBtn.addEventListener("click", async () => { 
    const name = document.getElementById("name").value.trim(); 
    const mobile = document.getElementById("mobile").value.trim(); 
    const idNumber = document.getElementById("idNumber").value.trim(); 
    const address = document.getElementById("address").value.trim(); 
    const loan = Number(document.getElementById("loan").value); 
    const emi = Number(document.getElementById("emi").value); 
    const days = Number(document.getElementById("days").value); 
    const loanDate = document.getElementById("loanDate").value; 
    const status = document.getElementById("status").value; 

    // HTML स्क्रिप्ट से वैश्विक फोटो वेरिएबल प्राप्त करना
    const photoData = window.imageBase64 || ""; 

    // 1. बुनियादी वैलिडेशन चेक
    if ( !name || !mobile || !idNumber || !address || !loan || !emi || !days || !loanDate ) { 
        alert("⚠️ कृपया सभी जानकारी (आधार संख्या सहित) सही-सही भरें"); 
        return; 
    } 

    // 2. मोबाइल नंबर वैलिडेशन (10 अंक)
    if (mobile.length !== 10 || isNaN(mobile)) { 
        alert("⚠️ कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें"); 
        return; 
    } 

    // 3. आधार नंबर वैलिडेशन (12 अंक)
    if (idNumber.length !== 12 || isNaN(idNumber)) { 
        alert("⚠️ कृपया 12 अंकों की वैध आधार संख्या दर्ज करें"); 
        return; 
    } 

    // डबल एंट्री रोकने के लिए बटन को डिसेबल करना
    saveBtn.disabled = true; 
    saveBtn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> सुरक्षित किया जा रहा है..."; 

    try { 
        // 🚀 ऑप्टिमाइज़्ड आईडी जनरेशन: केवल आखिरी ग्राहक का रिकॉर्ड चेक करना (Fast & Reliable)
        const customerRef = collection(db, "customers");
        const q = query(customerRef, orderBy("createdAt", "desc"), limit(1));
        const querySnapshot = await getDocs(q);
        
        let nextNumber = 1;
        if (!querySnapshot.empty) {
            const lastCustomer = querySnapshot.docs[0].data();
            if (lastCustomer.customerId && lastCustomer.customerId.startsWith("GDA")) {
                const lastIdNum = parseInt(lastCustomer.customerId.replace("GDA", ""), 10);
                if (!isNaN(lastIdNum)) {
                    nextNumber = lastIdNum + 1;
                }
            }
        }
        
        const customerId = "GDA" + String(nextNumber).padStart(3, "0"); 

        // 4. फायरबेस में नया अपडेटेड रिकॉर्ड सेव करना
        await addDoc(collection(db, "customers"), { 
            customerId: customerId, 
            name: name, 
            mobile: mobile, 
            idNumber: idNumber, 
            photo: photoData, 
            address: address, 
            loan: loan, 
            emi: emi, 
            days: days, 
            loanDate: loanDate, 
            status: status, 
            paidDays: 0, 
            totalCollected: 0, 
            remainingAmount: loan, 
            createdAt: new Date() 
        }); 

        alert("✅ ग्राहक का डिजिटल रिकॉर्ड सफलतापूर्वक सुरक्षित कर लिया गया है। ID: " + customerId); 

        // 5. फॉर्म को वापस रीसेट (Reset) करना 
        document.getElementById("name").value = ""; 
        document.getElementById("mobile").value = ""; 
        document.getElementById("idNumber").value = ""; 
        document.getElementById("address").value = ""; 
        document.getElementById("loan").value = ""; 
        document.getElementById("emi").value = ""; 
        document.getElementById("loanDate").value = ""; 
        document.getElementById("days").value = "60"; 
        document.getElementById("status").value = "Active"; 
        
        if(document.getElementById("fileInput")) {
            document.getElementById("fileInput").value = ""; 
        }

        // फोटो प्रिव्यू को वापस डिफॉल्ट यूजर आइकॉन पर लाना 
        const photoPreview = document.getElementById("photoPreview"); 
        if (photoPreview) { 
            photoPreview.src = "https://cdn-icons-png.flaticon.com/512/149/149071.png"; 
        } 
        
        window.imageBase64 = ""; // वैश्विक वेरिएबल रीसेट
        
        const startCameraBtn = document.getElementById('startCameraBtn'); 
        if(startCameraBtn) {
            startCameraBtn.innerHTML = "<i class='fas fa-video'></i> कैमरा चालू करें"; 
        }

    } catch (error) { 
        console.error(error); 
        alert("❌ फायरबेस एरर (डेटा सुरक्षित नहीं हुआ):\n\n" + error.message); 
    } finally { 
        // बटन को वापस सामान्य स्थिति में लाना 
        saveBtn.disabled = false; 
        saveBtn.innerHTML = "<i class='fas fa-floppy-disk'></i> &nbsp;ग्राहक डेटा सुरक्षित करें (Save Customer)"; 
    } 
});
