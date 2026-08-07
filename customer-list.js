<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Customers · GDA Finance</title>
    <!-- Google Fonts + Material Icons -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" rel="stylesheet" />
    <!-- jsPDF for PDF generation -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <style>
        /* ----- RESET & VARIABLES ----- */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Inter', sans-serif;
        }
        :root {
            --primary: #3A1C62;
            --pink: #E91E63;
            --gold: #FFC107;
            --bg: #F8FAFF;
            --muted: #64748B;
            --line: #F1F5F9;
        }
        body {
            background: var(--bg);
            padding-bottom: 85px;
        }

        /* ----- HEADER ----- */
        .app-header {
            background: linear-gradient(135deg, #2A1742 0%, #3A1C62 50%, #4C2A7A 100%);
            padding: 18px 16px 20px;
            border-radius: 0 0 26px 26px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 20;
        }
        .gda-logo-container {
            display: flex;
            align-items: center;
            gap: 13px;
        }
        .gda-logo-icon {
            width: 52px;
            height: 52px;
            border-radius: 16px;
            background: linear-gradient(135deg, #E91E63, #FF5A8A);
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .gda-logo-icon .material-symbols-outlined {
            font-size: 28px;
            color: #fff;
        }
        .gda-logo-text h1 {
            margin: 0;
            font-size: 27px;
            font-weight: 800;
            color: #fff;
        }
        .gda-logo-text p {
            font-size: 10.5px;
            font-weight: 700;
            letter-spacing: 3.2px;
            color: var(--gold);
            text-transform: uppercase;
        }
        .back-link {
            background: rgba(255, 255, 255, 0.14);
            color: #fff;
            padding: 9px 14px;
            border-radius: 12px;
            text-decoration: none;
            font-size: 13px;
            font-weight: 600;
        }

        /* ----- CONTAINER ----- */
        .container {
            padding: 14px;
            max-width: 600px;
            margin: 0 auto;
        }

        /* ----- FILTER TABS ----- */
        .filter-tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
        }
        .filter-tab {
            padding: 11px 18px;
            border-radius: 30px;
            border: 1.5px solid #E2E8F0;
            background: #fff;
            font-weight: 700;
            color: var(--muted);
            cursor: pointer;
            transition: 0.2s;
        }
        .filter-tab.active {
            background: var(--primary);
            color: #fff;
            border-color: var(--primary);
        }

        /* ----- SEARCH ----- */
        .search-wrap {
            position: relative;
            margin-bottom: 14px;
        }
        .search-wrap input {
            width: 100%;
            padding: 14px 14px 14px 42px;
            border-radius: 14px;
            border: 1.5px solid #E9D5FF;
            background: #fff;
            outline: none;
            font-size: 14px;
        }
        .search-wrap .icon {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--muted);
        }

        /* ----- CUSTOMER CARD ----- */
        .cust-card {
            background: #fff;
            border-radius: 20px;
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
            border: 1px solid #F1F5F9;
            margin-bottom: 10px;
            cursor: pointer;
            transition: 0.15s;
        }
        .cust-card:active {
            transform: scale(0.98);
        }
        .cust-card .avatar {
            width: 55px;
            height: 55px;
            border-radius: 50%;
            object-fit: cover;
            border: 1px solid #eee;
            background: #f1f5f9;
        }
        .cust-card .actions {
            display: flex;
            gap: 6px;
            width: 100%;
            margin-top: 4px;
        }
        .cust-card .actions .btn {
            flex: 1;
            padding: 8px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
            text-align: center;
            border: none;
            cursor: pointer;
            text-decoration: none;
        }
        .btn-collect {
            background: #0F172A;
            color: #fff;
        }
        .btn-del {
            background: #FFF1F2;
            color: #E11D48;
            border: 1px solid #FFE4E6;
        }
        .btn-edit {
            background: #FFFBEB;
            color: #92400E;
            border: 1px solid #FEF3C7;
        }

        /* ----- DRAWER (BOND PAPER) ----- */
        .drawer-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 200;
            transition: opacity 0.3s;
        }
        .drawer-overlay.active {
            opacity: 1;
        }
        .drawer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            max-height: 85vh;
            background: #fff;
            border-radius: 28px 28px 0 0;
            padding: 24px 20px 30px;
            transform: translateY(100%);
            transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
            z-index: 300;
            box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.12);
            overflow-y: auto;
        }
        .drawer.open {
            transform: translateY(0);
        }
        .drawer-handle {
            width: 40px;
            height: 4px;
            background: #D1D5DB;
            border-radius: 4px;
            margin: 0 auto 16px;
        }
        .drawer-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }
        .drawer-header h3 {
            font-size: 18px;
            font-weight: 800;
            color: #0F172A;
        }
        .drawer-close {
            background: #F1F5F9;
            border: none;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            font-size: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .bond-paper {
            background: #FFFBEB;
            border: 2px solid #FDE68A;
            border-radius: 16px;
            padding: 16px;
            margin-bottom: 16px;
        }
        .bond-paper .row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px dashed #FDE68A;
            font-size: 12px;
        }
        .bond-paper .row:last-child {
            border-bottom: none;
        }
        .bond-paper .row span {
            color: #64748B;
        }
        .bond-paper .row b {
            color: #0F172A;
        }
        .drawer-actions {
            display: flex;
            gap: 10px;
            margin-top: 12px;
        }
        .drawer-actions .btn {
            flex: 1;
            padding: 10px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 13px;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        .btn-whatsapp {
            background: #25D366;
            color: #fff;
        }
        .btn-pdf {
            background: #DC2626;
            color: #fff;
        }
        .history-list {
            max-height: 140px;
            overflow-y: auto;
            font-size: 12px;
            margin-top: 8px;
            background: #F8FAFF;
            border-radius: 12px;
            padding: 8px 12px;
        }
        .history-list .h-item {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #F1F5F9;
        }
        .history-list .h-item:last-child {
            border-bottom: none;
        }

        /* ----- BOTTOM NAV ----- */
        .bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 68px;
            background: #fff;
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            align-items: center;
            border-top: 1px solid #F3E8FF;
            z-index: 100;
        }
        .nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-decoration: none;
            color: #A8A0B5;
            font-size: 10px;
            font-weight: 600;
            gap: 3px;
        }
        .nav-item.active {
            color: var(--pink);
        }
        .nav-item .material-symbols-outlined {
            font-size: 24px;
        }

        /* ----- RESPONSIVE TWEAKS ----- */
        @media (max-width: 480px) {
            .gda-logo-text h1 {
                font-size: 22px;
            }
            .filter-tab {
                padding: 8px 14px;
                font-size: 12px;
            }
        }
    </style>
</head>
<body>

    <!-- ===== HEADER ===== -->
    <header class="app-header">
        <div class="gda-logo-container">
            <div class="gda-logo-icon">
                <span class="material-symbols-outlined">shield_with_heart</span>
            </div>
            <div class="gda-logo-text">
                <h1>GDA</h1>
                <p>Finance Services</p>
            </div>
        </div>
        <a href="index.html" class="back-link">← Back</a>
    </header>

    <!-- ===== MAIN CONTAINER ===== -->
    <div class="container">

        <!-- Filter Tabs -->
        <div class="filter-tabs">
            <button class="filter-tab active" data-filter="active" onclick="filterCustomers('active')">Active Accounts</button>
            <button class="filter-tab" data-filter="closed" onclick="filterCustomers('closed')">Closed Accounts</button>
        </div>

        <!-- Search -->
        <div class="search-wrap">
            <span class="material-symbols-outlined icon">search</span>
            <input id="searchInp" placeholder="Search name, mobile, code..." />
        </div>

        <!-- Customer List -->
        <div id="listContainer">
            <p style="text-align:center;padding:20px;">⏳ Loading...</p>
        </div>
    </div>

    <!-- ===== BOTTOM NAV ===== -->
    <nav class="bottom-nav">
        <a href="index.html" class="nav-item"><span class="material-symbols-outlined">home</span>Home</a>
        <a href="customer-list.html" class="nav-item active"><span class="material-symbols-outlined">group</span>Customers</a>
        <a href="collection.html" class="nav-item"><span class="material-symbols-outlined">paid</span>Collect</a>
        <a href="report.html" class="nav-item"><span class="material-symbols-outlined">analytics</span>Reports</a>
        <a href="#" id="logoutBtn" class="nav-item" style="color:#DC2626;"><span class="material-symbols-outlined">logout</span>Logout</a>
    </nav>

    <!-- ===== DRAWER (BOND PAPER) ===== -->
    <div class="drawer-overlay" id="drawerOverlay"></div>
    <div class="drawer" id="drawer">
        <div class="drawer-handle"></div>
        <div class="drawer-header">
            <h3 id="drawerName">Customer</h3>
            <button class="drawer-close" id="closeDrawer">✕</button>
        </div>

        <!-- Bond Paper -->
        <div class="bond-paper" id="bondPaper">
            <!-- dynamically filled -->
        </div>

        <!-- Collection History -->
        <div id="historyContainer">
            <div class="history-list" id="historyList">
                <p style="color:#94A3B8;font-size:12px;">No collection yet</p>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="drawer-actions">
            <button class="btn btn-whatsapp" id="btnWhatsapp">
                <span class="material-symbols-outlined" style="font-size:18px;">whatsapp</span> WhatsApp
            </button>
            <button class="btn btn-pdf" id="btnPdf">
                <span class="material-symbols-outlined" style="font-size:18px;">picture_as_pdf</span> PDF
            </button>
        </div>
    </div>

    <!-- ============================================================ -->
    <!-- ===== JAVASCRIPT (MODULE) ===== -->
    <script type="module">
        import { db, auth } from "./firebase.js";
        import {
            collection,
            getDocs,
            doc,
            deleteDoc
        } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
        import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

        // ----- DOM refs -----
        const listContainer = document.getElementById("listContainer");
        const searchInp = document.getElementById("searchInp");
        const drawer = document.getElementById("drawer");
        const drawerOverlay = document.getElementById("drawerOverlay");
        const closeDrawerBtn = document.getElementById("closeDrawer");
        const bondPaper = document.getElementById("bondPaper");
        const historyList = document.getElementById("historyList");
        const drawerName = document.getElementById("drawerName");

        const ADMIN_PASSWORD = "GDA@2026";

        // ----- State -----
        let allCustomers = [];
        let allCollections = [];
        let selectedCustomer = null;

        // ----- Load data -----
        async function loadCustomers() {
            listContainer.innerHTML = "<p style='text-align:center;padding:20px;'>⏳ लोड हो रहा है...</p>";
            try {
                const [custSnap, colSnap] = await Promise.all([
                    getDocs(collection(db, "customers")),
                    getDocs(collection(db, "collections"))
                ]);
                allCustomers = custSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                allCollections = colSnap.docs.map(d => d.data());
                renderList(allCustomers.filter(c => c.status !== "Closed" && c.status !== "Settled"));
            } catch (err) {
                listContainer.innerHTML = "❌ डेटा लोड नहीं हुआ।";
                console.error(err);
            }
        }

        // ----- Render customer cards -----
        function renderList(data) {
            listContainer.innerHTML = "";
            if (data.length === 0) {
                listContainer.innerHTML = "<p style='text-align:center;padding:20px;'>कोई कस्टमर नहीं मिला।</p>";
                return;
            }
            data.forEach(cust => {
                const card = document.createElement("div");
                card.className = "cust-card";
                const imgUrl = (cust.photoUrl && cust.photoUrl.startsWith('http')) ?
                    cust.photoUrl :
                    'https://via.placeholder.com/55';

                card.innerHTML = `
              <div style="display:flex;gap:12px;align-items:center;">
                <img src="${imgUrl}" onerror="this.src='https://via.placeholder.com/55'" class="avatar" />
                <div>
                  <h4 style="margin:0;font-size:16px;color:#0F172A;">${cust.name || "N/A"}</h4>
                  <p style="margin:0;font-size:12px;color:#64748b;">📱 ${cust.mobile || "N/A"}</p>
                  <p style="margin:0;font-size:12px;color:#64748b;">💰 ₹${cust.loanAmount || 0} | ${cust.customerCode || ''}</p>
                </div>
              </div>
              <div class="actions">
                <a href="collection.html?id=${cust.id}" class="btn btn-collect" onclick="event.stopPropagation();">Collect</a>
                <button class="btn btn-del" onclick="event.stopPropagation(); window.secureDelete('${cust.id}')">Del</button>
                <button class="btn btn-edit" onclick="event.stopPropagation(); window.secureEdit('${cust.id}')">Edit</button>
              </div>
            `;
                // Open drawer on card click
                card.addEventListener('click', () => openDrawer(cust));
                listContainer.appendChild(card);
            });
        }

        // ----- OPEN DRAWER (Bond Paper) -----
        function openDrawer(cust) {
            selectedCustomer = cust;
            drawerName.innerText = cust.name || "Customer";

            // Calculate remaining
            const remain = Math.max(0, Number(cust.loanAmount || 0) * 1.2 - Number(cust.totalCollected || 0));

            // Bond paper HTML
            bondPaper.innerHTML = `
            <h4 style="text-align:center;font-weight:800;color:#92400E;margin-bottom:10px;">📄 GDA FINANCE · BOND PAPER</h4>
            <div class="row"><span>Name</span><b>${cust.name || "N/A"}</b></div>
            <div class="row"><span>Code</span><b>${cust.customerCode || "GDA"}</b></div>
            <div class="row"><span>Mobile</span><b>${cust.mobile || ""}</b></div>
            <div class="row"><span>Loan</span><b>₹${cust.loanAmount || 0}</b></div>
            <div class="row"><span>EMI</span><b>₹${cust.dailyEmi || cust.emi || 0}</b></div>
            <div class="row"><span>Paid</span><b>₹${cust.totalCollected || 0}</b></div>
            <div class="row"><span>Remaining</span><b style="color:#DC2626;">₹${remain.toLocaleString('en-IN')}</b></div>
          `;

            // Collection history
            const hist = allCollections
                .filter(x => x.customerId === cust.id)
                .sort((a, b) => new Date(b.date || b.collectionDate) - new Date(a.date || a.collectionDate))
                .slice(0, 20);

            if (hist.length) {
                historyList.innerHTML = `
                <h5 style="font-size:11px;color:#64748B;margin-bottom:8px;">📊 Collection History</h5>
                ${hist.map(h => `
                  <div class="h-item">
                    <span>${h.date || h.collectionDate || "—"}</span>
                    <b>₹${h.amount || h.collectionAmount || 0}</b>
                  </div>
                `).join('')}
              `;
            } else {
                historyList.innerHTML = `<p style="color:#94A3B8;font-size:12px;">No collection yet</p>`;
            }

            // Open drawer
            drawer.classList.add("open");
            drawerOverlay.style.display = "block";
            drawerOverlay.classList.add("active");
        }

        // ----- CLOSE DRAWER -----
        function closeDrawer() {
            drawer.classList.remove("open");
            drawerOverlay.classList.remove("active");
            setTimeout(() => { drawerOverlay.style.display = "none"; }, 300);
        }

        // ----- Event listeners for drawer -----
        closeDrawerBtn.addEventListener('click', closeDrawer);
        drawerOverlay.addEventListener('click', closeDrawer);

        // ----- WhatsApp -----
        document.getElementById("btnWhatsapp").addEventListener('click', (e) => {
            e.preventDefault();
            if (!selectedCustomer) return;
            const mobile = selectedCustomer.mobile || "";
            const msg =
                `*GDA Finance Services*%0A%0A*Bond Paper*%0AName: ${selectedCustomer.name}%0ACode: ${selectedCustomer.customerCode}%0AMobile: ${mobile}%0ALoan: ₹${selectedCustomer.loanAmount}%0AEMI: ₹${selectedCustomer.dailyEmi||selectedCustomer.emi}%0APaid: ₹${selectedCustomer.totalCollected||0}%0ABranch: Garhwa`;
            window.open(`https://wa.me/91${mobile}?text=${msg}`, '_blank');
        });

        // ----- PDF -----
        document.getElementById("btnPdf").addEventListener('click', (e) => {
            e.preventDefault();
            if (!selectedCustomer) return;
            const { jsPDF } = window.jspdf;
            const docPdf = new jsPDF();
            const c = selectedCustomer;
            docPdf.setFontSize(16);
            docPdf.text("GDA FINANCE SERVICES", 20, 20);
            docPdf.setFontSize(12);
            docPdf.text("BOND PAPER", 20, 30);
            docPdf.text(`Name: ${c.name || "N/A"}`, 20, 45);
            docPdf.text(`Code: ${c.customerCode || "GDA"}`, 20, 55);
            docPdf.text(`Mobile: ${c.mobile || ""}`, 20, 65);
            docPdf.text(`Loan: ₹${c.loanAmount || 0}`, 20, 75);
            docPdf.text(`EMI: ₹${c.dailyEmi || c.emi || 0}`, 20, 85);
            docPdf.text(`Paid: ₹${c.totalCollected || 0}`, 20, 95);
            const remain = Math.max(0, Number(c.loanAmount || 0) * 1.2 - Number(c.totalCollected || 0));
            docPdf.text(`Remaining: ₹${remain}`, 20, 105);
            docPdf.save(`${c.name || "customer"}_GDA_Bond.pdf`);
        });

        // ----- SEARCH -----
        searchInp.addEventListener("input", (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allCustomers.filter(c =>
                (c.name && c.name.toLowerCase().includes(term)) ||
                (c.mobile && c.mobile.includes(term)) ||
                (c.customerCode && c.customerCode.toLowerCase().includes(term))
            );
            // preserve current filter state
            const activeTab = document.querySelector('.filter-tab.active');
            if (activeTab && activeTab.dataset.filter === 'closed') {
                renderList(filtered.filter(c => c.status === 'Closed' || c.status === 'Settled'));
            } else {
                renderList(filtered.filter(c => c.status !== 'Closed' && c.status !== 'Settled'));
            }
        });

        // ----- FILTER -----
        window.filterCustomers = (type) => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            // find the clicked tab
            const tabs = document.querySelectorAll('.filter-tab');
            tabs.forEach(t => {
                if (t.dataset.filter === type) t.classList.add('active');
            });
            if (type === 'closed') {
                renderList(allCustomers.filter(c => c.status === 'Closed' || c.status === 'Settled'));
            } else {
                renderList(allCustomers.filter(c => c.status !== 'Closed' && c.status !== 'Settled'));
            }
        };

        // ----- SECURE EDIT -----
        window.secureEdit = (docId) => {
            const pass = prompt("🔑 Edit करने के लिए Admin Password डालें:");
            if (pass === ADMIN_PASSWORD) {
                window.location.href = `./edit-customer.html?id=${docId}`;
            } else if (pass !== null) {
                alert("❌ गलत पासवर्ड!");
            }
        };

        // ----- SECURE DELETE -----
        window.secureDelete = async (docId) => {
            const pass = prompt("⚠️ DELETE करने के लिए Admin Password डालें:");
            if (pass === ADMIN_PASSWORD) {
                if (!confirm("क्या आप वाकई इस कस्टमर को हटाना चाहते हैं?")) return;
                try {
                    await deleteDoc(doc(db, "customers", docId));
                    alert("✅ डिलीट सफल!");
                    loadCustomers();
                } catch (err) {
                    alert("❌ एरर: " + err.message);
                }
            } else if (pass !== null) {
                alert("❌ गलत पासवर्ड!");
            }
        };

        // ----- AUTH -----
        onAuthStateChanged(auth, (user) => {
            if (!user) {
                location.href = "login.html";
            } else {
                loadCustomers();
            }
        });

        // ----- LOGOUT -----
        document.getElementById("logoutBtn").addEventListener('click', async (e) => {
            e.preventDefault();
            await signOut(auth);
            location.href = "login.html";
        });

        // expose for inline onclick
        window.openDrawer = openDrawer;
        window.closeDrawer = closeDrawer;
    </script>

</body>
</html>
