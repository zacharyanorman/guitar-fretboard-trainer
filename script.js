const allNotes = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];
const wholeNotes = ["A", "B", "C", "D", "E", "F", "G"];
const strings = ["E (6th)", "A", "D", "G", "B", "e (1st)"];

const noteFrequencies = {
  "E (6th)": 82.41,
  "A": 110.00,
  "D": 146.83,
  "G": 196.00,
  "B": 246.94,
  "e (1st)": 329.63
};

const openNotes = {
  "E (6th)": "E",
  "A": "A",
  "D": "D",
  "G": "G",
  "B": "B",
  "e (1st)": "E"
};

const notesInOrder = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];

let currentNote = null;
let currentString = null;
let currentFrequency = null;
let promptStartTime = null;
let listening = false;
let correctCount = 0;
let practiceTimer = null;
let remainingSeconds = 0;
let practiceActive = false;

function generateNote() {
  if (!practiceActive && remainingSeconds === 0) return;

  const activeStrings = strings.filter(s => document.getElementById(`toggle-${s}`)?.checked);
  if (activeStrings.length === 0) {
    alert("Please enable at least one string.");
    return;
  }

  const noteList = document.getElementById("whole-notes-only").checked ? wholeNotes : allNotes;
  currentNote = noteList[Math.floor(Math.random() * noteList.length)];
  currentString = activeStrings[Math.floor(Math.random() * activeStrings.length)];

  document.getElementById("note-display").textContent = `🎯 Play: ${currentNote} on the ${currentString} string`;
  playNote(currentNote, currentString);
  highlightFretboard(currentNote, currentString);
  listenForNote();

  const showFretboard = document.getElementById("show-fretboard").checked;
  document.getElementById("fretboard").style.display = showFretboard ? "table" : "none";

  promptStartTime = Date.now();
}

function playNote(note, stringName) {
  const openNoteLetter = openNotes[stringName];
  const noteIndex = notesInOrder.indexOf(note);
  const openIndex = notesInOrder.indexOf(openNoteLetter);
  let semitoneOffset = noteIndex - openIndex;
  if (semitoneOffset < 0) semitoneOffset += 12;
  const baseFreq = noteFrequencies[stringName];
  currentFrequency = baseFreq * Math.pow(2, semitoneOffset / 12);

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.value = currentFrequency;
  oscillator.detune.value = (Math.random() - 0.5) * 5;

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.7, audioCtx.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 1.3);
}

function listenForNote() {
  if (listening) return;

  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    const buffer = new Float32Array(analyser.fftSize);
    source.connect(analyser);
    listening = true;

    const detect = () => {
      analyser.getFloatTimeDomainData(buffer);
      const pitch = autoCorrelate(buffer, audioCtx.sampleRate);
      if (pitch && Math.abs(pitch - currentFrequency) <= 1.5) {
        const reactionTime = ((Date.now() - promptStartTime) / 1000).toFixed(2);
        document.getElementById("note-display").textContent = `✅ Correct! (Reaction Time: ${reactionTime} sec)`;
        correctCount++;
        stream.getTracks().forEach(t => t.stop());
        listening = false;
        setTimeout(generateNote, 1500);
      } else {
        requestAnimationFrame(detect);
      }
    };
    detect();
  }).catch(err => {
    alert("Microphone access denied or unavailable.");
    console.error(err);
  });
}

function autoCorrelate(buffer, sampleRate) {
  let SIZE = buffer.length;
  let MAX_SAMPLES = Math.floor(SIZE / 2);
  let bestOffset = -1;
  let bestCorrelation = 0;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return null;

  for (let offset = 0; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += buffer[i] * buffer[i + offset];
    }
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestOffset = offset;
    }
  }

  return bestCorrelation > 0.01 ? sampleRate / bestOffset : null;
}

function createFretboard() {
  const table = document.getElementById("fretboard");
  table.innerHTML = "";
  [...strings].reverse().forEach(stringName => {
    const row = document.createElement("tr");
    const labelCell = document.createElement("td");
    labelCell.textContent = stringName;
    labelCell.classList.add("string-label");
    labelCell.id = `label-${stringName}`;
    row.appendChild(labelCell);
    for (let fret = 1; fret <= 12; fret++) {
      const cell = document.createElement("td");
      cell.id = `${stringName}-fret-${fret}`;
      cell.textContent = fret;
      row.appendChild(cell);
    }
    table.appendChild(row);
  });
}

function highlightFretboard(note, stringName) {
  document.querySelectorAll("td").forEach(cell => cell.classList.remove("highlight", "glow"));
  const openNote = openNotes[stringName];
  const openIndex = notesInOrder.indexOf(openNote);
  const noteIndex = notesInOrder.indexOf(note);
  let fret = noteIndex - openIndex;
  if (fret < 0) fret += 12;

  if (fret === 0) {
    document.getElementById(`label-${stringName}`).classList.add("glow");
  } else {
    const cell = document.getElementById(`${stringName}-fret-${fret}`);
    if (cell) cell.classList.add("highlight");
  }
}

function createStringToggles() {
  const container = document.getElementById("string-toggles");
  container.innerHTML = "";
  strings.forEach(stringName => {
    const toggleId = `toggle-${stringName}`;
    const label = document.createElement("label");
    label.classList.add("toggle-label");
    label.innerHTML = `${stringName}
      <label class="switch">
        <input type="checkbox" id="${toggleId}" checked>
        <span class="slider"></span>
      </label>`;
    container.appendChild(label);
  });
}

function updateTimerDisplay() {
  const min = Math.floor(remainingSeconds / 60);
  const sec = remainingSeconds % 60;
  document.getElementById("timer-display").textContent = `⏱️ ${min}:${sec.toString().padStart(2, '0')}`;
}

function startPractice() {
  const minutes = parseInt(document.getElementById("practice-mins").value, 10);
  if (isNaN(minutes) || minutes <= 0) {
    alert("Please enter a valid number of minutes.");
    return;
  }

  correctCount = 0;
  remainingSeconds = minutes * 60;
  practiceActive = true;
  generateNote();
  updateTimerDisplay();

  if (practiceTimer) clearInterval(practiceTimer);
  practiceTimer = setInterval(() => {
    remainingSeconds--;
    updateTimerDisplay();
    if (remainingSeconds <= 0) {
      clearInterval(practiceTimer);
      practiceActive = false;
      document.getElementById("note-display").textContent = `⏰ Time's up! You got ${correctCount} note(s) correct.`;
    }
  }, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
  createStringToggles();
  createFretboard();
  document.getElementById("next-button").addEventListener("click", generateNote);
  document.getElementById("repeat-button").addEventListener("click", () => {
    if (currentNote && currentString) playNote(currentNote, currentString);
  });
  document.getElementById("start-practice").addEventListener("click", startPractice);
});
