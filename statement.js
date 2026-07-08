import { db } from "./firebase.js"; 
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; 

window.addEventListener('DOMContentLoaded', async () => { 
    const urlParams = new URLSearchParams(window.location.search); 
    const custId = urlParams.get('id'); 
    
    if (!custId) { 
        alert("⚠️ कोई ग्राहक ID नहीं मिली!"); 
        window.location.href = "customer-list.html"; 
        return; 
    } 

    const lblName = document.getElementById("lblName"); 
    const lblId = document.getElementById("lblId"); 
    const lblMobile = document.getElementById("lblMobile"); 
    const lblAadhaar = document.getElementById("lblAadhaar"); 
    const lblAddress = document.getElementById("lblAddress"); 
    const lblLoan = document.getElementById("loan") || document.getElementById("lblLoan"); 
    const lblPlan = document.getElementById("lblPlan"); 
    const lblEmi = document.getElementById("lblEmi"); 
    const lblDate = document.getElementById("lblDate"); 
    const lblPaidDays = document.getElementById("lblPaidDays"); 
    const lblTotalCollected = document.getElementById("lblTotalCollected"); 
    const lblRemaining = document.getElementById("lblRemaining"); 
    const customerPhotoDisplay = document.getElementById("customerPhotoDisplay"); 
    const collectionTableBody = document.getElementById("collectionTableBody"); 

    async function loadCustomerStatement() { 
        try { 
            const docRef = doc(db, "customers", custId); 
            const docSnap = await getDoc(docRef); 
            
            if (!docSnap.exists()) { 
                alert("⚠️ ग्राहक का रिकॉर्ड नहीं मिला!"); 
                window.location.href = "customer-list.html"; 
                return; 
            } 

            const customer = docSnap.data(); 

            lblId.textContent = customer.member_id || `ID: ${custId.substring(0, 5)}...`; 
            lblName.textContent = customer.name || "-"; 
            lblMobile.textContent = customer.mobile || "-"; 
            lblAddress.textContent = customer.address || "-"; 

            const loanAmount = Number(customer.loanAmount || 0);
            const totalCollected = Number(customer.totalCollected || 0);

            // 20% Interest dynamic logic definition (15000 -> 18000)
            const totalPayableWithInterest = loanAmount + (loanAmount * 0.20);
            const dynamicRemaining = totalPayableWithInterest - totalCollected;

            // FIXED: Yahan ab direct total payable interest calculation (₹18000) show hoga
            if (lblLoan) {
                lblLoan.textContent = `₹${totalPayableWithInterest}`; 
            }
            
            lblPlan.textContent = `${customer.loanPlan || 0} Days`; 
            lblEmi.textContent = `₹${customer.emi || 0}`; 
            lblDate.textContent = customer.loanDate || "-"; 
            lblPaidDays.textContent = `${customer.paidDays || 0} दिन`; 
            lblTotalCollected.textContent = `₹${totalCollected}`; 
            
            lblRemaining.textContent = `₹${Math.max(0, Math.round(dynamicRemaining))}`; 

            if (customer.aadhaarNumber && customer.aadhaarNumber !== "-") { 
                lblAadhaar.textContent = customer.aadhaarNumber; 
            } else { 
                lblAadhaar.textContent = "दर्ज नहीं है";
            } 

            if (customer.customerPhoto) { 
                customerPhotoDisplay.src = customer.customerPhoto; 
            } 

            await loadCollectionHistory(); 
        } catch (error) { 
            console.error("Error loading statement:", error);
            alert("डेटा लोड करने में तकनीकी समस्या आई है।"); 
        } 
    } 

    async function loadCollectionHistory() { 
        try { 
            const q = query(collection(db, "collections"), where("customerId", "==", custId)); 
            const querySnapshot = await getDocs(q); 
            collectionTableBody.innerHTML = ""; 
            
            if (querySnapshot.empty) { 
                collectionTableBody.innerHTML = `<tr><td colspan="4">अभी तक कोई किस्त जमा नहीं हुई है।</td></tr>`; 
                return; 
            } 

            let collectionsArray = []; 
            querySnapshot.forEach((docSnap) => { 
                collectionsArray.push({ id: docSnap.id, ...docSnap.data() }); 
            }); 

            collectionsArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); 
            
            let index = 1; 
            collectionsArray.forEach((collect) => { 
                const tr = document.createElement("tr"); 
                let displayDate = "-"; 
                
                if (collect.date) { 
                    if (collect.date.toDate) { 
                        displayDate = collect.date.toDate().toISOString().split("T")[0]; 
                    } else if (collect.date.seconds) { 
                        displayDate = new Date(collect.date.seconds * 1000).toISOString().split("T")[0]; 
                    } else { 
                        displayDate = collect.date; 
                    } 
                } 
                
                tr.innerHTML = `<td>${index++}</td><td>${displayDate}</td><td><strong>₹${collect.amount || 0}</strong></td><td><button class="delete-btn" data-id="${collect.id}">❌</button></td>`; 
                collectionTableBody.appendChild(tr); 
            }); 
        } catch (error) { 
            collectionTableBody.innerHTML = `<tr><td colspan="4" style="color:red;">इतिहास लोड करने में समस्या आई।</td></tr>`; 
        } 
    } 

    await loadCustomerStatement(); 
});
