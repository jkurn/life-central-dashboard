// ══════════════════════════════════════════════════════════
// DASHBOARD DATA — Supabase persistence with localStorage fallback
// ══════════════════════════════════════════════════════════

const STORAGE_KEY = 'cal-newport-life-dashboard';

const DashboardData = {
  _user: null,
  _saveTimeout: null,

  init(user) {
    this._user = user;
  },

  // Get all form data from the DOM
  getAllData() {
    const data = {};
    document.querySelectorAll('[data-key]').forEach(el => {
      const key = el.dataset.key;
      if (el.type === 'checkbox') data[key] = el.checked;
      else data[key] = el.value;
    });
    return data;
  },

  // Apply data to the DOM
  applyData(data) {
    if (!data) return;
    document.querySelectorAll('[data-key]').forEach(el => {
      const key = el.dataset.key;
      if (key in data) {
        if (el.type === 'checkbox') el.checked = data[key];
        else el.value = data[key];
      }
    });
  },

  // Save to both Supabase and localStorage
  async save() {
    const data = this.getAllData();

    // Always save to localStorage as fallback
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    // Save to Supabase if authenticated
    if (this._user) {
      try {
        const { error } = await supabase
          .from('dashboard_data')
          .upsert({
            user_id: this._user.id,
            data: data,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

        if (error) {
          console.warn('Supabase save failed, using localStorage:', error.message);
        }
      } catch (e) {
        console.warn('Supabase unavailable, using localStorage');
      }
    }
  },

  // Load from Supabase first, then localStorage fallback
  async load() {
    // Try Supabase first
    if (this._user) {
      try {
        const { data, error } = await supabase
          .from('dashboard_data')
          .select('data')
          .eq('user_id', this._user.id)
          .single();

        if (!error && data?.data) {
          this.applyData(data.data);
          // Sync to localStorage
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.data));
          return;
        }
      } catch (e) {
        console.warn('Supabase load failed, trying localStorage');
      }
    }

    // Fallback to localStorage
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.applyData(JSON.parse(raw));
      }
    } catch (e) {
      console.warn('localStorage load failed', e);
    }
  },

  // Debounced save (call on every input change)
  debouncedSave() {
    clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => this.save(), 1500);
  },

  // Clear all data
  async clearAll() {
    if (!confirm('Clear all dashboard data? This cannot be undone.')) return false;

    localStorage.removeItem(STORAGE_KEY);

    if (this._user) {
      try {
        await supabase
          .from('dashboard_data')
          .delete()
          .eq('user_id', this._user.id);
      } catch (e) { /* silent */ }
    }

    document.querySelectorAll('[data-key]').forEach(el => {
      if (el.type === 'checkbox') el.checked = false;
      else el.value = '';
    });

    return true;
  },

  // Export as JSON
  exportJSON() {
    const data = this.getAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `life-dashboard-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
