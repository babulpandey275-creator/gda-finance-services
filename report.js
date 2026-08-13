<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Reports - GDA Finance</title>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700;800&family=Inter:wght@500;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" rel="stylesheet">
  <style>
    :root{
      --paper:#FAF6EE; --paper-line:#E5DAC0;
      --card:#FFFFFF; --card-border:#EEE6D3;
      --ink:#221733; --muted:#8B7FA0;
      --plum:#3A1C62; --plum-deep:#2A1742;
      --gold:#C8892C; --gold-bg:#FBEED2;
      --success:#16A34A; --success-bg:#E9F9EF;
      --danger:#DC2626; --danger-bg:#FDECEC;
      --shadow:rgba(58,28,98,0.06);
    }
    [data-theme="dark"]{
      --paper:#15101F; --paper-line:#382C50;
      --card:#201934; --card-border:#362A4E;
      --ink:#F3EDFF; --muted:#A99DC6;
      --gold:#F0BF5C; --gold-bg:#3A2E14;
      --success-bg:#12301F; --danger-bg:#3A1518;
      --shadow:rgba(0,0,0,0.35);
    }
    *{margin:0;padding:0;box-sizing:border-box;font-family:'Inter',sans-serif}
    body{background:var(--paper);min-height:100vh;padding-bottom:85px;transition:background .25s;}

    /* HEADER */
    .app-header{
      background: linear-gradient(150deg,var(--plum-deep) 0%,var(--plum) 55%,#4C2A7A 100%);
      padding:18px 16px 20px;border-radius:0 0 28px 28px;
      display:flex;justify-content:space-between;align-items:center;
      box-shadow:0 14px 34px rgba(42,23,66,0.32);position:sticky;top:0;z-index:20;
    }
    .gda-logo-container{display:flex;align-items:center;gap:12px;}
    .gda-logo-icon{
      width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#E91E63,#FF6F91);
      display:flex;align-items:center;justify-content:center;
      border:2px solid rgba(255,255,255,0.28);
    }
    .gda-logo-icon .material-symbols-outlined{font-size:25px;color:#fff;font-variation-settings:'FILL' 1;}
    .gda-logo-text h1{font-family:'Fraunces',serif;font-size:23px;font-weight:800;line-height:1;color:#fff;}
    .gda-logo-text p{margin-top:3px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:2.6px;color:#F0BF5C;}
    .header-right{display:flex;align-items:center;gap:8px;}
    .back-btn{background:rgba(255,255,255,0.13);color:#fff;border:1px solid rgba(255,255,255,0.16);padding:8px 13px;border-radius:12px;font-size:12px;font-weight:600;text-decoration:none;}
    #themeToggle{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.13);border:1px solid rgba(255,255,255,0.16);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;}
    #themeToggle .material-symbols-outlined{font-size:18px;}

    .container{padding:14px;max-width:600px;margin:0 auto;}
    .controls{
      background:var(--card);padding:16px;border-radius:20px;
      box-shadow:0 8px 22px var(--shadow);border:1px solid var(--card-border);margin-bottom:14px;
      position:relative;overflow:hidden;
    }
    .controls::before{
      content:"";position:absolute;top:0;left:0;right:0;height:4px;
      background:repeating-linear-gradient(90deg,var(--gold) 0 10px,transparent 10px 18px);opacity:.5;
    }
    .dateRow{display:flex;gap:10px;align-items:end;margin-bottom:12px;}
    .dateRow label{font-size:9.5px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;}
    .dateRow input{flex:1;padding:11px;border-radius:12px;border:1.5px solid var(--card-border);background:var(--paper);color:var(--ink);font-size:13px;font-weight:600;outline:none;}
    .btnExp{background:var(--plum);color:#fff;padding:11px 15px;border-radius:12px;text-decoration:none;font-weight:700;font-size:12px;display:flex;align-items:center;gap:6px;}
    .tabs{display:flex;gap:5px;background:var(--paper);padding:4px;border-radius:12px;border:1px solid var(--card-border);}
    .tab{flex:1;padding:9px;border:none;border-radius:8px;background:transparent;font-size:11px;font-weight:700;color:var(--muted);cursor:pointer;}
    .tab.active{background:var(--plum);color:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.15);}

    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
    .box{
      background:var(--card);padding:16px 14px;border-radius:18px;
      border:1px solid var(--card-border);box-shadow:0 5px 16px var(--shadow);
      position:relative;overflow:hidden;
    }
    .box.full{grid-column:span 2;}
    .box p{font-size:9px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px;}
    .box h3{font-family:'Fraunces',serif;font-size:19px;font-weight:800;color:var(--ink);}
    .box.green h3{color:var(--success);} .box.green{background:var(--success-bg);}
    .box.red h3{color:var(--danger);} .box.red{background:var(--danger-bg);}
    .box.dark{background:linear-gradient(135deg,var(--plum-deep),#1E3A8A);border:none;}
    .box.dark p{color:#C9B8E8;} .box.dark h3{color:#fff;}
    .box.loading h3{opacity:0.35;}
    .delta{display:inline-block;font-size:10.5px;font-weight:700;margin-top:4px;padding:2px 7px;border-radius:8px;}
    .delta.up{color:var(--success);background:var(--success-bg);}
    .delta.down{color:var(--danger);background:var(--danger-bg);}
    .delta.flat{color:var(--muted);background:var(--paper);}
    .trend-box canvas{width:100%;height:110px;margin-top:6px;}
    .trend-box .trend-empty{font-size:12px;color:var(--muted);padding:16px 0;text-align:center;}

    .bottom-nav{position:fixed;bottom:0;left:0;right:0;height:66px;background:var(--card);backdrop-filter:blur(16px);display:grid;grid-template-columns:repeat(5,1fr);align-items:center;border-top:1px solid var(--card-border);z-index:100;}
    .nav-item{display:flex;flex-direction:column;align-items:center;text-decoration:none;color:var(--muted);font-size:9.5px;font-weight:600;gap:3px;}
    .nav-item.active{color:#E91E63;font-weight:700;}
    .nav-item .material-symbols-outlined{font-size:22px;}

    /* ===== ADMIN LOCK OVERLAY ===== */
    #lockOverlay{
      position:fixed;top:0;left:0;right:0;bottom:0;
      background:rgba(20,12,32,0.78);backdrop-filter:blur(10px);
      display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;
    }
    #lockOverlay.hidden{display:none;}
    .lock-box{
      background:var(--card);border-radius:26px;padding:38px 28px;max-width:400px;width:100%;
      text-align:center;box-shadow:0 24px 60px rgba(0,0,0,0.35);border:1px solid var(--card-border);
    }
    .lock-box .lock-icon{
      width:64px;height:64px;border-radius:50%;background:var(--gold-bg);border:1.5px solid var(--gold);
      display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 14px;
    }
    .lock-box h2{font-family:'Fraunces',serif;font-size:21px;font-weight:800;color:var(--ink);margin-bottom:6px;}
    .lock-box p{font-size:13px;color:var(--muted);margin-bottom:20px;}
    .lock-box input{
      width:100%;padding:14px 16px;border:2px solid var(--card-border);background:var(--paper);color:var(--ink);
      border-radius:14px;font-size:16px;outline:none;margin-bottom:14px;text-align:center;letter-spacing:4px;
    }
    .lock-box input:focus{border-color:var(--plum);box-shadow:0 0 0 4px rgba(58,28,98,0.1);}
    .lock-box .btn-unlock{width:100%;padding:14px;background:var(--plum);color:#fff;border:none;border-radius:14px;font-weight:800;font-size:16px;cursor:pointer;}
    .lock-box .btn-unlock:active{transform:scale(0.96);}
    .lock-box .error-msg{color:var(--danger);font-size:13px;font-weight:600;margin-top:10px;display:none;}

    /* ===== BACKUP SECTION ===== */
    .backup-section{margin-top:20px;}
    .backup-section .box{border:2px dashed var(--gold);background:var(--gold-bg);padding:20px;}
    .backup-section .box .title{font-size:12px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;display:flex;align-items:center;gap:8px;}
    .backup-section .box .title .material-symbols-outlined{font-size:20px;}
    .backup-actions{display:flex;flex-wrap:wrap;gap:12px;}
    .backup-actions button, .backup-actions label{
      flex:1;min-width:150px;padding:14px 20px;border:none;border-radius:12px;
      font-weight:700;font-size:14px;cursor:pointer;
      display:flex;align-items:center;justify-content:center;gap:8px;text-align:center;
    }
    .backup-actions button:active, .backup-actions label:active{transform:scale(0.96);}
    .btn-download{background:var(--plum);color:#fff;}
    .btn-restore{background:var(--danger);color:#fff;}
    .backup-status{margin-top:12px;font-size:13px;font-weight:600;display:none;padding:8px 12px;background:var(--card);border-radius:8px;border:1px solid var(--card-border);color:var(--ink);}
  </style>
</head>
<body>

<!-- ===== ADMIN LOCK OVERLAY ===== -->
<div id="lockOverlay">
  <div class="lock-box">
    <div class="lock-icon">🔒</div>
    <h2>Admin Access Required</h2>
    <p>Enter the admin password to view reports</p>
    <input type="password" id="lockPassword" placeholder="Enter password" autofocus>
    <button class="btn-unlock" id="unlockBtn">Unlock Reports</button>
    <div class="error-msg" id="lockError">❌ Incorrect password. Try again.</div>
  </div>
</div>

<!-- ===== MAIN APP ===== -->
<div id="appContent" style="display:none;">
  <header class="app-header">
    <div class="gda-logo-container">
      <div class="gda-logo-icon"><span class="material-symbols-outlined">shield_with_heart</span></div>
      <div class="gda-logo-text"><h1>GDA</h1><p>Finance Services</p></div>
    </div>
    <div class="header-right">
      <button id="themeToggle" aria-label="Toggle dark mode"><span class="material-symbols-outlined" id="themeIcon">dark_mode</span></button>
      <a href="index.html" class="back-btn">← Back</a>
    </div>
  </header>

  <div class="container">
    <div class="controls">
      <div class="dateRow">
        <div style="flex:1"><label>Select Date</label><br><input type="date" id="reportDatePicker"></div>
        <a href="expense-manager.html" class="btnExp"><span class="material-symbols-outlined" style="font-size:18px;">add</span> Expense</a>
      </div>
      <div class="tabs">
        <button class="tab" id="btnDaily">Daily</button>
        <button class="tab active" id="btnMonthly">Monthly</button>
        <button class="tab" id="btnQuarterly">Quarterly</button>
        <button class="tab" id="btnYearly">Yearly</button>
      </div>
    </div>

    <div class="grid">
      <div class="box full dark"><p>Total Portfolio (Market Running)</p><h3 id="totalPortfolio">₹0</h3></div>
      <div class="box"><p>Disbursement</p><h3 id="disbursement">₹0</h3><span class="delta" id="deltaDisbursement" style="display:none;"></span></div>
      <div class="box green"><p>Collection</p><h3 id="collection">₹0</h3><span class="delta" id="deltaCollection" style="display:none;"></span></div>
      <div class="box green"><p>Interest Income</p><h3 id="interestIncome">₹0</h3></div>
      <div class="box red"><p>Total Expenses</p><h3 id="totalExpenses">₹0</h3></div>
      <div class="box green"><p>Net Profit</p><h3 id="netProfit">₹0</h3><span class="delta" id="deltaNetProfit" style="display:none;"></span></div>
      <div class="box red"><p>Total Due</p><h3 id="totalDue">₹0</h3></div>
      <div class="box"><p>New Accounts</p><h3 id="newAccounts">0</h3></div>
      <div class="box full trend-box"><p>Last 7 Days Collection Trend</p><canvas id="trendChart"></canvas></div>
    </div>

    <!-- ===== BACKUP & RESTORE ===== -->
    <div class="backup-section">
      <div class="box full">
        <div class="title"><span class="material-symbols-outlined">backup</span> Data Management (Backup & Restore)</div>
        <div class="backup-actions">
          <button id="backupDownloadBtn" class="btn-download"><span class="material-symbols-outlined" style="font-size:20px;">download</span> Download Backup (JSON)</button>
          <label for="restoreFileInput" class="btn-restore"><span class="material-symbols-outlined" style="font-size:20px;">upload_file</span> Upload & Restore Backup</label>
          <input type="file" id="restoreFileInput" accept=".json" style="display: none;">
        </div>
        <div id="backupStatus" class="backup-status"></div>
      </div>
    </div>
  </div>

  <nav class="bottom-nav">
    <a href="index.html" class="nav-item"><span class="material-symbols-outlined">home</span>Home</a>
    <a href="customer-list.html" class="nav-item"><span class="material-symbols-outlined">group</span>Customers</a>
    <a href="collection.html" class="nav-item"><span class="material-symbols-outlined">paid</span>Collect</a>
    <a href="report.html" class="nav-item active"><span class="material-symbols-outlined">analytics</span>Reports</a>
    <a href="#" id="logoutBtn" class="nav-item" style="color:#DC2626;"><span class="material-symbols-outlined">logout</span>Logout</a>
  </nav>
</div>

<!-- 🌙 DARK MODE TOGGLE -->
<script>
  (function () {
    const root = document.documentElement;
    const toggleBtn = document.getElementById('themeToggle');
    const icon = document.getElementById('themeIcon');
    const saved = localStorage.getItem('gdaTheme');

    function applyTheme(theme) {
      if (theme === 'dark') {
        root.setAttribute('data-theme', 'dark');
        icon.innerText = 'light_mode';
      } else {
        root.removeAttribute('data-theme');
        icon.innerText = 'dark_mode';
      }
    }
    applyTheme(saved || 'light');

    toggleBtn.addEventListener('click', () => {
      const isDark = root.getAttribute('data-theme') === 'dark';
      const next = isDark ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('gdaTheme', next);
    });
  })();
</script>

<script type="module" src="report.js"></script>
</body>
</html>
