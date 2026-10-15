'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const core = require('./publishing');
class PreviewSession {
  constructor(report = () => {}, builder = core.build) { this.builder = builder; this.report = report; this.clients = new Set(); this.revision = 0; }
  send(value) { for (const client of this.clients) client.write(`data: ${JSON.stringify(value)}\n\n`); this.report(value); }
  async update(plan) {
    const next = this.revision + 1;
    const output = this.temp ? path.join(this.temp, `site-${next}`) : undefined;
    try {
      const built = await this.builder(plan, { preview: true, temp: this.temp, output });
      const previous = this.output;
      this.temp = built.temp; this.output = built.output; this.url = built.url; this.baseurl = built.baseurl; this.revision = next;
      if (!this.server) await this.start();
      this.send({ revision: next, error: null });
      if (previous && previous !== this.output) await fs.rm(previous, { recursive: true, force: true });
      return this.address + this.url;
    } catch (error) { this.send({ revision: this.revision, error: error.message }); throw error; }
  }
  async start() {
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif' };
    this.server = http.createServer(async (req, res) => {
      try {
        if (req.headers.host !== `127.0.0.1:${this.server.address().port}`) { res.writeHead(403); return res.end(); }
        const url = new URL(req.url, this.address);
        if (url.pathname === '/__website_events') {
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' });
          this.clients.add(res); res.write(`data: ${JSON.stringify({ revision: this.revision })}\n\n`);
          req.on('close', () => this.clients.delete(res)); return;
        }
        let pathname = decodeURIComponent(url.pathname);
        if (this.baseurl && pathname.startsWith(this.baseurl + '/')) pathname = pathname.slice(this.baseurl.length);
        let relative = pathname.replace(/^\//, '') || 'index.html';
        let file = core.inside(this.output, relative);
        if (relative.endsWith('/') || (await fs.stat(file).catch(() => null))?.isDirectory()) file = path.join(file, 'index.html');
        else if (!(await core.exists(file)) && !path.extname(file)) file += '.html';
        let data = await fs.readFile(file);
        if (path.extname(file) === '.html') {
          const script = `<script>(()=>{let revision=${this.revision};const events=new EventSource('/__website_events');events.onmessage=e=>{const state=JSON.parse(e.data);let box=document.getElementById('website-preview-error');if(state.error){if(!box){box=document.createElement('pre');box.id='website-preview-error';box.setAttribute('role','alert');box.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:99999;padding:16px;max-height:35vh;overflow:auto;background:#fff;color:#900;border:2px solid #900;white-space:pre-wrap';document.body.append(box);}box.textContent='Preview could not update. Last successful version is shown.\\n'+state.error;}else if(state.revision>revision){location.reload();}};})();</script>`;
          data = Buffer.from(data.toString().replace('</body>', script + '</body>'));
        }
        res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }); res.end(data);
      } catch { res.writeHead(404); res.end('Not found'); }
    });
    await new Promise((resolve, reject) => { this.server.once('error', reject); this.server.listen(0, '127.0.0.1', resolve); });
    this.address = `http://127.0.0.1:${this.server.address().port}`;
  }
  async close() {
    for (const client of this.clients) client.end(); this.clients.clear();
    if (this.server) await new Promise(resolve => this.server.close(resolve));
    if (this.temp) await fs.rm(this.temp, { recursive: true, force: true });
    this.server = null; this.temp = null;
  }
}
module.exports = { PreviewSession };
