const topics = [
  { id: "ai-copilot", label: "AI & Copilot" },
  { id: "cloud-native", label: "Cloud-native apps" },
  { id: "azure-costs", label: "Azure costs" },
  { id: "security", label: "Security" },
  { id: "developer-experience", label: "Developer experience" },
];

const resultsView = new URLSearchParams(window.location.search).get("view") === "votes";
const topicList = document.querySelector("#topic-list");
const status = document.querySelector("#status");
const intro = document.querySelector("#intro");
const viewLink = document.querySelector("#view-link");
let isVoting = false;

if (resultsView) {
  document.querySelector("#edition").textContent = "COMMUNITY POLL · LIVE RESULTS";
  document.querySelector("#poll-title").textContent = "What should we talk about?";
  intro.textContent = "The room decides. Results refresh automatically every 5 seconds.";
  viewLink.href = "/";
  viewLink.innerHTML = 'Back to voting <span aria-hidden="true">↗</span>';
} else {
  viewLink.href = "/?view=votes";
}

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function renderChoices() {
  topicList.replaceChildren();

  for (const topic of topics) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "topic-button";
    button.disabled = isVoting;
    button.setAttribute("aria-label", `Vote for ${topic.label}`);

    const label = document.createElement("span");
    label.textContent = topic.label;
    const mark = document.createElement("span");
    mark.className = "vote-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "VOTE ↗";

    button.append(label, mark);
    button.addEventListener("click", () => castVote(topic.id));
    topicList.append(button);
  }
}

function renderResults(voteData) {
  topicList.replaceChildren();
  const leadingVotes = Math.max(...voteData.topics.map((topic) => topic.votes));

  if (voteData.totalVotes === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-results";
    empty.textContent = "No votes yet. Be the first to pick a topic!";
    topicList.append(empty);
    return;
  }

  for (const topic of voteData.topics) {
    const row = document.createElement("div");
    row.className = "result-row";
    row.classList.toggle("is-leading", topic.votes === leadingVotes);

    const label = document.createElement("div");
    label.className = "result-label";
    const name = document.createElement("span");
    name.textContent = topic.label;
    const count = document.createElement("span");
    count.className = "result-count";
    count.textContent = `${topic.votes} ${topic.votes === 1 ? "VOTE" : "VOTES"} · ${Math.round((topic.votes / voteData.totalVotes) * 100)}%`;
    label.append(name, count);

    const track = document.createElement("div");
    track.className = "bar-track";
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-label", `${topic.label}: ${topic.votes} votes`);
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", String(voteData.totalVotes));
    track.setAttribute("aria-valuenow", String(topic.votes));
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = `${(topic.votes / leadingVotes) * 100}%`;
    track.append(fill);
    row.append(label, track);
    topicList.append(row);
  }
}

async function loadVotes() {
  try {
    const response = await fetch("/api/votes", { cache: "no-store" });
    if (!response.ok) throw new Error("The poll could not be reached.");
    const voteData = await response.json();
    if (resultsView) {
      renderResults(voteData);
      setStatus(`${voteData.totalVotes} ${voteData.totalVotes === 1 ? "vote" : "votes"} so far · updated just now`);
    } else {
      setStatus(`${voteData.totalVotes} ${voteData.totalVotes === 1 ? "vote" : "votes"} cast so far.`);
    }
  } catch {
    setStatus("The poll is temporarily unavailable. Please try again in a moment.", true);
  }
}

async function castVote(topicId) {
  if (isVoting) return;
  isVoting = true;
  renderChoices();
  setStatus("Saving your vote…");

  try {
    const response = await fetch("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId }),
    });
    if (!response.ok) throw new Error("Your vote could not be saved.");
    const voteData = await response.json();
    setStatus("Your vote is in! Thanks for helping choose the panel.");
    if (resultsView) renderResults(voteData);
  } catch {
    setStatus("Your vote could not be saved. Please try again.", true);
  } finally {
    isVoting = false;
    if (!resultsView) renderChoices();
  }
}

if (resultsView) {
  loadVotes();
  window.setInterval(loadVotes, 5000);
} else {
  renderChoices();
  loadVotes();
}
