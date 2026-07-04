// setup.js — Hack Club / NPC toggle layer for Debate Arena
// Injects a tab switcher above the existing setup panel.
// Does NOT touch any Firebase, arena, or debate logic.

(function () {

  // ── 1. Build the tab + key UI HTML ────────────────────────────────────────
  const tabHTML = `
    <div id="provider-tabs">
      <button class="ptab active-hc" id="tab-hc" onclick="selectTab('hc')">
        🟢 Hack Club AI <span class="hc-badge">FREE</span>
      </button>
      <button class="ptab" id="tab-npc" onclick="selectTab('npc')">
        ⚔️ NPC Mode <span class="npc-badge">YOUR KEY</span>
      </button>
    </div>

    <!-- Hack Club key row -->
    <div id="hc-key-row">
      <div class="grid-2">
        <div class="input-group" style="margin-bottom:0;">
          <label>Hack Club AI Model</label>
          <select id="hc-model">
            <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
            <option value="deepseek/deepseek-v3.2">DeepSeek V3</option>
            <option value="moonshotai/kimi-k2-0905">Kimi K2</option>
            <option value="qwen/qwen3-32b">Qwen3 32B</option>
          </select>
        </div>
        <div class="input-group" style="margin-bottom:0;">
          <label>
            Hack Club AI Key
            <a href="https://ai.hackclub.com" target="_blank"
               style="text-transform:none; color:var(--primary); font-weight:400; font-size:0.78rem; margin-left:0.35rem;">
              get free key →
            </a>
          </label>
          <input type="password" id="hc-api-key" placeholder="hc-...">
          <span class="provider-hint">// Free for all Hack Clubbers. No card needed.</span>
        </div>
      </div>
    </div>

    <!-- NPC (own key) row -->
    <div id="npc-key-row" style="display:none;">
      <div class="grid-2">
        <div class="input-group" style="margin-bottom:0;">
          <label>Provider</label>
          <select id="ai-engine" onchange="toggleKeyPlaceholder()">
            <option value="gemini">Google Gemini</option>
            <option value="openai">OpenAI (gpt-4o-mini)</option>
            <option value="claude">Anthropic Claude (haiku)</option>
          </select>
        </div>
        <div class="input-group" style="margin-bottom:0;">
          <label>Your Provider Key</label>
          <input type="password" id="api-key" placeholder="AIzaSy...">
          <span class="provider-hint">// Stays on your device. Never sent to our servers.</span>
        </div>
      </div>
    </div>
  `;

  // ── 2. Inject above the first .grid-2 inside #setup-panel ─────────────────
  const setupPanel = document.getElementById('setup-panel');
  const firstGrid  = setupPanel.querySelector('.grid-2');
  const wrapper    = document.createElement('div');
  wrapper.innerHTML = tabHTML;
  setupPanel.insertBefore(wrapper, firstGrid);

  // ── 3. Hide the original engine+key grid (we replaced it) ─────────────────
  // The original grid-2 that has #ai-engine and #api-key
  // We still need #ai-engine in the DOM for the NPC tab above, so we
  // just remove the OLD grid that had the original selects.
  // Find it by checking which grid-2 contains the original #ai-engine select
  const allGrids = setupPanel.querySelectorAll('.grid-2');
  allGrids.forEach(grid => {
    if (grid.contains(document.getElementById('ai-engine')) ||
        grid.querySelector('select[id="ai-engine"]')) {
      // This is the OLD provider grid — hide it (our new one is already injected)
    }
  });
  // Actually the original #ai-engine select is now inside our injected HTML,
  // so the original grid that had it is gone. Nothing more to do.

  // ── 4. Tab switcher logic ──────────────────────────────────────────────────
  window.selectTab = function (tab) {
    const hcRow  = document.getElementById('hc-key-row');
    const npcRow = document.getElementById('npc-key-row');
    const tabHC  = document.getElementById('tab-hc');
    const tabNPC = document.getElementById('tab-npc');

    if (tab === 'hc') {
      hcRow.style.display  = 'block';
      npcRow.style.display = 'none';
      tabHC.className  = 'ptab active-hc';
      tabNPC.className = 'ptab';
    } else {
      hcRow.style.display  = 'none';
      npcRow.style.display = 'block';
      tabHC.className  = 'ptab';
      tabNPC.className = 'ptab active-npc';
    }
  };

  // ── 5. Key placeholder updater for NPC tab ────────────────────────────────
  window.toggleKeyPlaceholder = function () {
    const engine   = document.getElementById('ai-engine').value;
    const keyInput = document.getElementById('api-key');
    if (engine === 'gemini')      keyInput.placeholder = 'AIzaSy...';
    else if (engine === 'openai') keyInput.placeholder = 'sk-proj-...';
    else                          keyInput.placeholder = 'sk-ant-...';
  };

  // ── 6. Patch validateInputs to check the active tab ───────────────────────
  window.validateInputs = function () {
    const name    = document.getElementById('player-name').value.trim();
    const topic   = document.getElementById('debate-topic').value.trim();
    const premise = document.getElementById('player-premise').value.trim();

    if (!name)    { alert('Please enter your handle name.');    return false; }
    if (!topic)   { alert('Please enter a debate topic.');      return false; }
    if (!premise) { alert('Please enter your stance / thesis.'); return false; }

    const isNPC = document.getElementById('npc-key-row').style.display !== 'none';
    if (isNPC) {
      const key = document.getElementById('api-key').value.trim();
      if (!key) { alert('NPC Mode: paste your provider API key.'); return false; }
    } else {
      const hcKey = document.getElementById('hc-api-key').value.trim();
      if (!hcKey) {
        alert('Paste your Hack Club AI key. Get one free at ai.hackclub.com');
        return false;
      }
    }
    return true;
  };

  // ── 7. Expose a resolver so createRoom/joinRoom can grab engine+key ────────
  window.resolveEngineAndKey = function () {
    const isNPC = document.getElementById('npc-key-row').style.display !== 'none';
    if (isNPC) {
      return {
        engine: document.getElementById('ai-engine').value,
        key:    document.getElementById('api-key').value.trim(),
        model:  null
      };
    }
    return {
      engine: 'hackclub',
      key:    document.getElementById('hc-api-key').value.trim(),
      model:  document.getElementById('hc-model').value
    };
  };

})();
