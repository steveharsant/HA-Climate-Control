/*!
 * HA Climate Control  v0.1.0
 * https://github.com/steveharsant/HA-Climate-Control
 *
 * Registers two Lovelace cards:
 *   custom:smart-room-hvac-card  - generic card; one-click setup of helpers + automation for any climate entity
 *   custom:room-hvac-card        - the control card itself (used by the smart card; usable standalone)
 */
(function () {
  if (customElements.get('room-hvac-card')) return;

  var STEP = 0.5;
  var GAP = 1;

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function num(s, d) {
    var n = parseFloat(s && s.state);
    return isNaN(n) ? d : n;
  }
  function fmt(v) { return String(Math.round(v * 2) / 2); }
  function cap(s) { s = String(s).replace('_', ' '); return s.charAt(0).toUpperCase() + s.slice(1); }

  var CSS = [
    ':host{display:block}',
    'ha-card{padding:16px;overflow:hidden}',
    '.head{display:flex;justify-content:space-between;align-items:flex-start;cursor:pointer}',
    '.name{font-size:18px;font-weight:600;color:var(--primary-text-color)}',
    '.status{display:flex;align-items:center;gap:6px;margin-top:4px;font-size:13px;color:var(--secondary-text-color)}',
    '.dot{width:8px;height:8px;border-radius:50%;background:var(--disabled-text-color,#888);flex:none}',
    '.dot.heat,.dot.heating{background:var(--rhc-heat,#ff7043)}',
    '.dot.cool,.dot.cooling{background:var(--rhc-cool,#42a5f5)}',
    '.dot.fan,.dot.fan_only{background:var(--rhc-fan,#9ccc65)}',
    '.cur{font-size:34px;font-weight:300;line-height:1;color:var(--primary-text-color);white-space:nowrap}',
    '.cur small{font-size:14px;color:var(--secondary-text-color);margin-left:2px}',
    '.err{margin:10px 0 0;padding:8px 10px;border-radius:8px;font-size:12px;color:var(--error-color,#f44);background:rgba(244,67,54,.12)}',
    '.modes{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0 12px}',
    '.mode{display:flex;flex-direction:column;align-items:center;gap:2px;padding:9px 0;border:0;border-radius:12px;',
    'background:var(--secondary-background-color,rgba(127,127,127,.15));color:var(--secondary-text-color);',
    'font:inherit;font-size:12px;cursor:pointer;transition:background .15s,color .15s}',
    '.mode.on{color:#fff;background:var(--primary-color)}',
    '.mode.on.heat{background:var(--rhc-heat,#ff7043)}',
    '.mode.on.cool{background:var(--rhc-cool,#42a5f5)}',
    '.mode.on.fan_only{background:var(--rhc-fan,#7cb342)}',
    '.mode.on.off{background:var(--state-inactive-color,#616161)}',
    '.row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:12px;',
    'background:var(--secondary-background-color,rgba(127,127,127,.15))}',
    '.row+.row{margin-top:8px}',
    '.lbl{display:flex;flex-direction:column;min-width:0;flex:1}',
    '.lbl b{font-weight:500;font-size:14px;color:var(--primary-text-color)}',
    '.lbl span{font-size:12px;color:var(--secondary-text-color)}',
    '.sw{position:relative;width:44px;height:26px;border-radius:13px;border:0;padding:0;flex:none;cursor:pointer;',
    'background:var(--switch-unchecked-track-color,rgba(127,127,127,.5));transition:background .15s}',
    '.sw:after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .15s}',
    '.sw.on{background:var(--primary-color)}',
    '.sw.on:after{transform:translateX(18px)}',
    '.sec{display:flex;justify-content:space-between;margin:18px 0 8px;font-size:12px;font-weight:600;',
    'letter-spacing:.06em;text-transform:uppercase;color:var(--secondary-text-color)}',
    '.body{transition:opacity .2s;display:flex;flex-direction:column}',
    '.body[hidden]{display:none}',
    '.body .more{order:1}',
    '.body .exp{order:2}',
    '.range{padding:30px 14px 4px}',
    '.track{position:relative;height:10px;border-radius:5px;background:var(--divider-color,#444);touch-action:none}',
    '.z{position:absolute;top:0;bottom:0;opacity:.9}',
    '.z.h{left:0;border-radius:5px 0 0 5px;background:var(--rhc-heat,#ff7043)}',
    '.z.o{background:var(--rhc-ok,#4caf7a)}',
    '.z.c{right:0;border-radius:0 5px 5px 0;background:var(--rhc-cool,#42a5f5)}',
    '.now{position:absolute;top:-5px;width:2px;height:20px;margin-left:-1px;border-radius:1px;background:var(--primary-text-color);opacity:.75;pointer-events:none}',
    '.th{position:absolute;top:50%;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:#fff;',
    'box-shadow:0 1px 5px rgba(0,0,0,.5);cursor:grab;outline:none;touch-action:none}',
    '.th.drag{cursor:grabbing;transform:scale(1.12)}',
    '.th:focus-visible{box-shadow:0 0 0 3px var(--primary-color)}',
    '.tip{position:absolute;bottom:32px;left:50%;transform:translateX(-50%);font-size:12px;font-weight:600;white-space:nowrap;color:var(--primary-text-color)}',
    '.scale{display:flex;justify-content:space-between;margin-top:12px;font-size:11px;color:var(--secondary-text-color)}',
    '.legend{display:flex;justify-content:space-between;margin:10px 2px 12px;font-size:12px;color:var(--secondary-text-color)}',
    '.legend i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px}',
    '.step{display:flex;align-items:center;gap:8px;flex:none}',
    '.step button{width:30px;height:30px;border-radius:50%;border:0;font-size:18px;line-height:1;cursor:pointer;',
    'background:var(--card-background-color);color:var(--primary-text-color)}',
    '.step output{min-width:40px;text-align:center;font-weight:600;color:var(--primary-text-color)}',
    '.hint{margin:8px 4px 0;font-size:12px;color:var(--secondary-text-color)}',
    '.hint.warn{color:var(--error-color,#f44)}',
    '.exp{display:flex;align-items:center;justify-content:center;gap:4px;width:100%;margin:14px 0 0;padding:8px;border:0;border-radius:10px;',
    'background:none;color:var(--secondary-text-color);font:inherit;font-size:13px;cursor:pointer}',
    '.exp ha-icon{--mdc-icon-size:20px;transition:transform .2s}',
    '.exp.open ha-icon{transform:rotate(180deg)}',
    '.more[hidden]{display:none}',
    'input[type=time]{font:inherit;color:var(--primary-text-color);background:var(--card-background-color);',
    'border:1px solid var(--divider-color);border-radius:8px;padding:6px 8px;color-scheme:dark light;flex:none}'
  ].join('');

  var MODES = [['off', 'mdi:power', 'Off'], ['heat', 'mdi:fire', 'Heat'], ['cool', 'mdi:snowflake', 'Cool'], ['fan_only', 'mdi:fan', 'Fan']];

  class RoomHvacCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._opt = {};
      this._open = false;
      this._drag = null;
      this._key = '';
    }

    setConfig(c) {
      if (!c || !c.climate) throw new Error('room-hvac-card: "climate" is required');
      if (!c.prefix && !c.entities) throw new Error('room-hvac-card: "prefix" is required');
      var p = c.prefix;
      this._c = c;
      this._e = Object.assign({
        enabled: 'input_boolean.' + p + '_enabled',
        max: 'input_number.' + p + '_max_temp',
        min: 'input_number.' + p + '_min_temp',
        off: 'input_number.' + p + '_target_offset',
        fan: 'input_boolean.' + p + '_fan_only_start',
        fanT: 'input_datetime.' + p + '_fan_only_start_time',
        offOn: 'input_boolean.' + p + '_off_enabled',
        offT: 'input_datetime.' + p + '_off_time',
        st: 'input_select.' + p + '_auto_state'
      }, c.entities || {});
      try {
        var sv = localStorage.getItem('room-hvac-card:' + c.climate);
        this._open = sv === null ? !!c.expanded : sv === '1';
      } catch (err) { this._open = !!c.expanded; }
      this._build();
      this._key = '';
      this._render();
    }

    set hass(h) {
      this._hass = h;
      var ids = [this._c && this._c.climate, this._c && this._c.temperature].concat(this._e ? Object.keys(this._e).map(function (k) { return this._e[k]; }, this) : []);
      var key = ids.map(function (i) { var s = h.states[i]; return s ? s.last_updated + s.state : '-'; }).join('|');
      if (key === this._key && !this._drag) return;
      this._key = key;
      this._render();
    }

    getCardSize() { return 10; }
    getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }
    static getStubConfig() {
      return { name: 'Room', climate: 'climate.room', temperature: 'sensor.room_temperature', prefix: 'room_hvac' };
    }

    _call(domain, service, data) { if (this._hass) this._hass.callService(domain, service, data); }
    _toggle(id) { this._call('input_boolean', 'toggle', { entity_id: id }); }

    _build() {
      var self = this, e = this._e, r = (this._r = {});
      var root = this.shadowRoot;
      root.innerHTML = '';
      root.appendChild(el('style', null, CSS));
      var card = el('ha-card');
      root.appendChild(card);

      // header
      var head = el('div', 'head');
      var t = el('div');
      r.name = el('div', 'name');
      r.status = el('div', 'status');
      r.dot = el('span', 'dot');
      r.stext = el('span');
      r.status.appendChild(r.dot);
      r.status.appendChild(r.stext);
      t.appendChild(r.name);
      t.appendChild(r.status);
      r.cur = el('div', 'cur');
      head.appendChild(t);
      head.appendChild(r.cur);
      head.addEventListener('click', function () {
        self.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: self._c.climate } }));
      });
      card.appendChild(head);
      r.err = el('div', 'err');
      r.err.hidden = true;
      card.appendChild(r.err);

      // modes
      var modes = el('div', 'modes');
      r.modes = {};
      MODES.forEach(function (m) {
        var b = el('button', 'mode ' + m[0], '<ha-icon icon="' + m[1] + '"></ha-icon><span>' + m[2] + '</span>');
        b.addEventListener('click', function () { self._call('climate', 'set_hvac_mode', { entity_id: self._c.climate, hvac_mode: m[0] }); });
        modes.appendChild(b);
        r.modes[m[0]] = b;
      });
      card.appendChild(modes);

      // auto control
      var auto = el('div', 'row');
      var al = el('div', 'lbl');
      al.appendChild(el('b', null, 'Auto control'));
      r.autoSub = el('span');
      al.appendChild(r.autoSub);
      r.autoSw = el('button', 'sw');
      r.autoSw.setAttribute('role', 'switch');
      r.autoSw.addEventListener('click', function () { self._toggle(e.enabled); });
      auto.appendChild(al);
      auto.appendChild(r.autoSw);
      card.appendChild(auto);

      var body = (r.body = el('div', 'body'));
      card.appendChild(body);

      // comfort range
      var s1 = el('div', 'sec');
      s1.appendChild(el('span', null, 'Comfort range'));
      r.rangeVal = el('span');
      s1.appendChild(r.rangeVal);
      body.appendChild(s1);
      var range = el('div', 'range');
      r.track = el('div', 'track');
      r.zh = el('div', 'z h');
      r.zo = el('div', 'z o');
      r.zc = el('div', 'z c');
      r.now = el('div', 'now');
      r.minTh = el('div', 'th');
      r.maxTh = el('div', 'th');
      r.minTip = el('div', 'tip');
      r.maxTip = el('div', 'tip');
      r.minTh.appendChild(r.minTip);
      r.maxTh.appendChild(r.maxTip);
      [r.minTh, r.maxTh].forEach(function (th, i) {
        th.tabIndex = 0;
        th.setAttribute('role', 'slider');
        th.setAttribute('aria-label', i === 0 ? 'Heat below' : 'Cool above');
      });
      [r.zh, r.zo, r.zc, r.now, r.minTh, r.maxTh].forEach(function (n) { r.track.appendChild(n); });
      range.appendChild(r.track);
      r.scale = el('div', 'scale');
      r.scaleLo = el('span');
      r.scaleHi = el('span');
      r.scale.appendChild(r.scaleLo);
      r.scale.appendChild(r.scaleHi);
      range.appendChild(r.scale);
      body.appendChild(range);
      var legend = el('div', 'legend');
      r.legH = el('span', null, '<i style="background:var(--rhc-heat,#ff7043)"></i>');
      r.legC = el('span', null, '<i style="background:var(--rhc-cool,#42a5f5)"></i>');
      r.legHt = document.createTextNode('');
      r.legCt = document.createTextNode('');
      r.legH.appendChild(r.legHt);
      r.legC.appendChild(r.legCt);
      legend.appendChild(r.legH);
      legend.appendChild(r.legC);
      body.appendChild(legend);

      // offset stepper
      // everything from here down lives in a collapsible container
      r.exp = el('button', 'exp', '<span></span><ha-icon icon="mdi:chevron-down"></ha-icon>');
      r.exp.addEventListener('click', function () {
        self._open = !self._open;
        try { localStorage.setItem('room-hvac-card:' + self._c.climate, self._open ? '1' : '0'); } catch (err) { /* ignore */ }
        self._render();
      });
      body.appendChild(r.exp);
      var more = (r.more = el('div', 'more'));
      body.appendChild(more);
      body = more;
      var off = el('div', 'row');
      var ol = el('div', 'lbl');
      ol.appendChild(el('b', null, 'Keep going by'));
      ol.appendChild(el('span', null, 'Heats or cools this far past the limit, then stops'));
      var st = el('div', 'step');
      r.offMinus = el('button', null, '−');
      r.offPlus = el('button', null, '+');
      r.offVal = el('output');
      st.appendChild(r.offMinus);
      st.appendChild(r.offVal);
      st.appendChild(r.offPlus);
      off.appendChild(ol);
      off.appendChild(st);
      body.appendChild(off);
      r.hint = el('div', 'hint');
      body.appendChild(r.hint);
      r.offMinus.addEventListener('click', function () { self._offset(-STEP); });
      r.offPlus.addEventListener('click', function () { self._offset(STEP); });

      // schedule
      var s2 = el('div', 'sec');
      s2.appendChild(el('span', null, 'Schedule'));
      body.appendChild(s2);
      function schedRow(title, timeKey, swKey, subKey) {
        var row = el('div', 'row');
        var l = el('div', 'lbl');
        l.appendChild(el('b', null, title));
        r[subKey] = el('span');
        l.appendChild(r[subKey]);
        var ti = el('input');
        ti.type = 'time';
        ti.addEventListener('change', function () {
          if (ti.value) self._call('input_datetime', 'set_datetime', { entity_id: e[timeKey], time: ti.value + ':00' });
        });
        var sw = el('button', 'sw');
        sw.setAttribute('role', 'switch');
        sw.addEventListener('click', function () { self._toggle(e[swKey]); });
        r[timeKey] = ti;
        r[swKey] = sw;
        row.appendChild(l);
        row.appendChild(ti);
        row.appendChild(sw);
        body.appendChild(row);
      }
      schedRow('Start time', 'fanT', 'fan', 'fanSub');
      schedRow('Off time', 'offT', 'offOn', 'offSub');

      this._bindSlider();
    }

    _bounds() {
      var h = this._hass, e = this._e;
      var mn = h && h.states[e.min], mx = h && h.states[e.max];
      return {
        lo: Math.min(num({ state: mn && mn.attributes.min }, 10), 10),
        hi: Math.max(num({ state: mx && mx.attributes.max }, 32), 32),
        minLo: num({ state: mn && mn.attributes.min }, 10),
        minHi: num({ state: mn && mn.attributes.max }, 26),
        maxLo: num({ state: mx && mx.attributes.min }, 18),
        maxHi: num({ state: mx && mx.attributes.max }, 32)
      };
    }

    _clamp(which, v) {
      var b = this._bounds(), vals = this._vals;
      v = Math.round(v / STEP) * STEP;
      if (which === 'min') return Math.max(b.minLo, Math.min(v, b.minHi, vals.max - GAP));
      return Math.min(b.maxHi, Math.max(v, b.maxLo, vals.min + GAP));
    }

    _commit(which, v) {
      var self = this;
      v = this._clamp(which, v);
      this._opt[which] = v;
      this._call('input_number', 'set_value', { entity_id: this._e[which], value: v });
      setTimeout(function () { delete self._opt[which]; self._render(); }, 1500);
      this._render();
    }

    _offset(d) {
      var h = this._hass, s = h.states[this._e.off];
      if (!s) return;
      var lo = num({ state: s.attributes.min }, 0.5), hi = num({ state: s.attributes.max }, 6);
      var v = Math.max(lo, Math.min(hi, num(s, 2) + d));
      this._call('input_number', 'set_value', { entity_id: this._e.off, value: v });
    }

    _bindSlider() {
      var self = this, r = this._r, track = r.track;
      function valFromX(x) {
        var b = self._bounds(), rect = track.getBoundingClientRect();
        var t = Math.min(1, Math.max(0, (x - rect.left) / rect.width));
        return b.lo + t * (b.hi - b.lo);
      }
      ['min', 'max'].forEach(function (which) {
        var th = r[which + 'Th'];
        function finish() {
          if (!self._drag || self._drag.which !== which) return;
          var v = self._drag.value;
          self._drag = null;
          th.classList.remove('drag');
          self._commit(which, v);
        }
        th.addEventListener('pointerdown', function (ev) {
          ev.preventDefault();
          th.setPointerCapture(ev.pointerId);
          self._drag = { which: which, value: self._vals[which] };
          th.classList.add('drag');
        });
        th.addEventListener('pointermove', function (ev) {
          if (!self._drag || self._drag.which !== which) return;
          self._drag.value = self._clamp(which, valFromX(ev.clientX));
          self._render();
        });
        th.addEventListener('pointerup', finish);
        th.addEventListener('pointercancel', finish);
        th.addEventListener('keydown', function (ev) {
          var d = (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') ? STEP : (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') ? -STEP : 0;
          if (!d) return;
          ev.preventDefault();
          self._commit(which, self._vals[which] + d);
        });
      });
      track.addEventListener('pointerdown', function (ev) {
        if (ev.target.classList.contains('th') || ev.target.classList.contains('tip')) return;
        var v = valFromX(ev.clientX), vals = self._vals;
        self._commit(Math.abs(v - vals.min) <= Math.abs(v - vals.max) ? 'min' : 'max', v);
      });
    }

    _render() {
      var h = this._hass, r = this._r, e = this._e, c = this._c;
      if (!h || !r) return;
      var S = function (id) { return h.states[id]; };
      var ids = [c.climate].concat(Object.keys(e).map(function (k) { return e[k]; }));
      var missing = ids.filter(function (i) { return !S(i); });
      r.err.hidden = !missing.length;
      if (missing.length) { r.err.textContent = 'Missing entities: ' + missing.join(', '); return; }

      var cl = S(c.climate);
      var tempState = c.temperature && S(c.temperature);
      var cur = tempState ? num(tempState, null) : num({ state: cl.attributes.current_temperature }, null);
      var b = this._bounds();
      var vals = { min: num(S(e.min), 18), max: num(S(e.max), 26) };
      ['min', 'max'].forEach(function (k) { if (this._opt[k] != null) vals[k] = this._opt[k]; }, this);
      if (this._drag) vals[this._drag.which] = this._drag.value;
      this._vals = vals;
      var off = num(S(e.off), 2);
      var en = S(e.enabled).state === 'on';
      var stv = S(e.st).state;
      var fanOn = S(e.fan).state === 'on', offOn = S(e.offOn).state === 'on';

      // header
      r.name.textContent = c.name || cl.attributes.friendly_name || 'Room';
      r.cur.innerHTML = cur == null ? '—' : fmt(cur) + '<small>°C</small>';
      var text, cls = cl.state;
      if (stv === 'cooling') { text = 'Cooling to ' + fmt(vals.max - off) + '°'; cls = 'cooling'; }
      else if (stv === 'heating') { text = 'Heating to ' + fmt(vals.min + off) + '°'; cls = 'heating'; }
      else if (cl.state === 'fan_only') { text = 'Fan only'; }
      else if (cl.state === 'off') { text = en ? 'Off · watching the room' : 'Off'; cls = ''; }
      else if (cl.state === 'unavailable') { text = 'Unavailable'; cls = ''; }
      else { text = cap(cl.state); }
      r.stext.textContent = text;
      r.dot.className = 'dot ' + cls;

      // modes
      var avail = cl.attributes.hvac_modes || [];
      MODES.forEach(function (m) {
        var btn = r.modes[m[0]];
        btn.style.display = avail.indexOf(m[0]) < 0 ? 'none' : '';
        btn.classList.toggle('on', cl.state === m[0]);
      });

      // auto
      r.autoSw.classList.toggle('on', en);
      r.autoSw.setAttribute('aria-checked', String(en));
      r.autoSub.textContent = en ? 'Keeps the room between ' + fmt(vals.min) + '° and ' + fmt(vals.max) + '°' : 'Manual control only';
      r.body.hidden = !en; // comfort range + extra settings only show while Auto control is on
      r.more.hidden = !this._open;
      r.exp.classList.toggle('open', this._open);
      r.exp.setAttribute('aria-expanded', String(this._open));
      r.exp.firstChild.textContent = this._open ? 'Fewer settings' : 'More settings';

      // slider
      var span = b.hi - b.lo;
      var pct = function (v) { return ((v - b.lo) / span) * 100; };
      r.zh.style.width = pct(vals.min) + '%';
      r.zo.style.left = pct(vals.min) + '%';
      r.zo.style.width = (pct(vals.max) - pct(vals.min)) + '%';
      r.zc.style.width = (100 - pct(vals.max)) + '%';
      r.minTh.style.left = pct(vals.min) + '%';
      r.maxTh.style.left = pct(vals.max) + '%';
      r.minTip.textContent = fmt(vals.min) + '°';
      r.maxTip.textContent = fmt(vals.max) + '°';
      r.minTh.setAttribute('aria-valuenow', vals.min);
      r.maxTh.setAttribute('aria-valuenow', vals.max);
      r.now.style.display = cur == null ? 'none' : '';
      if (cur != null) r.now.style.left = Math.min(100, Math.max(0, pct(cur))) + '%';
      r.scaleLo.textContent = fmt(b.lo) + '°';
      r.scaleHi.textContent = fmt(b.hi) + '°';
      r.rangeVal.textContent = fmt(vals.min) + '° – ' + fmt(vals.max) + '°';
      r.legHt.nodeValue = 'Heats below ' + fmt(vals.min) + '°';
      r.legCt.nodeValue = 'Cools above ' + fmt(vals.max) + '°';

      // offset
      r.offVal.textContent = fmt(off) + '°';
      var bad = vals.min + off >= vals.max - off;
      r.hint.className = 'hint' + (bad ? ' warn' : '');
      r.hint.textContent = bad ? 'Offset is too large for this range – heat and cool targets overlap.'
        : 'Heats up to ' + fmt(vals.min + off) + '° · cools down to ' + fmt(vals.max - off) + '°';

      // schedule
      var active = this.shadowRoot.activeElement;
      var fanT = S(e.fanT).state.slice(0, 5), offT = S(e.offT).state.slice(0, 5);
      if (active !== r.fanT) r.fanT.value = fanT;
      if (active !== r.offT) r.offT.value = offT;
      r.fan.classList.toggle('on', fanOn);
      r.offOn.classList.toggle('on', offOn);
      r.fan.setAttribute('aria-checked', String(fanOn));
      r.offOn.setAttribute('aria-checked', String(offOn));
      r.fanSub.textContent = fanOn ? 'Starts in fan-only mode' : 'Fan-only start is off';
      r.offSub.textContent = offOn ? 'Switches off · heat/cool only between start and off' : 'Off time is disabled';
    }
  }

  customElements.define('room-hvac-card', RoomHvacCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: 'room-hvac-card', name: 'HA Climate Control (manual helpers)', description: 'Control panel only, for rooms whose helpers were made by hand.' });
})();
(function () {
  if (customElements.get('smart-room-hvac-card')) return;

  var SPEC = [
    { k: 'enabled', d: 'input_boolean', n: 'enabled', s: 'enabled' },
    { k: 'max', d: 'input_number', n: 'max temp', s: 'max_temp' },
    { k: 'min', d: 'input_number', n: 'min temp', s: 'min_temp' },
    { k: 'off', d: 'input_number', n: 'target offset', s: 'target_offset' },
    { k: 'fan', d: 'input_boolean', n: 'fan only start', s: 'fan_only_start' },
    { k: 'fanT', d: 'input_datetime', n: 'fan only start time', s: 'fan_only_start_time' },
    { k: 'offOn', d: 'input_boolean', n: 'off enabled', s: 'off_enabled' },
    { k: 'offT', d: 'input_datetime', n: 'off time', s: 'off_time' },
    { k: 'st', d: 'input_select', n: 'auto state', s: 'auto_state' }
  ];
  var ICONS = { enabled: 'mdi:thermostat-auto', max: 'mdi:thermometer-high', min: 'mdi:thermometer-low', off: 'mdi:swap-vertical',
    fan: 'mdi:fan-clock', fanT: 'mdi:clock-start', offOn: 'mdi:power-sleep', offT: 'mdi:clock-end', st: 'mdi:state-machine' };

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  var CSS = [
    ':host{display:block}',
    'ha-card{padding:16px}',
    '.name{font-size:18px;font-weight:600;color:var(--primary-text-color)}',
    '.sub{margin-top:2px;font-size:13px;color:var(--secondary-text-color)}',
    '.info{margin:14px 0 4px;font-size:13px;line-height:1.5;color:var(--secondary-text-color)}',
    '.info b{color:var(--primary-text-color);font-weight:500}',
    '.caps{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 14px}',
    '.chip{padding:3px 10px;border-radius:12px;font-size:12px;background:var(--secondary-background-color,rgba(127,127,127,.15));color:var(--secondary-text-color)}',
    '.chip.no{opacity:.55;text-decoration:line-through}',
    '.field{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:12px;',
    'background:var(--secondary-background-color,rgba(127,127,127,.15))}',
    '.field+.field{margin-top:8px}',
    '.field label{font-size:14px;font-weight:500;color:var(--primary-text-color)}',
    'select{font:inherit;color:var(--primary-text-color);background:var(--card-background-color);border:1px solid var(--divider-color);',
    'border-radius:8px;padding:6px 8px;max-width:55%}',
    '.go{display:block;width:100%;margin-top:16px;padding:12px;border:0;border-radius:12px;font:inherit;font-weight:600;cursor:pointer;',
    'background:var(--primary-color);color:var(--text-primary-color,#fff)}',
    '.go[disabled]{opacity:.5;cursor:default}',
    '.msg{margin-top:10px;font-size:13px;color:var(--secondary-text-color)}',
    '.msg.err{color:var(--error-color,#f44)}'
  ].join('');

  function buildAutomation(o) {
    var P = o.prefix, C = o.climate;
    var H = {};
    SPEC.forEach(function (s) { H[s.k] = s.d + '.' + P + '_' + s.s; });
    var fanAct = o.fan ? [{ action: 'climate.set_fan_mode', target: { entity_id: C }, data: { fan_mode: o.fan } }] : [];
    var extras = [];
    if (o.preset) extras.push({ action: 'climate.set_preset_mode', target: { entity_id: C }, data: { preset_mode: o.preset } });
    if (o.swing) extras.push({ action: 'climate.set_swing_mode', target: { entity_id: C }, data: { swing_mode: o.swing } });
    var mode = function (m) { return [{ action: 'climate.set_hvac_mode', target: { entity_id: C }, data: { hvac_mode: m } }]; };
    var on = [{ action: 'climate.turn_on', target: { entity_id: C } }];
    var fanOnly = [].concat(fanAct, mode('fan_only'), extras, on);
    var run = function (m, tpl, state) {
      return [].concat(fanAct, mode(m), extras,
        [{ action: 'climate.set_temperature', target: { entity_id: C }, data: { temperature: tpl } }], on,
        [{ action: 'input_select.select_option', target: { entity_id: H.st }, data: { option: state } }]);
    };
    var offAct = [{ action: 'climate.turn_off', target: { entity_id: C } }];
    var finish = function (m) {
      return [
        { if: [{ condition: 'state', entity_id: C, state: m }],
          then: [o.hasFan ? { if: [{ condition: 'state', entity_id: H.fan, state: 'on' }], then: fanOnly, else: offAct } : offAct[0]] },
        { action: 'input_select.select_option', target: { entity_id: H.st }, data: { option: 'idle' } }
      ];
    };
    var clip = function (e) {
      return "{{ [[ " + e + " , state_attr('" + C + "','min_temp') | float(16) ] | max, state_attr('" + C + "','max_temp') | float(30) ] | min }}";
    };
    var windowOk = { condition: 'or', conditions: [
      { condition: 'state', entity_id: H.offOn, state: 'off' },
      { condition: 'time', after: H.fanT, before: H.offT }] };
    var startBase = [{ condition: 'state', entity_id: H.enabled, state: 'on' }, { condition: 'state', entity_id: H.st, state: 'idle' }, windowOk];
    var tmpl = function (t) { return { condition: 'template', value_template: t }; };
    var choose = [
      { alias: 'Off time: switch off', conditions: [{ condition: 'trigger', id: 'off_time' }, { condition: 'state', entity_id: H.enabled, state: 'on' }, { condition: 'state', entity_id: H.offOn, state: 'on' }],
        sequence: [{ action: 'climate.turn_off', target: { entity_id: C } }, { action: 'input_select.select_option', target: { entity_id: H.st }, data: { option: 'idle' } }] }
    ];
    if (o.hasCool) {
      choose.push({ alias: 'Stop cooling at target', conditions: [{ condition: 'state', entity_id: H.st, state: 'cooling' }, tmpl('{{ temp is number and temp <= t_max - t_off }}')], sequence: finish('cool') });
    }
    if (o.hasHeat) {
      choose.push({ alias: 'Stop heating at target', conditions: [{ condition: 'state', entity_id: H.st, state: 'heating' }, tmpl('{{ temp is number and temp >= t_min + t_off }}')], sequence: finish('heat') });
    }
    if (o.hasCool) {
      choose.push({ alias: 'Start cooling above max', conditions: startBase.concat([{ condition: 'not', conditions: [{ condition: 'state', entity_id: C, state: 'cool' }] }, tmpl('{{ temp is number and t_min < t_max and temp > t_max }}')]), sequence: run('cool', clip('t_max - t_off'), 'cooling') });
    }
    if (o.hasHeat) {
      choose.push({ alias: 'Start heating below min', conditions: startBase.concat([{ condition: 'not', conditions: [{ condition: 'state', entity_id: C, state: 'heat' }] }, tmpl('{{ temp is number and t_min < t_max and temp < t_min }}')]), sequence: run('heat', clip('t_min + t_off'), 'heating') });
    }
    if (o.hasFan) {
      choose.push({ alias: 'Fan-only start at chosen time', conditions: [{ condition: 'trigger', id: 'fan_start' }, { condition: 'state', entity_id: H.enabled, state: 'on' }, { condition: 'state', entity_id: H.fan, state: 'on' }, { condition: 'state', entity_id: C, state: 'off' }], sequence: fanOnly });
    }
    var tempTrig = o.sensor ? { trigger: 'state', entity_id: o.sensor, id: 'temp' } : { trigger: 'state', entity_id: C, attribute: 'current_temperature', id: 'temp' };
    var tempTpl = o.sensor ? "{{ states('" + o.sensor + "') | float(none) }}" : "{{ state_attr('" + C + "','current_temperature') | float(none) }}";
    return {
      alias: o.title + ' HVAC – thermostat control',
      description: 'Created by smart-room-hvac-card. Cools above ' + H.max + ', heats below ' + H.min + ', keeps going ' + H.off + '° past the limit before stopping. Optional fan-only start at ' + H.fanT + ' and off time ' + H.offT + '. Master switch: ' + H.enabled + '.',
      mode: 'queued', max: 5, max_exceeded: 'silent',
      triggers: [
        tempTrig,
        { trigger: 'state', entity_id: [H.enabled, H.max, H.min, H.off, H.offOn], id: 'settings' },
        { trigger: 'time', at: H.fanT, id: 'fan_start' },
        { trigger: 'time', at: H.offT, id: 'off_time' }],
      variables: {
        temp: tempTpl,
        t_max: "{{ states('" + H.max + "') | float(none) }}",
        t_min: "{{ states('" + H.min + "') | float(none) }}",
        t_off: "{{ states('" + H.off + "') | float(none) }}" },
      conditions: [tmpl("{{ (temp is number and t_max is number and t_min is number and t_off is number) or trigger.id in ['fan_start','off_time'] }}")],
      actions: [{ choose: choose }]
    };
  }

  class SmartRoomHvacCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._busy = false;
      this._msg = '';
      this._err = false;
      this._sel = null;
      this._mode = '';
    }

    setConfig(c) {
      if (!c || !c.climate) throw new Error('smart-room-hvac-card: "climate" is required');
      this._c = c;
      this._slug = c.climate.split('.')[1];
      this._prefix = this._slug + '_hvac';
      this._title = c.name || this._slug.split('_').map(cap).join(' ');
      this._autoId = 'room_hvac_' + this._slug;
      this._mode = '';
      this._inner = null;
      this._form = null;
      this._render();
    }

    set hass(h) { this._hass = h; this._render(); }
    getCardSize() { return 10; }
    getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }
    static getStubConfig() { return { climate: 'climate.room' }; }
    static getConfigElement() { return document.createElement('smart-room-hvac-card-editor'); }

    _ids() {
      var P = this._prefix, out = {};
      SPEC.forEach(function (s) { out[s.k] = s.d + '.' + P + '_' + s.s; });
      return out;
    }

    _status() {
      var h = this._hass, ids = this._ids();
      var missing = SPEC.filter(function (s) { return !h.states[ids[s.k]]; });
      var autoEnt = Object.keys(h.states).filter(function (k) { return k.indexOf('automation.') === 0 && h.states[k].attributes.id === this._autoId; }, this)[0];
      return { missing: missing, hasAuto: !!autoEnt, ready: !missing.length && !!autoEnt };
    }

    _render() {
      var h = this._hass;
      if (!h || !this._c) return;
      var cl = h.states[this._c.climate];
      if (!cl) { this._showText('Entity not found: ' + this._c.climate, true); return; }
      var st = this._status();
      if (st.ready && !this._busy) this._showReady(); else this._showSetup(st, cl);
    }

    _showText(t, err) {
      this._mode = 'text';
      this.shadowRoot.innerHTML = '';
      this.shadowRoot.appendChild(el('style', null, CSS));
      var c = el('ha-card');
      c.appendChild(el('div', 'msg' + (err ? ' err' : ''), t));
      this.shadowRoot.appendChild(c);
    }

    _showReady() {
      if (this._mode !== 'ready') {
        this._mode = 'ready';
        var root = this.shadowRoot;
        root.innerHTML = '';
        if (!customElements.get('room-hvac-card')) {
          this._showText('This room is set up, but the "room-hvac-card" resource is not loaded.', true);
          return;
        }
        var inner = document.createElement('room-hvac-card');
        var cfg = { name: this._title, climate: this._c.climate, prefix: this._prefix, expanded: this._c.expanded };
        if (this._c.temperature) cfg.temperature = this._c.temperature;
        inner.setConfig(cfg);
        root.appendChild(inner);
        this._inner = inner;
      }
      if (this._inner) this._inner.hass = this._hass;
    }

    _caps(cl) {
      var m = cl.attributes.hvac_modes || [];
      return { hasHeat: m.indexOf('heat') >= 0, hasCool: m.indexOf('cool') >= 0, hasFan: m.indexOf('fan_only') >= 0 };
    }

    _pick(list, prefs) {
      list = list || [];
      for (var i = 0; i < prefs.length; i++) {
        for (var j = 0; j < list.length; j++) if (String(list[j]).toLowerCase() === prefs[i]) return list[j];
      }
      return '';
    }

    _showSetup(st, cl) {
      var self = this, caps = this._caps(cl);
      var sig = JSON.stringify([cl.attributes.hvac_modes, cl.attributes.fan_modes, cl.attributes.preset_modes, cl.attributes.swing_modes, this._busy]);
      if (this._mode === 'setup' && this._sigKey === sig) { this._updateMsg(st); return; }
      this._mode = 'setup';
      this._inner = null;
      this._sigKey = sig;
      if (!this._sel) {
        this._sel = {
          fan: this._pick(cl.attributes.fan_modes, ['low', 'quiet']),
          preset: this._pick(cl.attributes.preset_modes, ['quiet', 'eco', 'sleep']),
          swing: ''
        };
      }
      var root = this.shadowRoot;
      root.innerHTML = '';
      root.appendChild(el('style', null, CSS));
      var card = el('ha-card');
      root.appendChild(card);
      card.appendChild(el('div', 'name', this._title));
      card.appendChild(el('div', 'sub', st.missing.length === SPEC.length && !st.hasAuto ? 'Not set up yet' : 'Setup incomplete'));
      var chips = el('div', 'caps');
      [['Heat', caps.hasHeat], ['Cool', caps.hasCool], ['Fan only', caps.hasFan]].forEach(function (x) {
        chips.appendChild(el('span', 'chip' + (x[1] ? '' : ' no'), x[0]));
      });
      card.appendChild(chips);
      card.appendChild(el('div', 'info',
        'Creates <b>' + SPEC.length + ' helpers</b> and <b>1 automation</b> for <b>' + this._c.climate + '</b>' +
        (this._c.temperature ? ', using <b>' + this._c.temperature + '</b>' : ', using the A/C’s own temperature reading') +
        '. Auto control starts switched off.'));
      function field(label, key, list) {
        var f = el('div', 'field');
        f.appendChild(el('label', null, label));
        var s = el('select');
        s.appendChild(new Option('Don’t set', ''));
        (list || []).forEach(function (v) { s.appendChild(new Option(String(v), String(v))); });
        s.value = self._sel[key] || '';
        s.addEventListener('change', function () { self._sel[key] = s.value; });
        f.appendChild(s);
        card.appendChild(f);
      }
      if (cl.attributes.fan_modes) field('Fan speed', 'fan', cl.attributes.fan_modes);
      if (cl.attributes.preset_modes) field('Preset', 'preset', cl.attributes.preset_modes);
      if (cl.attributes.swing_modes) field('Swing', 'swing', cl.attributes.swing_modes);
      this._go = el('button', 'go', this._busy ? 'Setting up…' : (st.missing.length === SPEC.length && !st.hasAuto ? 'Set up this room' : 'Finish setup'));
      this._go.disabled = this._busy || !this._hass.user || !this._hass.user.is_admin;
      this._go.addEventListener('click', function () { self._setup(); });
      card.appendChild(this._go);
      this._msgEl = el('div', 'msg');
      card.appendChild(this._msgEl);
      this._updateMsg(st);
    }

    _updateMsg(st) {
      if (!this._msgEl) return;
      var admin = this._hass.user && this._hass.user.is_admin;
      this._msgEl.className = 'msg' + (this._err ? ' err' : '');
      this._msgEl.textContent = this._msg || (admin ? '' : 'An administrator account is needed to create helpers and automations.');
    }

    _say(t, err) { this._msg = t; this._err = !!err; this._updateMsg(); }

    async _waitFor(ids) {
      for (var i = 0; i < 40; i++) {
        if (ids.every(function (id) { return this._hass.states[id]; }, this)) return true;
        await sleep(250);
      }
      return false;
    }

    async _setup() {
      var self = this, h = this._hass;
      if (this._busy) return;
      this._busy = true;
      this._err = false;
      this._sigKey = '';
      var cl = h.states[this._c.climate];
      var cmin = parseFloat(cl.attributes.min_temp), cmax = parseFloat(cl.attributes.max_temp);
      if (isNaN(cmin)) cmin = 16;
      if (isNaN(cmax)) cmax = 30;
      var step = parseFloat(cl.attributes.target_temp_step) || 0.5;
      var ids = this._ids();
      var created = [];
      try {
        this._say('Creating helpers…');
        this._showSetup(this._status(), cl);
        for (var i = 0; i < SPEC.length; i++) {
          var s = SPEC[i];
          if (h.states[ids[s.k]]) continue;
          // HA derives the entity id from the name, so create with the slug-based name and rename afterwards
          var idName = this._slug.split('_').map(cap).join(' ') + ' HVAC ' + s.n;
          var name = this._title + ' HVAC ' + s.n;
          var payload = { type: s.d + '/create', name: idName, icon: ICONS[s.k] };
          if (s.d === 'input_number') {
            payload.min = s.k === 'off' ? 0.5 : cmin;
            payload.max = s.k === 'off' ? 6 : cmax;
            payload.step = s.k === 'off' ? 0.5 : step;
            payload.mode = 'slider';
            payload.unit_of_measurement = '°C';
          }
          if (s.d === 'input_datetime') { payload.has_time = true; payload.has_date = false; }
          if (s.d === 'input_select') payload.options = ['idle', 'cooling', 'heating'];
          var r = await h.callWS(payload);
          var got = s.d + '.' + r.id;
          if (got !== ids[s.k]) {
            var del = { type: s.d + '/delete' };
            del[s.d + '_id'] = r.id;
            await h.callWS(del);
            throw new Error('Home Assistant created ' + got + ' instead of ' + ids[s.k] + ', so it was removed. An entity with that id may already be registered – check Settings → Entities.');
          }
          if (name !== idName) await h.callWS({ type: 'config/entity_registry/update', entity_id: got, name: name });
          created.push(s.k);
        }
        if (!(await this._waitFor(SPEC.map(function (x) { return ids[x.k]; })))) throw new Error('Helpers were created but did not appear in time.');
        var def = {
          max: Math.min(26, cmax), min: Math.max(18, cmin), off: 2
        };
        for (var j = 0; j < created.length; j++) {
          var k = created[j];
          if (k === 'max' || k === 'min' || k === 'off') await h.callService('input_number', 'set_value', { entity_id: ids[k], value: def[k] });
          if (k === 'fanT') await h.callService('input_datetime', 'set_datetime', { entity_id: ids[k], time: '18:30:00' });
          if (k === 'offT') await h.callService('input_datetime', 'set_datetime', { entity_id: ids[k], time: '07:00:00' });
        }
        this._say('Creating automation…');
        var caps = this._caps(cl);
        var cfg = buildAutomation({
          prefix: this._prefix, climate: this._c.climate, sensor: this._c.temperature || '', title: this._title,
          fan: this._sel.fan, preset: this._sel.preset, swing: this._sel.swing,
          hasHeat: caps.hasHeat, hasCool: caps.hasCool, hasFan: caps.hasFan
        });
        var v = await h.callWS({ type: 'validate_config', triggers: cfg.triggers, conditions: cfg.conditions, actions: cfg.actions });
        ['triggers', 'conditions', 'actions'].forEach(function (p) { if (v[p] && !v[p].valid) throw new Error('Automation ' + p + ' invalid: ' + v[p].error); });
        await h.callApi('POST', 'config/automation/config/' + this._autoId, cfg);
        await h.callService('automation', 'reload');
        for (var n = 0; n < 40 && !this._status().hasAuto; n++) await sleep(250);
        this._msg = '';
        this._busy = false;
        this._mode = '';
        this._render();
      } catch (e) {
        this._busy = false;
        this._sigKey = '';
        this._say('Setup failed: ' + (e && (e.message || e.code) || e) + '. You can press the button again to retry.', true);
        this._showSetup(this._status(), cl);
      }
    }
  }


  var EDITOR_SCHEMA = [
    { name: 'climate', required: true, selector: { entity: { domain: 'climate' } } },
    { name: 'temperature', selector: { entity: { domain: 'sensor', device_class: 'temperature' } } },
    { name: 'name', selector: { text: {} } },
    { name: 'expanded', selector: { boolean: {} } }
  ];
  var EDITOR_LABELS = {
    climate: 'Climate entity (required)',
    temperature: 'Temperature sensor (optional – defaults to the A/C’s own reading)',
    name: 'Name (optional)',
    expanded: 'Start with extra settings open'
  };

  class SmartRoomHvacCardEditor extends HTMLElement {
    setConfig(c) { this._config = c || {}; this._update(); }
    set hass(h) { this._hass = h; this._update(); }
    _update() {
      if (!this._config) return;
      if (!this._form) {
        this._form = document.createElement('ha-form');
        this._form.schema = EDITOR_SCHEMA;
        this._form.computeLabel = function (s) { return EDITOR_LABELS[s.name] || s.name; };
        this._form.addEventListener('value-changed', (ev) => {
          ev.stopPropagation();
          var v = Object.assign({}, ev.detail.value);
          Object.keys(v).forEach(function (k) { if (v[k] === '' || v[k] == null || v[k] === false) delete v[k]; });
          v.type = this._config.type || 'custom:smart-room-hvac-card';
          this._config = v;
          this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: v }, bubbles: true, composed: true }));
        });
        this.appendChild(this._form);
      }
      if (this._hass) this._form.hass = this._hass;
      this._form.data = Object.assign({ expanded: false }, this._config);
    }
  }

  customElements.define('smart-room-hvac-card-editor', SmartRoomHvacCardEditor);
  customElements.define('smart-room-hvac-card', SmartRoomHvacCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: 'smart-room-hvac-card', name: 'HA Climate Control', description: 'Generic room HVAC control with one-click setup of its helpers and automation.', preview: false, documentationURL: 'https://github.com/steveharsant/HA-Climate-Control' });
})();
