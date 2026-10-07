// Test card: checks live the features of dev-web-server from the browser,
// and lets you try your own requests.
// Each check returns { ok, detail }: ok true (green), false (red), or null (blue, information only).

const API = '/api';
const MAX_BODY = 4000;

const expect = (condition, detail) => ({ ok: !!condition, detail });
const info = detail => ({ ok: null, detail });

// ---------------------------------------------------------------------------
// traced requests

const isText = type => !type || /^text\/|json|javascript|xml|x-www-form-urlencoded/.test(type);

const hexPreview = bytes => [...bytes.slice(0, 32)].map(b => b.toString(16).padStart(2, '0')).join(' ');

/**
 * sends a request and returns its trace: what was sent and received.
 * The body of the response is read once and kept in the trace.
 */
const send = async (url, options = {}) => {
  const begin = performance.now();
  const res = await fetch(url, options);
  const buffer = new Uint8Array(await res.arrayBuffer());
  const type = res.headers.get('content-type');
  const text = isText(type) ? new TextDecoder().decode(buffer) : null;
  const target = new URL(url, location.href);
  return {
    request: {
      method: options.method || 'GET',
      url: target.pathname + target.search,
      headers: Object.fromEntries(new Headers(options.headers || {})),
      body: options.body === undefined ? null : String(options.body),
    },
    response: {
      status: res.status,
      statusText: res.statusText,
      headers: [...res.headers],
      size: buffer.length,
      text,
      bytes: buffer,
    },
    ms: Math.round(performance.now() - begin),
    res,
    json() {
      return JSON.parse(text);
    },
  };
};

// loads a JSONP script and resolves with the data given to the callback.
const jsonp = path => new Promise((resolve, reject) => {
  const name = 'testCardJsonp' + Date.now() + Math.round(Math.random() * 1000);
  const script = document.createElement('script');
  const cleanUp = () => {
    delete window[name];
    script.remove();
  };
  window[name] = data => {
    cleanUp();
    resolve({ data, src: script.src });
  };
  script.onerror = () => {
    cleanUp();
    reject(new Error('the JSONP script cannot be loaded'));
  };
  script.src = `${path}${path.includes('?') ? '&' : '?'}callback=${name}`;
  document.head.append(script);
});

// ---------------------------------------------------------------------------
// checks: run(t) gets a tracer t, whose t.send() records the requests shown in the details.

const GROUPS = [
  {
    title: 'Static files',
    checks: [
      ['HTML page with its charset', async t => {
        const r = await t.send('/', { method: 'HEAD' });
        const type = r.res.headers.get('content-type');
        return expect(type === 'text/html; charset=utf-8', type);
      }],
      ['CSS content type', async t => {
        const r = await t.send('test-card.css', { method: 'HEAD' });
        const type = r.res.headers.get('content-type');
        return expect(type.startsWith('text/css'), type);
      }],
      ['JSON file', async t => {
        const r = await t.send('data.json');
        const body = r.json();
        return expect(r.res.ok && body.name === 'test card', `${r.res.headers.get('content-type')} — ${body.colors.length} colors`);
      }],
      ['File name with special characters', async t => {
        const r = await t.send('/' + encodeURIComponent('fichier été.txt'));
        return expect(r.res.ok && r.response.text.includes('crème brûlée'), `fichier été.txt: "${r.response.text.trim()}"`);
      }],
      ['Directory index', async t => {
        const r = await t.send('sub/');
        return expect(r.res.ok && r.response.text.includes('sub directory index'), `/sub/ → ${r.res.status}`);
      }],
      ['Missing file', async t => {
        const r = await t.send('missing-file.txt');
        return expect(r.res.status === 404, `${r.res.status} ${r.res.statusText}`);
      }],
      ['HEAD request', async t => {
        const r = await t.send('tone.wav', { method: 'HEAD' });
        const length = r.res.headers.get('content-length');
        return expect(r.res.ok && Number(length) > 0 && r.response.size === 0, `Content-Length: ${length}, no body`);
      }],
      ['Range request', async t => {
        const r = await t.send('tone.wav', { headers: { Range: 'bytes=0-11' } });
        const bytes = r.response.bytes;
        const text = String.fromCharCode(...bytes.slice(0, 4), ...bytes.slice(8, 12));
        return expect(r.res.status === 206 && text === 'RIFFWAVE', `${r.res.status} — ${r.res.headers.get('content-range')}`);
      }],
    ],
  },
  {
    title: 'Endpoints',
    checks: [
      ['GET with query string', async t => {
        const r = await t.send(`${API}/echo?name=test%20card&tag=a&tag=b`);
        const body = r.json();
        return expect(r.res.ok && body.params.name === 'test card' && body.params.tag.join() === 'a,b', `params: ${JSON.stringify(body.params)}`);
      }],
      ['POST with a JSON body', async t => {
        const r = await t.send(`${API}/echo?from=query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'json', list: [1, 2] }),
        });
        const body = r.json();
        const ok = r.res.ok && body.params.from === 'query' && body.params.name === 'json' && body.body.list.length === 2;
        return expect(ok, `params: ${JSON.stringify(body.params)}`);
      }],
      ['POST with a form', async t => {
        const r = await t.send(`${API}/echo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'name=form&city=Paris',
        });
        const body = r.json();
        return expect(r.res.ok && body.params.city === 'Paris', `params: ${JSON.stringify(body.params)}`);
      }],
      ['Route with parameters', async t => {
        const r = await t.send(`${API}/users/42?fields=name`);
        const body = r.json();
        return expect(r.res.ok && body.user.id === '42' && body.params.fields === 'name', `/users/:id → ${JSON.stringify(body.user)}`);
      }],
      ['Invalid JSON body', async t => {
        const r = await t.send(`${API}/echo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{ invalid',
        });
        return expect(r.res.status === 400, `${r.res.status} — ${r.json().error.message}`);
      }],
      ['Error sent by an endpoint', async t => {
        const r = await t.send(`${API}/error`);
        const body = r.json();
        return expect(r.res.status === 401 && body.error.code === 401, `${r.res.status} — ${body.error.message}`);
      }],
      ['Exception thrown by an endpoint', async t => {
        const r = await t.send(`${API}/boom`);
        const next = await t.send(`${API}/info`);
        return expect(r.res.status === 500 && next.res.ok, `${r.res.status} — ${r.json().error.message} — the server keeps running`);
      }],
      ['Unknown endpoint', async t => {
        const r = await t.send(`${API}/unknown`);
        return expect(r.res.status === 404, `${r.res.status} — ${r.json().error.message}`);
      }],
      ['JSONP', async t => {
        const { data, src } = await jsonp(`${API}/jsonp`);
        const script = new URL(src);
        t.note(`script loaded: ${script.pathname}${script.search}\ncallback called with: ${JSON.stringify(data)}`);
        return expect(data.jsonp === true, JSON.stringify(data));
      }],
      ['OPTIONS preflight', async t => {
        const r = await t.send(`${API}/echo`, { method: 'OPTIONS' });
        return expect(r.res.ok, `${r.res.status} ${r.res.statusText}`);
      }],
    ],
  },
  {
    title: 'Server options',
    checks: [
      ['Cache (CACHE)', async t => {
        const value = (await t.send(`${API}/info`)).res.headers.get('cache-control');
        return info(value ? `Cache-Control: ${value} (browser caching disabled)` : 'no Cache-Control header (CACHE is active)');
      }],
      ['CORS (CORS)', async t => {
        const value = (await t.send(`${API}/info`)).res.headers.get('access-control-allow-origin');
        return info(value ? `Access-Control-Allow-Origin: ${value}` : 'no CORS headers (CORS is not active)');
      }],
      ['Endpoints file reload', async t => {
        const body = (await t.send(`${API}/info`)).json();
        const time = new Date(body.loadedAt).toLocaleTimeString([], { hour12: false });
        return info(`demo/endpoints.js loaded at ${time}: edit it, then run this check again`);
      }],
      ['Delay (DELAY)', async t => {
        const r = await t.send(`${API}/info`);
        return info(`an endpoint answers in ${r.ms} ms`);
      }],
    ],
  },
];

// ---------------------------------------------------------------------------
// rendering of a trace (request and response)

const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
};

const prettyBody = response => {
  if (response.size === 0) {
    return '(empty body)';
  }
  if (response.text === null) {
    return `(${response.size} bytes of binary data)\n${hexPreview(response.bytes)}${response.size > 32 ? ' …' : ''}`;
  }
  let text = response.text;
  try {
    text = JSON.stringify(JSON.parse(text), null, 2);
  } catch (e) {
    // not JSON: shown as is.
  }
  return text.length > MAX_BODY ? text.slice(0, MAX_BODY) + `\n… (${response.size} bytes)` : text;
};

const statusClass = status => status >= 500 ? 'is-5xx' : status >= 400 ? 'is-4xx' : status >= 300 ? 'is-3xx' : 'is-2xx';

const renderTrace = trace => {
  const node = element('div', 'trace');

  const request = element('div', 'trace__part');
  request.append(element('h4', null, 'Request'));
  request.append(element('pre', 'trace__line', `${trace.request.method} ${trace.request.url}`));
  const requestHeaders = Object.entries(trace.request.headers);
  if (requestHeaders.length) {
    request.append(element('pre', 'trace__headers', requestHeaders.map(([name, value]) => `${name}: ${value}`).join('\n')));
  }
  if (trace.request.body !== null) {
    request.append(element('pre', 'trace__body', trace.request.body));
  }

  const response = element('div', 'trace__part');
  const title = element('h4', null, 'Response ');
  title.append(element('span', `status ${statusClass(trace.response.status)}`, `${trace.response.status} ${trace.response.statusText}`));
  title.append(element('span', 'trace__ms', ` ${trace.ms} ms`));
  response.append(title);
  response.append(element('pre', 'trace__headers', trace.response.headers.map(([name, value]) => `${name}: ${value}`).join('\n')));
  response.append(element('pre', 'trace__body', prettyBody(trace.response)));

  node.append(request, response);
  return node;
};

// ---------------------------------------------------------------------------
// checks

const groupsElement = document.getElementById('groups');
const summaryElement = document.getElementById('summary');
const CHECKS = GROUPS.flatMap(group => group.checks);
const results = new Map();

const updateSummary = () => {
  if (results.size < CHECKS.length) {
    summaryElement.parentElement.className = 'summary';
    summaryElement.textContent = `Running the checks… ${results.size} / ${CHECKS.length}`;
    return;
  }
  const tested = [...results.values()].filter(ok => ok !== null);
  const passed = tested.filter(ok => ok).length;
  summaryElement.parentElement.className = `summary ${passed === tested.length ? 'is-ok' : 'is-ko'}`;
  summaryElement.textContent = `${passed} / ${tested.length} checks passed`;
  document.body.dataset.checks = passed === tested.length ? 'passed' : 'failed';
};

const runCheck = async (index, item) => {
  const [, run] = CHECKS[index];
  const traces = [];
  const notes = [];
  const tracer = {
    send: async (url, options) => {
      const trace = await send(url, options);
      traces.push(trace);
      return trace;
    },
    note: text => notes.push(text),
  };

  results.delete(index);
  delete document.body.dataset.checks;
  updateSummary();
  item.dataset.state = 'pending';
  item.querySelector('.check__detail').textContent = '…';
  const begin = performance.now();
  let result;
  try {
    result = await run(tracer);
  } catch (e) {
    result = { ok: false, detail: e.message };
  }

  item.dataset.state = result.ok === null ? 'info' : result.ok ? 'ok' : 'ko';
  item.querySelector('.check__detail').textContent = result.detail;
  item.querySelector('.check__duration').textContent = `${Math.round(performance.now() - begin)} ms`;
  item.querySelector('.check__traces').replaceChildren(
    ...traces.map(renderTrace),
    ...notes.map(note => element('pre', 'trace__body', note)),
  );
  results.set(index, result.ok);
  updateSummary();
};

const render = () => {
  let index = 0;
  groupsElement.replaceChildren(...GROUPS.map(group => {
    const section = element('section', 'group');
    section.append(element('h2', null, group.title));
    const list = element('ul', 'checks');
    list.append(...group.checks.map(([label]) => {
      const checkIndex = index++;
      const item = element('li', 'check');
      item.dataset.state = 'pending';
      item.innerHTML = '<details><summary><span class="check__dot"></span><span class="check__label"></span>' +
        '<span class="check__duration"></span><button type="button" class="check__rerun" title="Run this check again" aria-label="Run this check again">↻</button>' +
        '<span class="check__detail">…</span></summary><div class="check__traces"></div></details>';
      item.querySelector('.check__label').textContent = label;
      item.querySelector('.check__rerun').addEventListener('click', event => {
        event.preventDefault();
        runCheck(checkIndex, item);
      });
      return item;
    }));
    section.append(list);
    return section;
  }));
};

const runChecks = () => {
  results.clear();
  [...groupsElement.querySelectorAll('.check')].forEach((item, index) => runCheck(index, item));
};

// ---------------------------------------------------------------------------
// playground

const form = document.getElementById('playground');
const fields = form.elements;
const output = document.getElementById('playground-response');

const PRESETS = [
  ['GET echo', { method: 'GET', url: `${API}/echo?name=John&tag=a&tag=b` }],
  ['POST JSON', { method: 'POST', url: `${API}/echo?source=query`, type: 'application/json', body: '{\n  "name": "John",\n  "age": 42\n}' }],
  ['POST form', { method: 'POST', url: `${API}/echo`, type: 'application/x-www-form-urlencoded', body: 'name=John+Doe&city=Paris' }],
  ['Route', { method: 'GET', url: `${API}/users/42` }],
  ['Error 401', { method: 'GET', url: `${API}/error` }],
  ['Exception 500', { method: 'GET', url: `${API}/boom` }],
  ['Invalid JSON', { method: 'POST', url: `${API}/echo`, type: 'application/json', body: '{ invalid' }],
  ['JSONP', { method: 'GET', url: `${API}/jsonp?callback=myCallback` }],
  ['Range', { method: 'GET', url: '/tone.wav', headers: 'Range: bytes=0-43' }],
  ['Missing file', { method: 'GET', url: '/missing-file.txt' }],
];

const updateBodyState = () => {
  const hasBody = !['GET', 'HEAD'].includes(fields.method.value);
  fields.body.disabled = !hasBody;
  fields.type.disabled = !hasBody;
};

const applyPreset = preset => {
  fields.method.value = preset.method;
  fields.url.value = preset.url;
  fields.type.value = preset.type || '';
  fields.headers.value = preset.headers || '';
  fields.body.value = preset.body || '';
  updateBodyState();
};

// the url and the fetch options of the playground request.
const playgroundRequest = () => {
  const headers = {};
  for (const line of fields.headers.value.split('\n')) {
    const separator = line.indexOf(':');
    if (separator > 0) {
      headers[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
    }
  }
  const options = { method: fields.method.value, headers };
  if (!fields.body.disabled) {
    if (fields.type.value) {
      headers['Content-Type'] = fields.type.value;
    }
    if (fields.body.value) {
      options.body = fields.body.value;
    }
  }
  return { url: fields.url.value.trim() || '/', options };
};

const shellQuote = text => `'${text.replace(/'/g, `'\\''`)}'`;

const toCurl = ({ url, options }) => {
  const parts = ['curl', '-i'];
  if (options.method === 'HEAD') {
    parts.push('-I');
  } else if (options.method !== 'GET') {
    parts.push(`-X ${options.method}`);
  }
  for (const [name, value] of Object.entries(options.headers)) {
    parts.push(`-H ${shellQuote(`${name}: ${value}`)}`);
  }
  if (options.body !== undefined) {
    parts.push(`--data-raw ${shellQuote(options.body)}`);
  }
  parts.push(shellQuote(new URL(url, location.href).href));
  return parts.join(' ');
};

const sendPlayground = async () => {
  const { url, options } = playgroundRequest();
  output.replaceChildren(element('p', 'hint', 'Sending…'));
  try {
    output.replaceChildren(renderTrace(await send(url, options)));
  } catch (e) {
    output.replaceChildren(element('p', 'error', `The request failed: ${e.message}`));
  }
};

const initPlayground = () => {
  document.getElementById('presets').append(...PRESETS.map(([label, preset]) => {
    const button = element('button', 'preset', label);
    button.type = 'button';
    button.addEventListener('click', () => {
      applyPreset(preset);
      sendPlayground();
    });
    return button;
  }));

  fields.method.addEventListener('change', updateBodyState);
  form.addEventListener('submit', event => {
    event.preventDefault();
    sendPlayground();
  });
  form.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      sendPlayground();
    }
  });

  const copy = document.getElementById('copy-curl');
  copy.addEventListener('click', async () => {
    const command = toCurl(playgroundRequest());
    try {
      await navigator.clipboard.writeText(command);
      copy.textContent = 'Copied!';
    } catch (e) {
      output.replaceChildren(element('pre', 'trace__body', command));
      copy.textContent = 'Shown below';
    }
    setTimeout(() => copy.textContent = 'Copy as curl', 1500);
  });

  applyPreset(PRESETS[0][1]);
};

// ---------------------------------------------------------------------------
// clock and server information

const updateClock = () => {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString([], { hour12: false });
};

const loadInfo = async () => {
  try {
    const body = (await send(`${API}/info`)).json();
    document.getElementById('server-info').textContent = `v${body.version} — Node.js ${body.node}`;
  } catch (e) {
    document.getElementById('server-info').textContent = 'the endpoints are not available';
  }
};

document.getElementById('rerun').addEventListener('click', runChecks);
updateClock();
setInterval(updateClock, 1000);
loadInfo();
render();
runChecks();
initPlayground();
