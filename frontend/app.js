const audioInput = document.getElementById("audio");
const languageInput = document.getElementById("language");
const formatInput = document.getElementById("format");
const runButton = document.getElementById("run");
const downloadButton = document.getElementById("download");
const statusEl = document.getElementById("status");
const previewEl = document.getElementById("preview");
const bar = document.getElementById("bar");

let latestResult = null;
let latestText = "";

function setStatus(message, percent) {
  statusEl.textContent = message;
  bar.style.width = `${percent}%`;
}

function timeSrt(seconds) {
  const ms = Math.max(0, Math.floor(seconds * 1000));
  const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  const milli = String(ms % 1000).padStart(3, "0");
  return `${h}:${m}:${s},${milli}`;
}

function makeExport(format, data) {
  if (format === "json") {
    return JSON.stringify(data, null, 2);
  }
  if (format === "txt") {
    return data.segments.map(x => x.text).join("\n");
  }
  return data.segments.map((x, i) =>
    `${i + 1}\n${timeSrt(x.start)} --> ${timeSrt(x.end)}\n${x.text}\n`
  ).join("\n");
}

runButton.addEventListener("click", async () => {
  const file = audioInput.files[0];
  if (!file) {
    setStatus("আগে একটি অডিও ফাইল নির্বাচন করো।", 0);
    return;
  }

  const apiBase = (window.APP_CONFIG?.API_BASE || "").replace(/\/$/, "");
  if (!apiBase || apiBase.includes("YOUR-USERNAME")) {
    setStatus("প্রথমে frontend/config.js-এ তোমার Backend URL বসাও।", 0);
    return;
  }

  runButton.disabled = true;
  downloadButton.disabled = true;
  previewEl.textContent = "Processing...";
  setStatus("অডিও Backend-এ পাঠানো হচ্ছে…", 15);

  const form = new FormData();
  form.append("file", file);
  form.append("language", languageInput.value);

  try {
    setStatus("WhisperX অডিও বিশ্লেষণ করছে। অপেক্ষা করো…", 45);
    const response = await fetch(`${apiBase}/transcribe`, {
      method: "POST",
      body: form
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.detail || body.error || `Server error: ${response.status}`);
    }

    latestResult = body;
    latestText = makeExport(formatInput.value, body);
    previewEl.textContent = latestText;
    downloadButton.disabled = false;
    setStatus("সম্পন্ন! এখন Download file চাপো।", 100);
  } catch (err) {
    previewEl.textContent = "Transcription failed.";
    setStatus(`সমস্যা: ${err.message}`, 0);
  } finally {
    runButton.disabled = false;
  }
});

formatInput.addEventListener("change", () => {
  if (latestResult) {
    latestText = makeExport(formatInput.value, latestResult);
    previewEl.textContent = latestText;
  }
});

downloadButton.addEventListener("click", () => {
  if (!latestResult) return;
  const format = formatInput.value;
  const mime = format === "json" ? "application/json" : "text/plain";
  const blob = new Blob([latestText], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transcript.${format}`;
  a.click();
  URL.revokeObjectURL(url);
});
