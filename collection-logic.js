// यह फंक्शन अभी डेमो के लिए है, इसे Firebase के साथ जोड़ना होगा
function searchCustomer() {
    const query = document.getElementById('searchInput').value;
    
    // मान लीजिए सर्च करने पर हमें यह डेटा मिलता है
    if (query !== "") {
        document.getElementById('customerDetails').style.display = 'block';
        
        // यहाँ Firebase से डेटा फेच (fetch) करने का लॉजिक आएगा
        document.getElementById('displayName').innerText = "राहुल कुमार"; 
        document.getElementById('displayEMI').innerText = "400";
        document.getElementById('editAmount').value = "400"; // यहाँ से आप एडिट कर पाएंगे
    } else {
        alert("कृपया कोई नाम या नंबर डालें");
    }
}

function savePayment() {
    const finalAmount = document.getElementById('editAmount').value;
    const remark = document.getElementById('remark').value;
    
    // यहाँ Firebase में डेटा सेव करने का फंक्शन कॉल करें
    alert("सफलतापूर्वक कलेक्ट किया गया: ₹" + finalAmount + "\nनोट: " + remark);
    
    // सेव होने के बाद रिसेट करें
    document.getElementById('customerDetails').style.display = 'none';
    document.getElementById('searchInput').value = "";
}
