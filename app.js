import { db } from "./firebase.js";

window.addEventListener("load", () => {
    console.log("GDA Finance Services Loaded");
    console.log(db);
});

function showMessage(msg) {
    alert(msg);
}

window.showMessage = showMessage;
