import { loadDashboard } from "./dashboard.js";

/* ==========================================
   🚀 GDA FINANCE SERVICES - MAIN APPLICATION CONTROLLER
========================================== */

window.addEventListener("DOMContentLoaded", () => {
    startApp();
});

async function startApp() {
    try {
        console.log("🚀 Starting GDA Finance Services Engine...");
        await loadDashboard();
        console.log("✅ Dashboard initialization completed successfully.");
    } catch (error) {
        console.error("App Initialization Error:", error);
        alert("⚠️ System Initialization Failed\n\n" + error.message);
    }
}

// Global flag to prevent multiple overlapping background fetches
let isRefreshing = false;

/* Dynamic Manual/System Refresh Handler */
window.refreshApp = async function () {
    if (isRefreshing) {
        console.log("⏳ Refresh rejected: Previous sync cycle is still active.");
        return;
    }
    
    try {
        isRefreshing = true;
        console.log("🔄 Synchronizing live transaction streams...");
        await loadDashboard();
        console.log("✅ Data sync finalized successfully.");
    } catch (error) {
        console.error("Data Refresh Core Error:", error);
    } finally {
        isRefreshing = false;
    }
};

/* Auto-Refresh Sync Cycle: Triggers precisely every 30 seconds */
setInterval(() => {
    window.refreshApp();
}, 30000);

console.log("✅ GDA Finance Services Framework Ready.");
