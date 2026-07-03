function login() {

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (username === "admin" && password === "GDA@2026") {

        localStorage.setItem("gdaLoggedIn", "true");

        window.location.href = "index.html";

    } else {

        document.getElementById("error").innerText =
            "❌ Wrong Username or Password";

    }
}
