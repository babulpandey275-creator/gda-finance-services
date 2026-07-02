import { db } from "./firebase.js";

window.addEventListener("load", () => {
    console.log("GDA Finance Services Loaded");
    console.log(db);
});

function showMessage(page) {

    if (page === "Customer Registration") {
        window.location.href = "register.html";
    }
    else {
        alert(page + " Coming Soon");
    }
}

window.showMessage = showMessage;
