import { loadDashboard } from "./dashboard.js";

/* ==========================================
   GDA Finance Services V2
   app.js
========================================== */

window.addEventListener("DOMContentLoaded", () => {

    startApp();

});

async function startApp() {

    try {

        console.log("🚀 Starting GDA Finance Services...");

        await loadDashboard();

        console.log("✅ Dashboard Loaded");

    } catch (error) {

        console.error("App Error:", error);

        alert("⚠️ App Loading Error\n\n" + error.message);

    }

}

/* Manual Refresh */

window.refreshApp = async function () {

    try {

        await loadDashboard();

        console.log("🔄 Dashboard Refreshed");

    } catch (error) {

        console.error(error);

    }

};

/* Auto Refresh Every 30 Seconds */

setInterval(() => {

    window.refreshApp();

}, 30000);

console.log("✅ GDA Finance Services V2 Ready");
