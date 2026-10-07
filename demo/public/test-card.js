// Test card: checks live the features of dev-web-server from the browser.
// Each check returns { ok, detail }: ok true (green), false (red), or null (blue, information only).

const API = '/api';

const expect = (condition, detail) => ({ ok: !!condition, detail });
const info = detail => ({ ok: null, detail });

const contentType = res => res.headers.get('content-type');

const json = async (path, options) => {
  const res = await fetch(path, options);
  return { res, body: await res.json() };
};

// loads a JSONP script and resolves with the data given to the callback.
const jsonp = path => new Promise((resolve, reject) => {
  const name = 'testCardJsonp' + Date.now();
  const script = document.createElement('script');
  const cleanUp = () => {
    delete window[name];
    script.remove();
  };
  window[name] = data => {
    cleanUp();
    resolve(data);
  };
  script.onerror = () => {
    cleanUp();
    reject(new Error('the JSONP script cannot be loaded'));
  };
  script.src = `${path}${path.includes('?') ? '&' : '?'}callback=${name}`;
  document.head.append(script);
});

const GROUPS = [
  {
    title: 'Static files',
    checks: [
      ['HTML page with its charset', async () => {
        const res = await fetch('/', { method: 'HEAD' });
        return expect(contentType(res) === 'text/html; charset=utf-8', contentType(res));
      }],
      ['CSS content type', async () => {
        const res = await fetch('test-card.css', { method: 'HEAD' });
        return expect(contentType(res).startsWith('text/css'), contentType(res));
      }],
      ['JSON file', async () => {
        const { res, body } = await json('data.json');
        return expect(res.ok && body.name === 'test card', `${contentType(res)} — ${body.colors.length} colors`);
      }],
      ['File name with special characters', async () => {
        const res = await fetch('/' + encodeURIComponent('fichier été.txt'));
        const text = await res.text();
        return expect(res.ok && text.includes('crème brûlée'), `fichier été.txt: "${text.trim()}"`);
      }],
      ['Directory index', async () => {
        const res = await fetch('sub/');
        const text = await res.text();
        return expect(res.ok && text.includes('sub directory index'), `/sub/ → ${res.status}`);
      }],
      ['Missing file', async () => {
        const res = await fetch('missing-file.txt');
        return expect(res.status === 404, `${res.status} ${res.statusText}`);
      }],
      ['HEAD request', async () => {
        const res = await fetch('tone.wav', { method: 'HEAD' });
        const length = res.headers.get('content-length');
        return expect(res.ok && Number(length) > 0 && (await res.text()) === '', `Content-Length: ${length}`);
      }],
      ['Range request', async () => {
        const res = await fetch('tone.wav', { headers: { Range: 'bytes=0-11' } });
        const bytes = new Uint8Array(await res.arrayBuffer());
        const text = String.fromCharCode(...bytes.slice(0, 4), ...bytes.slice(8, 12));
        return expect(res.status === 206 && text === 'RIFFWAVE', `${res.status} — ${res.headers.get('content-range')}`);
      }],
    ],
  },
  {
    title: 'Endpoints',
    checks: [
      ['GET with query string', async () => {
        const { res, body } = await json(`${API}/echo?name=test%20card&tag=a&tag=b`);
        const ok = res.ok && body.params.name === 'test card' && body.params.tag.join() === 'a,b';
        return expect(ok, `params: ${JSON.stringify(body.params)}`);
      }],
      ['POST with a JSON body', async () => {
        const { res, body } = await json(`${API}/echo?from=query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'json', list: [1, 2] }),
        });
        const ok = res.ok && body.params.from === 'query' && body.params.name === 'json' && body.body.list.length === 2;
        return expect(ok, `params: ${JSON.stringify(body.params)}`);
      }],
      ['POST with a form', async () => {
        const { res, body } = await json(`${API}/echo`, {
          method: 'POST',
          body: new URLSearchParams({ name: 'form', city: 'Paris' }),
        });
        return expect(res.ok && body.params.city === 'Paris', `params: ${JSON.stringify(body.params)}`);
      }],
      ['Invalid JSON body', async () => {
        const { res, body } = await json(`${API}/echo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{ invalid',
        });
        return expect(res.status === 400, `${res.status} — ${body.error.message}`);
      }],
      ['Error sent by an endpoint', async () => {
        const { res, body } = await json(`${API}/error`);
        return expect(res.status === 401 && body.error.code === 401, `${res.status} — ${body.error.message}`);
      }],
      ['Exception thrown by an endpoint', async () => {
        const { res, body } = await json(`${API}/boom`);
        const next = await fetch(`${API}/info`);
        return expect(res.status === 500 && next.ok, `${res.status} — ${body.error.message} — the server keeps running`);
      }],
      ['Unknown endpoint', async () => {
        const { res, body } = await json(`${API}/unknown`);
        return expect(res.status === 404, `${res.status} — ${body.error.message}`);
      }],
      ['JSONP', async () => {
        const data = await jsonp(`${API}/jsonp`);
        return expect(data.jsonp === true, JSON.stringify(data));
      }],
      ['OPTIONS preflight', async () => {
        const res = await fetch(`${API}/echo`, { method: 'OPTIONS' });
        return expect(res.ok, `${res.status} ${res.statusText}`);
      }],
    ],
  },
  {
    title: 'Server options',
    checks: [
      ['Cache (CACHE)', async () => {
        const res = await fetch(`${API}/info`);
        const value = res.headers.get('cache-control');
        return info(value ? `Cache-Control: ${value} (browser caching disabled)` : 'no Cache-Control header (CACHE is active)');
      }],
      ['CORS (CORS)', async () => {
        const res = await fetch(`${API}/info`);
        const value = res.headers.get('access-control-allow-origin');
        return info(value ? `Access-Control-Allow-Origin: ${value}` : 'no CORS headers (CORS is not active)');
      }],
      ['Delay (DELAY)', async () => {
        const begin = performance.now();
        await fetch(`${API}/info`);
        return info(`an endpoint answers in ${Math.round(performance.now() - begin)} ms`);
      }],
    ],
  },
];

const groupsElement = document.getElementById('groups');
const summaryElement = document.getElementById('summary');

const render = () => {
  groupsElement.replaceChildren(...GROUPS.map(group => {
    const section = document.createElement('section');
    section.className = 'group';
    section.innerHTML = `<h2></h2><ul class="checks"></ul>`;
    section.querySelector('h2').textContent = group.title;
    section.querySelector('ul').append(...group.checks.map(([label]) => {
      const item = document.createElement('li');
      item.className = 'check';
      item.dataset.state = 'pending';
      item.innerHTML = `<span class="check__dot"></span><span class="check__label"></span>` +
        `<span class="check__duration"></span><span class="check__detail">…</span>`;
      item.querySelector('.check__label').textContent = label;
      return item;
    }));
    return section;
  }));
};

const runChecks = async () => {
  render();
  summaryElement.parentElement.className = 'summary';
  summaryElement.textContent = 'Running the checks…';

  const items = [...groupsElement.querySelectorAll('.check')];
  const checks = GROUPS.flatMap(group => group.checks);
  const results = await Promise.all(checks.map(async ([, run], index) => {
    const item = items[index];
    const begin = performance.now();
    let result;
    try {
      result = await run();
    } catch (e) {
      result = { ok: false, detail: e.message };
    }
    item.dataset.state = result.ok === null ? 'info' : result.ok ? 'ok' : 'ko';
    item.querySelector('.check__detail').textContent = result.detail;
    item.querySelector('.check__duration').textContent = `${Math.round(performance.now() - begin)} ms`;
    return result.ok;
  }));

  const tested = results.filter(ok => ok !== null);
  const passed = tested.filter(ok => ok).length;
  summaryElement.parentElement.className = `summary ${passed === tested.length ? 'is-ok' : 'is-ko'}`;
  summaryElement.textContent = `${passed} / ${tested.length} checks passed`;
  document.body.dataset.checks = passed === tested.length ? 'passed' : 'failed';
};

const updateClock = () => {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString([], { hour12: false });
};

const loadInfo = async () => {
  try {
    const { body } = await json(`${API}/info`);
    document.getElementById('server-info').textContent = `v${body.version} — Node.js ${body.node}`;
  } catch (e) {
    document.getElementById('server-info').textContent = 'the endpoints are not available';
  }
};

document.getElementById('rerun').addEventListener('click', runChecks);
updateClock();
setInterval(updateClock, 1000);
loadInfo();
runChecks();
