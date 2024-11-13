document.addEventListener("DOMContentLoaded", () => {
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const loginButton = document.getElementById("login");
  const errorText = document.getElementById("error");

  loginButton.addEventListener("click", async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      errorText.innerText = "Benutzername und Passwort dürfen nicht leer sein.";
      return;
    }

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (response.ok && data?.username) {
        localStorage.setItem("user", JSON.stringify(data));
        window.location.href = "/";
      } else {
        errorText.innerText = data.error || "Login fehlgeschlagen.";
      }
    } catch (error) {
      console.error("Fehler beim Login:", error.message);
      errorText.innerText =
        "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.";
    }
  });
});
