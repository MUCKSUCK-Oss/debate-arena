// app.js — Debate Arena core game logic
// Handles Firebase rooms, AI turn engine, and arena UI state.

let currentRoomCode = null;
let playerSide = null;
let localApiKey = null;
let localEngine = 'hackclub';
let isProcessing = false;
let renderedTurns = new Set();

// ── Theme toggle ───────────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  document.getElementById('theme-toggle').textContent = isDark ? '🌙' : '☀️';
}
window.toggleTheme = toggleTheme;

// Set initial icon
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = '☀️';
});

// ── Input validation ───────────────────────────────────────
function validateInputs() {
  const name    = document.getElementById('player-name').value.trim();
  const topic   = document.getElementById('debate-topic').value.trim();
  const premise = document.getElementById('player-premise').value.trim();

  if (!name)    { alert('Please enter your handle name.'); return false; }
  if (!topic)   { alert('Please enter a debate topic.'); return false; }
  if (!premise) { alert('Please enter your stance / premise.'); return false; }

  const isNPC = document.getElementById('npc-key-row') &&
                document.getElementById('npc-key-row').style.display !== 'none';
  if (isNPC) {
    const key = document.getElementById('api-key').value.trim();
    if (!key) { alert('NPC Mode: paste your provider API key.'); return false; }
  } else {
    const hcKey = document.getElementById('hc-api-key') &&
                  document.getElementById('hc-api-key').value.trim();
    if (!hcKey) {
      alert('Paste your Hack Club AI key. Get one free at ai.hackclub.com');
      return false;
    }
  }
  return true;
}

function toggleKeyPlaceholder() {
  const engine   = document.getElementById('ai-engine').value;
  const keyInput = document.getElementById('api-key');
  if (engine === 'gemini')      keyInput.placeholder = 'AIzaSy...';
  else if (engine === 'openai') keyInput.placeholder = 'sk-proj-...';
  else                          keyInput.placeholder = 'sk-ant-...';
}
window.toggleKeyPlaceholder = toggleKeyPlaceholder;

// ── Multi-engine AI router ─────────────────────────────────
async function invokeModelEndpoint(engine, key, systemPrompt, userMessage) {

  if (engine === 'gemini') {
    const models = [
      'gemini-2.0-flash',
      'gemini-2.5-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];
    const payload = {
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nPrompt: ${userMessage}` }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
    };
    let lastError = null;
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${key}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.status === 404 || res.status === 429) {
          lastError = new Error(`Model ${model} not available (HTTP ${res.status})`);
          continue;
        }
        const data = await res.json();
        if (data.error) {
          const msg = data.error.message || '';
          const code = data.error.code || 0;
          if (code === 404 || code === 429 ||
              msg.includes('not found') || msg.includes('not supported') ||
              msg.includes('deprecated') || msg.includes('quota')) {
            lastError = new Error(msg);
            continue;
          }
          throw new Error(msg);
        }
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
          throw new Error("Empty response from Gemini.");
        }
        return data.candidates[0].content.parts[0].text;
      } catch (e) {
        const msg = e.message || '';
        if (msg.includes('not found') || msg.includes('not supported') ||
            msg.includes('deprecated') || msg.includes('quota') ||
            msg.includes('HTTP 404') || msg.includes('HTTP 429')) {
          lastError = e;
          continue;
        }
        throw e;
      }
    }
    throw lastError || new Error("All Gemini models failed. Check your API key.");
  }

  else if (engine === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
        temperature: 0.7
      })
    });
    if (!res.ok) throw new Error((await res.json()).error?.message || "OpenAI gateway refusal.");
    return (await res.json()).choices[0].message.content;
  }

  else if (engine === 'claude') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }]
      })
    });
    if (!res.ok) throw new Error((await res.json()).error?.message || "Anthropic node rejection.");
    return (await res.json()).content[0].text;
  }

  else if (engine === 'hackclub') {
    const res = await fetch('https://debate-proxy.moliekkaushik.workers.dev', {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: window._hcModel || 'google/gemini-2.5-flash',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
        max_tokens: 300,
        temperature: 0.7
      })
    });
    if (!res.ok) throw new Error((await res.json()).error?.message || 'Hack Club AI error. Check your key at ai.hackclub.com');
    return (await res.json()).choices[0].message.content;
  }
}

// ── UI helpers ─────────────────────────────────────────────
function appendTextBubble(role, identity, text) {
  const box = document.getElementById('chat-box');
  const b = document.createElement('div');
  b.className = `bubble ${role}`;
  b.innerHTML = `<div class="meta">${identity}</div><div>${text.replace(/\n/g, '<br>')}</div>`;
  box.appendChild(b);
  box.scrollTop = box.scrollHeight;
}

function enterArenaView(code, topic) {
  renderedTurns.clear();
  document.getElementById('chat-box').innerHTML = '';
  document.getElementById('setup-panel').style.display = 'none';
  document.getElementById('arena-panel').style.display = 'block';
  document.getElementById('active-topic-title').innerText = topic;
  document.getElementById('room-display-id').innerText = `ROOM ID: ${code}`;
}

function updateStatusDisplayOnly(session) {
  const statusText = document.getElementById('status-console');
  if (session.status === "waiting") {
    statusText.innerText = `Waiting for another player to join (Room Code: ${currentRoomCode})...`;
  } else if (session.status === "ready") {
    statusText.innerText = `Waiting for ${session.player_A.name}'s opening statement...`;
  } else if (session.status === "turn_b_opening") {
    statusText.innerText = `Waiting for ${session.player_B.name}'s opening statement...`;
  } else if (session.status === "turn_a_rebuttal") {
    statusText.innerText = `Waiting for ${session.player_A.name}'s rebuttal...`;
  } else if (session.status === "turn_b_rebuttal") {
    statusText.innerText = `Waiting for ${session.player_B.name}'s rebuttal...`;
  } else if (session.status === "judge_verdict") {
    statusText.innerText = `Waiting for judge's verdict...`;
  } else if (session.status === "completed") {
    statusText.innerText = "Debate complete.";
  }
}

function handleSimulationError(err) {
  console.error(err);
  isProcessing = false;
  const statusText = document.getElementById('status-console');
  statusText.innerHTML = `<span style="color:var(--danger)">Crashed: ${err.message}</span> <button onclick="resetApp()" class="secondary-btn" style="width:auto;display:inline-block;padding:0.3rem 0.8rem;font-size:0.8rem;margin-left:0.5rem;">Start Over</button>`;
  appendTextBubble('judge', '⚠️ Connection / API Error', `The simulation encountered an error: ${err.message}. Ensure your Hack Club API Token is valid.`);
}

window.resetApp = function () {
  currentRoomCode = null;
  playerSide = null;
  localApiKey = null;
  localEngine = 'hackclub';
  isProcessing = false;
  renderedTurns.clear();
  document.getElementById('arena-panel').style.display = 'none';
  document.getElementById('setup-panel').style.display = 'block';
  document.getElementById('status-console').innerText = "Synchronizing room pipes...";
  document.getElementById('chat-box').innerHTML = '';
};

// ── Turn engine ────────────────────────────────────────────
async function executeTurnEngineOrchestration(session) {
  if (isProcessing) return;

  let isOurTurn = false;
  if (session.status === "ready" && playerSide === 'side-a') isOurTurn = true;
  else if (session.status === "turn_b_opening" && playerSide === 'side-b') isOurTurn = true;
  else if (session.status === "turn_a_rebuttal" && playerSide === 'side-a') isOurTurn = true;
  else if (session.status === "turn_b_rebuttal" && playerSide === 'side-b') isOurTurn = true;
  else if (session.status === "judge_verdict" && playerSide === 'side-a') isOurTurn = true;

  if (!isOurTurn) { updateStatusDisplayOnly(session); return; }

  isProcessing = true;
  const { ref, push, update, db } = window.dbRefs;
  const statusText = document.getElementById('status-console');

  try {
    if (session.status === "ready") {
      statusText.innerText = "⚡ Generating Side A opening...";
      const sys = `You are a professional debate agent representing "${session.player_A.name}". Defend the stance: "${session.topic}". Limit your output to 3 short sentences.`;
      const text = await invokeModelEndpoint(localEngine, localApiKey, sys, `Thesis: ${session.player_A.premise}. Begin.`);
      await push(ref(db, `rooms/${currentRoomCode}/turns`), { sender: 'side-a', label: `${session.player_A.name} (Opening)`, text });
      await update(ref(db, `rooms/${currentRoomCode}`), { status: "turn_b_opening" });
    }

    else if (session.status === "turn_b_opening") {
      statusText.innerText = "⚡ Generating Side B opening...";
      const sys = `You are a professional debate agent representing "${session.player_B.name}". Oppose the stance: "${session.topic}". Limit your output to 3 short sentences.`;
      const text = await invokeModelEndpoint(localEngine, localApiKey, sys, `Thesis: ${session.player_B.premise}. Begin.`);
      await push(ref(db, `rooms/${currentRoomCode}/turns`), { sender: 'side-b', label: `${session.player_B.name} (Opening)`, text });
      await update(ref(db, `rooms/${currentRoomCode}`), { status: "turn_a_rebuttal" });
    }

    else if (session.status === "turn_a_rebuttal") {
      statusText.innerText = "⚡ Side A rebuttal...";
      const turnsArray = Object.entries(session.turns).sort((a, b) => a[0].localeCompare(b[0])).map(e => e[1]);
      const opponentOpening = turnsArray[1].text;
      const sys = `You are a professional debate agent representing "${session.player_A.name}". Critique your opponent's opening argument. Limit to 3 short sentences.`;
      const text = await invokeModelEndpoint(localEngine, localApiKey, sys, `Opponent Opening: ${opponentOpening}. Provide rebuttal.`);
      await push(ref(db, `rooms/${currentRoomCode}/turns`), { sender: 'side-a', label: `${session.player_A.name} (Rebuttal)`, text });
      await update(ref(db, `rooms/${currentRoomCode}`), { status: "turn_b_rebuttal" });
    }

    else if (session.status === "turn_b_rebuttal") {
      statusText.innerText = "⚡ Side B rebuttal...";
      const turnsArray = Object.entries(session.turns).sort((a, b) => a[0].localeCompare(b[0])).map(e => e[1]);
      const sideARebuttal = turnsArray[2].text;
      const sys = `You are a professional debate agent representing "${session.player_B.name}". Counter the rebuttal. Limit to 3 short sentences.`;
      const text = await invokeModelEndpoint(localEngine, localApiKey, sys, `Opponent Rebuttal: ${sideARebuttal}. Provide counter.`);
      await push(ref(db, `rooms/${currentRoomCode}/turns`), { sender: 'side-b', label: `${session.player_B.name} (Rebuttal)`, text });
      await update(ref(db, `rooms/${currentRoomCode}`), { status: "judge_verdict" });
    }

    else if (session.status === "judge_verdict") {
      statusText.innerText = "⚖️ Judge deliberating...";
      const turnsArray = Object.entries(session.turns).sort((a, b) => a[0].localeCompare(b[0])).map(e => e[1]);
      const logData = turnsArray.map(t => `${t.label}: ${t.text}`).join('\n\n');
      const sys = "You are a completely neutral, analytical courtroom judge analyzing a debate transcript. Pick a clear winner based on logic and structure. Keep your total answer precisely between 4-5 sentences.";
      const text = await invokeModelEndpoint(localEngine, localApiKey, sys, `Debate Log:\n${logData}\n\nDetermine winner.`);
      await push(ref(db, `rooms/${currentRoomCode}/turns`), { sender: 'judge', label: "⚖️ Final Verdict", text });
      await update(ref(db, `rooms/${currentRoomCode}`), { status: "completed" });
    }
  } catch(e) {
    handleSimulationError(e);
  } finally {
    isProcessing = false;
  }
}

// ── Firebase room listeners ────────────────────────────────
function listenToArenaSession(code) {
  const { ref, onValue, db } = window.dbRefs;
  onValue(ref(db, `rooms/${code}`), async (snapshot) => {
    const session = snapshot.val();
    if (!session) return;
    if (session.turns) {
      const sortedKeys = Object.keys(session.turns).sort();
      sortedKeys.forEach(k => {
        if (!renderedTurns.has(k)) {
          const t = session.turns[k];
          appendTextBubble(t.sender, t.label, t.text);
          renderedTurns.add(k);
        }
      });
    }
    executeTurnEngineOrchestration(session);
  });
}

// ── Room creation ──────────────────────────────────────────
window.createRoom = function () {
  if (!validateInputs()) return;

  const name = document.getElementById('player-name').value.trim();
  const { engine, key, model } = window.resolveEngineAndKey
    ? window.resolveEngineAndKey()
    : { engine: document.getElementById('ai-engine').value, key: document.getElementById('api-key').value.trim(), model: null };

  localEngine = engine;
  localApiKey = key;
  window._hcModel = model;

  const premise = document.getElementById('player-premise').value.trim();
  const topic   = document.getElementById('debate-topic').value.trim();
  const code    = Math.floor(1000 + Math.random() * 9000).toString();

  const setupData = {
    topic,
    status: "waiting",
    player_A: { name, engine: localEngine, premise }
  };

  playerSide = 'side-a';
  currentRoomCode = code;

  const { set, ref, db } = window.dbRefs;
  set(ref(db, `rooms/${code}`), setupData).then(() => {
    enterArenaView(code, topic);
    listenToArenaSession(code);
  }).catch(e => alert("Firebase error: " + e.message));
};

// ── Room joining ───────────────────────────────────────────
window.joinRoom = function () {
  const code = document.getElementById('room-id-input').value.trim();
  if (!code) return alert("Supply target room sequence.");
  if (!validateInputs()) return;

  const name = document.getElementById('player-name').value.trim();
  const { engine, key, model } = window.resolveEngineAndKey
    ? window.resolveEngineAndKey()
    : { engine: document.getElementById('ai-engine').value, key: document.getElementById('api-key').value.trim(), model: null };

  localEngine = engine;
  localApiKey = key;
  window._hcModel = model;

  const premise = document.getElementById('player-premise').value.trim();
  playerSide = 'side-b';
  currentRoomCode = code;

  const { ref, update, db, onValue } = window.dbRefs;
  onValue(ref(db, `rooms/${code}`), (snapshot) => {
    const data = snapshot.val();
    if (!data) return alert("Target arena space array missing.");
    if (data.status === "waiting") {
      window.dbRefs.update(ref(db, `rooms/${code}`), {
        status: "ready",
        player_B: { name, engine: localEngine, premise }
      }).then(() => {
        enterArenaView(code, data.topic);
        listenToArenaSession(code);
      }).catch(e => alert("Firebase error: " + e.message));
    } else {
      alert("This room is already full or has already started.");
    }
  }, { onlyOnce: true });
};
