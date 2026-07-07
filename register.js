import { db } from "./firebase.js"; 
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

const saveBtn = document.getElementById("saveBtn"); 

saveBtn.addEventListener("click", async () => { 
    const name = document.getElementById("name").value.trim(); 
    const mobile = document.getElementById("mobile").value.trim(); 
    // नया फ़ील्ड: आधार संख्या रीड करना
    const idNumber = document.getElementById("idNumber").value.trim(); 
    const address = document.getElementById("address").value.trim(); 
    const loan = Number(document.getElementById("loan").value); 
    const emi = Number(document.getElementById("emi").value); 
    const days = Number(document.getElementById("days").value); 
    const loanDate = document.getElementById("loanDate").value; 
    const status = document.getElementById("status").value; 

    // HTML स्क्रिप्ट से वैश्विक फोटो वेरिएबल (imageBase64) को प्राप्त करना
    // यदि यूजर ने फोटो नहीं खींची है, तो खाली स्ट्रिंग या डिफॉल्ट वैल्यू जाएगी
    const photoData = window.imageBase64 || ""; 

    // वैलिडेशन: आधार और फोटो को अनिवार्य रखना चाहें तो यहाँ जोड़ सकते हैं, अभी इसे सामान्य रखा है
    if ( !name || !mobile || !idNumber || !address || !loan || !emi || !days || !loanDate ) { 
        alert("⚠️ कृपया सभी जानकारी (आधार संख्या सहित) सही-सही भरें"); 
        return; 
    } 

    // मोबाइल नंबर वैलिडेशन (10 अंक)
    if (mobile.length !== 10 || isNaN(mobile)) {
        alert("⚠️ कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें");
        return;
    }

    // आधार नंबर वैलिडेशन (12 अंक)
    if (idNumber.length !== 12 || isNaN(idNumber)) {
        alert("⚠️ कृपया 12 अंकों की वैध आधार संख्या दर्ज करें");
        return;
    }

    // बटन को डिसेबल करना ताकि यूजर बार-बार क्लिक न कर सके (डबल एंट्री प्रोटेक्शन)
    saveBtn.disabled = true;
    saveBtn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> सुरक्षित किया जा रहा है...";

    try { 
        // ऑटोमैटिक ग्राहक आईडी जेनरेट करना (जैसे GDA001, GDA002...)
        const snapshot = await getDocs(collection(db, "customers")); 
        const customerId = "GDA" + String(snapshot.size + 1).padStart(3, "0"); 

        // फायरबेस में डेटा भेजना (नया अपडेटेड ऑब्जेक्ट)
        await addDoc(collection(db, "customers"), { 
            customerId: customerId, 
            name: name, 
            mobile: mobile, 
            idNumber: idNumber,      // डेटाबेस में सुरक्षित हो रहा आधार नंबर
            photo: photoData,        // डेटाबेस में सुरक्षित हो रही Base64 फोटो
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

        // फॉर्म को वापस खाली (Reset) करना
        document.getElementById("name").value = ""; 
        document.getElementById("mobile").value = ""; 
        document.getElementById("idNumber").value = ""; 
        document.getElementById("address").value = ""; 
        document.getElementById("loan").value = ""; 
        document.getElementById("emi").value = ""; 
        document.getElementById("loanDate").value = ""; 
        document.getElementById("days").value = "60"; 
        document.getElementById("status").value = "Active"; 
        if(document.getElementById("fileInput")) document.getElementById("fileInput").value = "";
        
        // फोटो प्रिव्यू को वापस डिफॉल्ट यूजर आइकॉन पर लाना
        const photoPreview = document.getElementById("photoPreview");
        if (photoPreview) {
            photoPreview.src = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
        }
        window.imageBase64 = ""; // वैश्विक वेरिएबल रीसेट करें
        
        const startCameraBtn = document.getElementById('startCameraBtn');
        if(startCameraBtn) startCameraBtn.innerHTML = "<i class='fas fa-video'></i>  कैमरा चालू करें";

    } catch (error) { 
        console.error(error); 
        alert("❌ फायरबेस एरर (डेटा सुरक्षित नहीं हुआ):\n\n" + error.message); 
    } finally {
        // बटन को वापस सामान्य स्थिति में लाना
        saveBtn.disabled = false;
        saveBtn.innerHTML = "💾 Save Customer";
    }
});
