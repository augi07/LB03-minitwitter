document.addEventListener("DOMContentLoaded", () => {
  const newTweetInput = document.getElementById("new-tweet");
  const postTweetButton = document.getElementById("post-tweet");
  const logoutButton = document.getElementById("logout");

  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    window.location.href = "/login.html";
  }

  const generateTweetHTML = (tweet) => {
    const date = new Date(tweet.timestamp).toLocaleDateString("de-CH", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });

    const tweetContainer = document.createElement("div");
    tweetContainer.className = "bg-slate-600 rounded p-4 flex gap-4 items-center border-l-4 border-blue-400";

    const usernameElement = document.createElement("h3");
    usernameElement.className = "font-semibold text-gray-200";
    usernameElement.textContent = tweet.username;

    const dateElement = document.createElement("p");
    dateElement.className = "text-gray-400 text-sm";
    dateElement.textContent = date;

    const textElement = document.createElement("p");
    textElement.textContent = tweet.text;

    const contentContainer = document.createElement("div");
    contentContainer.appendChild(usernameElement);
    contentContainer.appendChild(dateElement);
    contentContainer.appendChild(textElement);

    tweetContainer.appendChild(contentContainer);
    return tweetContainer.outerHTML;
  };

  const getFeed = async () => {
    try {
      const response = await fetch("/api/feed", {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const tweets = await response.json();
      if (!Array.isArray(tweets)) {
        console.error("Invalid feed response:", tweets);
        return;
      }

      const feedContainer = document.getElementById("feed");
      feedContainer.innerHTML = tweets.map(generateTweetHTML).join("");
    } catch (error) {
      console.error("Error fetching feed:", error.message);
    }
  };

  const postTweet = async () => {
    const text = newTweetInput.value.trim();
    if (!text) {
      alert("Tweet cannot be empty.");
      return;
    }

    try {
      const response = await fetch("/api/feed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ username: user.username, text }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Error posting tweet: ${error.error}`);
        return;
      }

      newTweetInput.value = "";
      getFeed();
    } catch (error) {
      console.error("Error posting tweet:", error.message);
    }
  };

  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "/login.html";
  });

  postTweetButton.addEventListener("click", postTweet);
  getFeed();
});