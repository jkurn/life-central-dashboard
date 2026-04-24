// ══════════════════════════════════════════════════════════
// EMOTION REGULATION — Brackett's RULER applied to this dashboard
// ══════════════════════════════════════════════════════════
// Formula: ER = G + S = f(E + P + C)
//   Goals: prevent / reduce / initiate / maintain / enhance
//   Strategy chosen as a function of Emotion, Person, Context.
//
// State shape (persisted via the existing data-key="er-state" hidden field,
// so it flows through DashboardData → Supabase/localStorage for free):
//
//   {
//     checkins: { "YYYY-MM-DD": { morning?: CheckIn, midday?: CheckIn, evening?: CheckIn } },
//     metaMoments: [ { ts, trigger, breathSeconds, bestSelf, response } ],
//     reflections: { "YYYY-MM-DD": { triggers, response, bestSelfTomorrow } },
//     bestSelf: "the person I want to show up as",
//     streakStart: "YYYY-MM-DD" | null
//   }
//
// CheckIn: { quadrant, label, intensity, note, ts }
// quadrant ∈ {yellow, red, green, blue}
// ══════════════════════════════════════════════════════════

const WINDOWS = [
  { key: 'morning', label: 'Morning',  startHour: 5,  endHour: 11 },
  { key: 'midday',  label: 'Midday',   startHour: 11, endHour: 17 },
  { key: 'evening', label: 'Evening',  startHour: 17, endHour: 23 }
];

const QUADRANTS = {
  yellow: {
    label: 'High energy · Pleasant',
    color: '#eab308',
    bg:    'rgba(234,179,8,0.10)',
    words: ['excited','energized','optimistic','inspired','motivated','joyful','proud','hopeful','elated','cheerful']
  },
  red: {
    label: 'High energy · Unpleasant',
    color: '#dc2626',
    bg:    'rgba(220,38,38,0.10)',
    words: ['anxious','stressed','pressured','frustrated','angry','irritated','tense','overwhelmed','agitated','fearful']
  },
  green: {
    label: 'Low energy · Pleasant',
    color: '#16a34a',
    bg:    'rgba(22,163,74,0.10)',
    words: ['calm','content','serene','grateful','at ease','relaxed','balanced','focused','thoughtful','restored']
  },
  blue: {
    label: 'Low energy · Unpleasant',
    color: '#2563eb',
    bg:    'rgba(37,99,235,0.10)',
    words: ['sad','depleted','discouraged','lonely','hopeless','tired','bored','disappointed','flat','apathetic']
  }
};

// Brackett's vocabulary distinctions — the episode's core teaching.
const VOCAB = [
  { word: 'stress',   def: 'Too many demands, not enough resources.' },
  { word: 'pressure', def: 'Something important is at stake.' },
  { word: 'fear',     def: 'Immediate, concrete danger.' },
  { word: 'anxiety',  def: 'Uncertainty about something in the future that you care about.' }
];

const METAMOMENT_STEPS = [
  { step: 1, title: 'Sense',      copy: 'Notice the trigger. Name the emotion as specifically as you can.' },
  { step: 2, title: 'Pause',      copy: 'Breathe. 90 seconds. Don\'t act yet.' },
  { step: 3, title: 'Best self',  copy: 'Who is the person you want to be in this moment? Describe them.' },
  { step: 4, title: 'Respond',    copy: 'Choose the response your best self would choose.' }
];

const EmotionRegulation = {
  _state: null,
  _stateField: null,

  // ─── State ──────────────────────────────────────────────

  _blankState() {
    return { checkins: {}, metaMoments: [], reflections: {}, bestSelf: '', streakStart: null };
  },

  init() {
    this._stateField = document.getElementById('er-state');
    this._load();
  },

  _load() {
    const raw = this._stateField?.value;
    if (!raw) { this._state = this._blankState(); return; }
    try { this._state = { ...this._blankState(), ...JSON.parse(raw) }; }
    catch { this._state = this._blankState(); }
  },

  _persist() {
    if (!this._stateField) return;
    this._stateField.value = JSON.stringify(this._state);
    if (window.DashboardData) DashboardData.debouncedSave();
  },

  // ─── Time windows ───────────────────────────────────────

  _today() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  },

  _currentWindow() {
    const h = new Date().getHours();
    return WINDOWS.find(w => h >= w.startHour && h < w.endHour) || null;
  },

  _windowDone(dateKey, windowKey) {
    return !!this._state.checkins[dateKey]?.[windowKey];
  },

  _todayDone() {
    const d = this._state.checkins[this._today()] || {};
    return WINDOWS.every(w => !!d[w.key]);
  },

  _computeStreak() {
    let streak = 0;
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    // Walk backwards day by day as long as each day has all 3 windows + reflection.
    for (let i = 0; i < 3650; i++) {
      const key = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
      const cks = this._state.checkins[key] || {};
      const hasAll = WINDOWS.every(w => !!cks[w.key]);
      const hasReflection = !!this._state.reflections[key];
      // Today is allowed to be partially done without breaking a streak in progress.
      if (i === 0) {
        if (!hasAll || !hasReflection) { d.setDate(d.getDate() - 1); continue; }
      }
      if (!hasAll || !hasReflection) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  },

  _complianceToday() {
    const d = this._state.checkins[this._today()] || {};
    const done = WINDOWS.filter(w => !!d[w.key]).length;
    const reflectionDone = !!this._state.reflections[this._today()] ? 1 : 0;
    return { done, total: WINDOWS.length + 1, reflectionDone };
  },

  // ─── Gate decision ──────────────────────────────────────
  //
  // The "impossible to not become a master" guardrail:
  //   - If we're inside a window and that window's check-in is not done,
  //     the gate blocks the app until the check-in completes.
  //   - If the most recent check-in was red-quadrant and no Meta-Moment
  //     has been logged since, the gate demands a Meta-Moment.
  //   - After 19:00 the gate requires the EOD reflection.
  //
  // We never gate when the page loads silently in the background (the
  // gate only activates after the user interacts or on load after 30s).
  //
  shouldGate() {
    const w = this._currentWindow();
    if (w && !this._windowDone(this._today(), w.key)) {
      return { kind: 'checkin', window: w };
    }
    const last = this._mostRecentCheckin();
    if (last && last.quadrant === 'red' && !this._metaMomentSince(last.ts)) {
      return { kind: 'metamoment', checkin: last };
    }
    const h = new Date().getHours();
    if (h >= 19 && !this._state.reflections[this._today()]) {
      return { kind: 'reflection' };
    }
    return null;
  },

  _mostRecentCheckin() {
    const today = this._state.checkins[this._today()] || {};
    const all = WINDOWS.map(w => today[w.key]).filter(Boolean);
    if (!all.length) return null;
    return all.sort((a, b) => (b.ts || 0) - (a.ts || 0))[0];
  },

  _metaMomentSince(ts) {
    return this._state.metaMoments.some(m => m.ts > ts);
  },

  // ─── Actions ────────────────────────────────────────────

  recordCheckin(windowKey, { quadrant, label, intensity, note }) {
    const day = this._today();
    if (!this._state.checkins[day]) this._state.checkins[day] = {};
    this._state.checkins[day][windowKey] = {
      quadrant, label, intensity, note: note || '', ts: Date.now()
    };
    this._persist();
    this.renderPanel();
    this.updateTopbar();
    this.renderGate();
  },

  recordMetaMoment({ trigger, breathSeconds, bestSelf, response }) {
    this._state.metaMoments.push({
      ts: Date.now(),
      trigger: trigger || '',
      breathSeconds: breathSeconds || 0,
      bestSelf: bestSelf || '',
      response: response || ''
    });
    this._persist();
    this.renderPanel();
    this.updateTopbar();
    this.renderGate();
  },

  recordReflection({ triggers, response, bestSelfTomorrow }) {
    this._state.reflections[this._today()] = {
      triggers: triggers || '',
      response: response || '',
      bestSelfTomorrow: bestSelfTomorrow || '',
      ts: Date.now()
    };
    this._persist();
    this.renderPanel();
    this.updateTopbar();
    this.renderGate();
  },

  setBestSelf(text) {
    this._state.bestSelf = text || '';
    this._persist();
  },

  // ─── UI: topbar ─────────────────────────────────────────

  updateTopbar() {
    const el = document.getElementById('er-compliance');
    if (!el) return;
    const { done, total } = this._complianceToday();
    const streak = this._computeStreak();
    el.innerHTML =
      '<span class="er-dot"></span>' +
      'REGULATE ' + done + '/' + total +
      (streak > 0 ? ' · ' + streak + 'd streak' : '');
    el.className = 'er-compliance' + (done === total ? ' done' : '');
    el.onclick = () => showPanel('regulate');
  },

  // ─── UI: gate overlay ───────────────────────────────────

  renderGate() {
    const gate = document.getElementById('er-gate');
    if (!gate) return;
    const decision = this.shouldGate();
    if (!decision) { gate.classList.remove('show'); gate.innerHTML = ''; return; }
    gate.classList.add('show');
    if (decision.kind === 'checkin')    gate.innerHTML = this._gateCheckinHtml(decision.window);
    if (decision.kind === 'metamoment') gate.innerHTML = this._gateMetaMomentHtml(decision.checkin);
    if (decision.kind === 'reflection') gate.innerHTML = this._gateReflectionHtml();
    this._bindGateEvents(decision.kind);
  },

  _gateCheckinHtml(w) {
    return `
      <div class="er-modal">
        <div class="er-modal-header">
          <div class="er-modal-kicker">Check-in · ${w.label}</div>
          <h2>How are you, right now?</h2>
          <p>You can't skip this. Name it to regulate it.</p>
        </div>
        <div class="er-mood-meter">
          ${['yellow','red','green','blue'].map(q => `
            <button class="er-quad er-quad-${q}" data-quad="${q}" type="button">
              <div class="er-quad-label">${QUADRANTS[q].label}</div>
              <div class="er-quad-words">${QUADRANTS[q].words.slice(0,4).join(' · ')}</div>
            </button>`).join('')}
        </div>
        <div class="er-granular" id="er-granular" hidden>
          <div class="er-subhead">Pick the word that fits — specificity matters.</div>
          <div class="er-words" id="er-words"></div>
          <label class="er-field-label">Intensity (1 low → 5 high)</label>
          <input type="range" min="1" max="5" step="1" value="3" id="er-intensity" class="er-range">
          <label class="er-field-label">One-line note (optional)</label>
          <textarea id="er-note" class="er-textarea" rows="2" placeholder="what's driving this?"></textarea>
          <button id="er-submit" class="er-btn er-btn-primary" disabled>Log check-in</button>
        </div>
        <div class="er-footnote">
          ER = G + S = f(E + P + C). Your regulation strategy depends on the <em>emotion</em>, <em>you</em>, and the <em>context</em>.
        </div>
      </div>`;
  },

  _gateMetaMomentHtml(checkin) {
    return `
      <div class="er-modal">
        <div class="er-modal-header">
          <div class="er-modal-kicker" style="color:${QUADRANTS.red.color}">Meta-Moment required</div>
          <h2>You logged: <em>${this._esc(checkin.label)}</em></h2>
          <p>Red-quadrant emotions get a Meta-Moment before the dashboard unlocks. No skip.</p>
        </div>
        <ol class="er-steps">
          ${METAMOMENT_STEPS.map(s => `<li><b>${s.step}. ${s.title}</b> — ${s.copy}</li>`).join('')}
        </ol>
        <label class="er-field-label">1. What triggered this?</label>
        <textarea id="er-mm-trigger" class="er-textarea" rows="2"></textarea>

        <label class="er-field-label">2. Breath timer</label>
        <div class="er-breath">
          <div class="er-breath-ring" id="er-breath-ring"><span id="er-breath-count">90</span></div>
          <button id="er-breath-start" class="er-btn" type="button">Start 90s breath</button>
          <span id="er-breath-status" class="er-muted">required</span>
        </div>

        <label class="er-field-label">3. Who is your best self here?</label>
        <textarea id="er-mm-best" class="er-textarea" rows="2" placeholder="the calmest / wisest / most patient version of me would...">${this._esc(this._state.bestSelf || '')}</textarea>

        <label class="er-field-label">4. What will you actually do?</label>
        <textarea id="er-mm-response" class="er-textarea" rows="2"></textarea>

        <button id="er-mm-submit" class="er-btn er-btn-primary" disabled>Complete Meta-Moment</button>
      </div>`;
  },

  _gateReflectionHtml() {
    return `
      <div class="er-modal">
        <div class="er-modal-header">
          <div class="er-modal-kicker">End of day · Reflection</div>
          <h2>Before we close the day.</h2>
          <p>Three prompts. Then you're done.</p>
        </div>
        <label class="er-field-label">What triggered me today?</label>
        <textarea id="er-ref-triggers" class="er-textarea" rows="3"></textarea>

        <label class="er-field-label">How did I respond — honestly?</label>
        <textarea id="er-ref-response" class="er-textarea" rows="3"></textarea>

        <label class="er-field-label">What would best-self do differently tomorrow?</label>
        <textarea id="er-ref-best" class="er-textarea" rows="3"></textarea>

        <button id="er-ref-submit" class="er-btn er-btn-primary">Log reflection</button>
      </div>`;
  },

  _bindGateEvents(kind) {
    if (kind === 'checkin')    this._bindCheckinGate();
    if (kind === 'metamoment') this._bindMetaMomentGate();
    if (kind === 'reflection') this._bindReflectionGate();
  },

  _bindCheckinGate() {
    let chosenQuad = null;
    let chosenWord = null;
    const gran = document.getElementById('er-granular');
    const wordsEl = document.getElementById('er-words');
    const submit = document.getElementById('er-submit');

    document.querySelectorAll('.er-quad').forEach(btn => {
      btn.addEventListener('click', () => {
        chosenQuad = btn.dataset.quad;
        chosenWord = null;
        document.querySelectorAll('.er-quad').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        gran.hidden = false;
        wordsEl.innerHTML = QUADRANTS[chosenQuad].words.map(w =>
          `<button type="button" class="er-word" data-word="${w}">${w}</button>`
        ).join('');
        wordsEl.querySelectorAll('.er-word').forEach(wb => {
          wb.addEventListener('click', () => {
            chosenWord = wb.dataset.word;
            wordsEl.querySelectorAll('.er-word').forEach(x => x.classList.remove('selected'));
            wb.classList.add('selected');
            submit.disabled = false;
          });
        });
        submit.disabled = true;
      });
    });

    submit.addEventListener('click', () => {
      if (!chosenQuad || !chosenWord) return;
      const intensity = parseInt(document.getElementById('er-intensity').value, 10);
      const note = document.getElementById('er-note').value;
      const w = this._currentWindow();
      this.recordCheckin(w.key, { quadrant: chosenQuad, label: chosenWord, intensity, note });
    });
  },

  _bindMetaMomentGate() {
    let breathDone = false;
    let breathSeconds = 0;
    const ring = document.getElementById('er-breath-ring');
    const countEl = document.getElementById('er-breath-count');
    const startBtn = document.getElementById('er-breath-start');
    const statusEl = document.getElementById('er-breath-status');
    const submit = document.getElementById('er-mm-submit');

    const inputs = ['er-mm-trigger','er-mm-best','er-mm-response']
      .map(id => document.getElementById(id));

    const refreshSubmit = () => {
      const allFilled = inputs.every(i => i.value.trim().length > 0);
      submit.disabled = !(allFilled && breathDone);
    };
    inputs.forEach(i => i.addEventListener('input', refreshSubmit));

    startBtn.addEventListener('click', () => {
      startBtn.disabled = true;
      statusEl.textContent = 'breathing...';
      ring.classList.add('running');
      let remaining = 90;
      countEl.textContent = remaining;
      const tick = setInterval(() => {
        remaining--;
        breathSeconds++;
        countEl.textContent = remaining;
        if (remaining <= 0) {
          clearInterval(tick);
          ring.classList.remove('running');
          ring.classList.add('done');
          statusEl.textContent = 'done';
          countEl.textContent = '✓';
          breathDone = true;
          refreshSubmit();
        }
      }, 1000);
    });

    submit.addEventListener('click', () => {
      const trigger = inputs[0].value;
      const bestSelf = inputs[1].value;
      const response = inputs[2].value;
      this.setBestSelf(bestSelf);
      this.recordMetaMoment({ trigger, breathSeconds, bestSelf, response });
    });
  },

  _bindReflectionGate() {
    document.getElementById('er-ref-submit').addEventListener('click', () => {
      this.recordReflection({
        triggers: document.getElementById('er-ref-triggers').value,
        response: document.getElementById('er-ref-response').value,
        bestSelfTomorrow: document.getElementById('er-ref-best').value
      });
    });
  },

  // ─── UI: main panel ─────────────────────────────────────

  renderPanel() {
    const root = document.getElementById('er-panel-body');
    if (!root) return;
    const today = this._today();
    const checkins = this._state.checkins[today] || {};
    const reflection = this._state.reflections[today];
    const streak = this._computeStreak();
    const recentMoments = this._state.metaMoments.slice(-5).reverse();

    root.innerHTML = `
      <div class="er-kpis">
        <div class="kpi"><div class="kpi-label">Streak</div><div class="kpi-value">${streak}</div><div class="kpi-sub">days all-complete</div></div>
        <div class="kpi"><div class="kpi-label">Today</div><div class="kpi-value">${this._complianceToday().done}/${this._complianceToday().total}</div><div class="kpi-sub">check-ins + reflection</div></div>
        <div class="kpi"><div class="kpi-label">Meta-Moments</div><div class="kpi-value">${this._state.metaMoments.length}</div><div class="kpi-sub">all time</div></div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-title">Today's check-ins</div>
          <div class="card-subtitle">Three windows. Forced by the gate.</div>
          ${WINDOWS.map(w => {
            const c = checkins[w.key];
            return `<div class="er-row ${c ? 'done' : ''}">
              <span class="er-row-label">${w.label}</span>
              <span class="er-row-body">${c
                ? `<span class="er-chip er-chip-${c.quadrant}">${this._esc(c.label)}</span> <span class="er-muted">· ${c.intensity}/5</span>`
                : `<span class="er-muted">pending ${w.startHour}:00–${w.endHour}:00</span>`}</span>
            </div>`;
          }).join('')}
        </div>

        <div class="card">
          <div class="card-title">Best-self identity</div>
          <div class="card-subtitle">"I am a highly well-regulated person."</div>
          <textarea class="field" rows="4" id="er-bestself-text" placeholder="Describe the calmest / wisest / most patient version of you. This appears in every Meta-Moment.">${this._esc(this._state.bestSelf || '')}</textarea>
          <button class="er-btn" id="er-bestself-save" style="margin-top:0.5rem">Save</button>
        </div>
      </div>

      <div class="card section-gap">
        <div class="card-title">Vocabulary — name it precisely</div>
        <div class="card-subtitle">You cannot regulate what you cannot name.</div>
        <div class="er-vocab">
          ${VOCAB.map(v => `<div class="er-vocab-item"><b>${v.word}</b> — ${v.def}</div>`).join('')}
        </div>
      </div>

      <div class="card section-gap">
        <div class="card-title">End-of-day reflection</div>
        ${reflection ? `
          <div class="er-muted" style="margin-bottom:0.5rem">Logged at ${new Date(reflection.ts).toLocaleTimeString()}.</div>
          <div class="er-reflection">
            <div><b>Triggers:</b> ${this._esc(reflection.triggers)}</div>
            <div><b>Response:</b> ${this._esc(reflection.response)}</div>
            <div><b>Tomorrow's best self:</b> ${this._esc(reflection.bestSelfTomorrow)}</div>
          </div>
        ` : `<div class="er-muted">Opens automatically after 19:00.</div>`}
      </div>

      <div class="card section-gap">
        <div class="card-title">Recent Meta-Moments</div>
        ${recentMoments.length === 0
          ? `<div class="er-muted">None yet. Red-quadrant check-ins trigger one automatically.</div>`
          : recentMoments.map(m => `
            <div class="er-moment">
              <div class="er-muted">${new Date(m.ts).toLocaleString()} · ${m.breathSeconds}s breath</div>
              <div><b>Trigger:</b> ${this._esc(m.trigger)}</div>
              <div><b>Best self:</b> ${this._esc(m.bestSelf)}</div>
              <div><b>Response:</b> ${this._esc(m.response)}</div>
            </div>`).join('')}
      </div>
    `;

    const saveBtn = document.getElementById('er-bestself-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.setBestSelf(document.getElementById('er-bestself-text').value);
        if (window.showToast) showToast('Saved');
      });
    }
  },

  _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  },

  // ─── Boot ───────────────────────────────────────────────

  boot() {
    this.init();
    this.renderPanel();
    this.updateTopbar();
    this.renderGate();
    // Re-evaluate gate + topbar every minute (window boundaries, streak ticks).
    setInterval(() => { this.updateTopbar(); this.renderGate(); }, 60 * 1000);
  }
};

window.EmotionRegulation = EmotionRegulation;
