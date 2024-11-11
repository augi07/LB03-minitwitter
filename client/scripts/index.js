document.addEventListener("DOMContentLoaded", () => {
  const newTweetInput = document.getElementById("new-tweet");
  const postTweetButton = document.getElementById("post-tweet");
  const logoutButton = document.getElementById("logout");

  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    window.location.href = "/login.html";
  }

  const generateTweet = (tweet) => {
    const date = new Date(tweet.timestamp).toLocaleDateString("de-CH", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    return `
        <div class="bg-slate-600 rounded p-4 flex gap-4 items-center border-l-4 border-blue-400">
            <div>
                <h3 class="font-semibold text-gray-200">${tweet.username}</h3>
                <p class="text-gray-400 text-sm">${date}</p>
                <p>${tweet.text}</p>
            </div>
        </div>
      `;
  };

  const getFeed = async () => {
    const response = await fetch("/api/feed", {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    if (response.status === 401) {
      localStorage.removeItem("user");
      window.location.href = "/login.html";
    }
    const tweets = await response.json();
    document.getElementById("feed").innerHTML = tweets.map(generateTweet).join("");
  };

  const postTweet = async () => {
    const text = newTweetInput.value;
    await fetch("/api/feed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.token}`,
      },
      body: JSON.stringify({ username: user.username, text }),
    });
    newTweetInput.value = "";
    getFeed();
  };

  postTweetButton.addEventListener("click", postTweet);
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "/login.html";
  });

  getFeed();
});
