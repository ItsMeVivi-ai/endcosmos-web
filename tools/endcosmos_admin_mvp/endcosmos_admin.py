#!/usr/bin/env python3
import json
import os
import sqlite3
import subprocess
import threading
import urllib.error
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "endcosmos_admin.db"
HOST = "127.0.0.1"
PORT = 8088
AI_DECISION_URL = os.environ.get("ENDCOSMOS_AI_URL", "http://localhost:17877/ai/decision")
RESTART_WHITELIST = {
		item.strip()
		for item in os.environ.get("ENDCOSMOS_RESTART_WHITELIST", "endcosmos-api,nginx,docker").split(",")
		if item.strip()
}

DB_LOCK = threading.Lock()


def now_iso() -> str:
		return datetime.now(timezone.utc).isoformat()


def db_conn() -> sqlite3.Connection:
		conn = sqlite3.connect(DB_PATH)
		conn.row_factory = sqlite3.Row
		return conn


def log_activity(action: str, details: str = "") -> None:
		with DB_LOCK, db_conn() as conn:
				conn.execute(
						"INSERT INTO activity_log(action, details, created_at) VALUES (?, ?, ?)",
						(action, details, now_iso()),
				)


def init_db() -> None:
		with DB_LOCK, db_conn() as conn:
				conn.executescript(
						"""
						PRAGMA journal_mode=WAL;

						CREATE TABLE IF NOT EXISTS workspaces (
							id INTEGER PRIMARY KEY AUTOINCREMENT,
							name TEXT NOT NULL,
							path TEXT NOT NULL,
							notes TEXT,
							created_at TEXT NOT NULL
						);

						CREATE TABLE IF NOT EXISTS ideas (
							id INTEGER PRIMARY KEY AUTOINCREMENT,
							title TEXT NOT NULL,
							body TEXT NOT NULL,
							tags TEXT,
							created_at TEXT NOT NULL
						);

						CREATE TABLE IF NOT EXISTS entities (
							id INTEGER PRIMARY KEY AUTOINCREMENT,
							name TEXT NOT NULL,
							entity_type TEXT NOT NULL,
							summary TEXT,
							data_json TEXT,
							created_at TEXT NOT NULL
						);

						CREATE TABLE IF NOT EXISTS services (
							id INTEGER PRIMARY KEY AUTOINCREMENT,
							name TEXT NOT NULL UNIQUE,
							health_url TEXT NOT NULL,
							last_status TEXT,
							last_checked_at TEXT,
							created_at TEXT NOT NULL
						);

						CREATE TABLE IF NOT EXISTS activity_log (
							id INTEGER PRIMARY KEY AUTOINCREMENT,
							action TEXT NOT NULL,
							details TEXT,
							created_at TEXT NOT NULL
						);

						CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
							content,
							source_type UNINDEXED,
							source_id UNINDEXED
						);
						"""
				)


def add_to_fts(source_type: str, source_id: int, text: str) -> None:
		with DB_LOCK, db_conn() as conn:
				conn.execute(
						"INSERT INTO knowledge_fts(content, source_type, source_id) VALUES (?, ?, ?)",
						(text, source_type, str(source_id)),
				)


def query_rows(sql: str, params=()):
		with DB_LOCK, db_conn() as conn:
				return [dict(row) for row in conn.execute(sql, params).fetchall()]


def execute_insert(sql: str, params=()):
		with DB_LOCK, db_conn() as conn:
				cur = conn.execute(sql, params)
				if cur.lastrowid is None:
						raise RuntimeError("Insert operation did not return a row ID")
				return int(cur.lastrowid)


def check_health_url(url: str) -> tuple[str, int | None, str]:
		try:
				req = urllib.request.Request(url, method="GET")
				with urllib.request.urlopen(req, timeout=8) as response:
						code = response.getcode()
						return ("ok" if 200 <= code < 400 else "fail", code, "")
		except urllib.error.HTTPError as err:
				return ("fail", err.code, str(err))
		except Exception as err:
				return ("error", None, str(err))


def request_ai_decision(payload: dict) -> dict:
		data = json.dumps(payload).encode("utf-8")
		req = urllib.request.Request(
				AI_DECISION_URL,
				data=data,
				headers={"Content-Type": "application/json"},
				method="POST",
		)
		with urllib.request.urlopen(req, timeout=20) as response:
				body = response.read().decode("utf-8")
				if not body:
						return {"raw": ""}
				try:
						return json.loads(body)
				except json.JSONDecodeError:
						return {"raw": body}


class AdminHandler(BaseHTTPRequestHandler):
		server_version = "EndCosmosAdmin/0.2"

		def _send_json(self, payload: dict | list, status: int = 200):
				body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
				self.send_response(status)
				self.send_header("Content-Type", "application/json; charset=utf-8")
				self.send_header("Content-Length", str(len(body)))
				self.end_headers()
				self.wfile.write(body)

		def _send_html(self, html: str, status: int = 200):
				body = html.encode("utf-8")
				self.send_response(status)
				self.send_header("Content-Type", "text/html; charset=utf-8")
				self.send_header("Content-Length", str(len(body)))
				self.end_headers()
				self.wfile.write(body)

		def _read_json(self) -> dict:
				length = int(self.headers.get("Content-Length", "0"))
				raw = self.rfile.read(length) if length > 0 else b"{}"
				return json.loads(raw.decode("utf-8") or "{}")

		def do_GET(self):
				parsed = urlparse(self.path)

				if parsed.path == "/":
						self._send_html(INDEX_HTML)
						return

				if parsed.path == "/health":
						self._send_json({"status": "ok", "service": "endcosmos-admin-mvp"})
						return

				if parsed.path == "/api/workspaces":
						rows = query_rows("SELECT * FROM workspaces ORDER BY id DESC")
						self._send_json(rows)
						return

				if parsed.path == "/api/ideas":
						rows = query_rows("SELECT * FROM ideas ORDER BY id DESC")
						self._send_json(rows)
						return

				if parsed.path == "/api/entities":
						rows = query_rows("SELECT * FROM entities ORDER BY id DESC")
						self._send_json(rows)
						return

				if parsed.path == "/api/services":
						rows = query_rows("SELECT * FROM services ORDER BY id DESC")
						self._send_json(rows)
						return

				if parsed.path == "/api/activity":
						rows = query_rows("SELECT * FROM activity_log ORDER BY id DESC LIMIT 200")
						self._send_json(rows)
						return

				if parsed.path == "/api/dashboard":
						workspaces_total = query_rows("SELECT COUNT(*) AS total FROM workspaces")[0]["total"]
						ideas_total = query_rows("SELECT COUNT(*) AS total FROM ideas")[0]["total"]
						entities_total = query_rows("SELECT COUNT(*) AS total FROM entities")[0]["total"]
						services_total = query_rows("SELECT COUNT(*) AS total FROM services")[0]["total"]
						latest_activity = query_rows("SELECT * FROM activity_log ORDER BY id DESC LIMIT 8")
						latest_services = query_rows("SELECT * FROM services ORDER BY id DESC LIMIT 8")
						self._send_json(
								{
										"totals": {
												"workspaces": workspaces_total,
												"ideas": ideas_total,
												"entities": entities_total,
												"services": services_total,
										},
										"latest_activity": latest_activity,
										"latest_services": latest_services,
										"ai_endpoint": AI_DECISION_URL,
								}
						)
						return

				if parsed.path == "/api/search":
						q = parse_qs(parsed.query).get("q", [""])[0].strip()
						if not q:
								self._send_json([])
								return
						rows = query_rows(
								"""
								SELECT rowid, source_type, source_id, snippet(knowledge_fts, 0, '[', ']', ' … ', 12) AS excerpt
								FROM knowledge_fts
								WHERE knowledge_fts MATCH ?
								ORDER BY rank
								LIMIT 50
								""",
								(q,),
						)
						self._send_json(rows)
						return

				self._send_json({"error": "Not found"}, status=404)

		def do_POST(self):
				parsed = urlparse(self.path)

				if parsed.path == "/api/workspaces":
						data = self._read_json()
						name = str(data.get("name", "")).strip()
						path = str(data.get("path", "")).strip()
						notes = str(data.get("notes", "")).strip()
						if not name or not path:
								self._send_json({"error": "name and path are required"}, status=400)
								return
						row_id = execute_insert(
								"INSERT INTO workspaces(name, path, notes, created_at) VALUES (?, ?, ?, ?)",
								(name, path, notes, now_iso()),
						)
						add_to_fts("workspace", row_id, f"{name} {path} {notes}")
						log_activity("workspace.create", f"{name} | {path}")
						self._send_json({"ok": True, "id": row_id}, status=201)
						return

				if parsed.path == "/api/ideas":
						data = self._read_json()
						title = str(data.get("title", "")).strip()
						body = str(data.get("body", "")).strip()
						tags = str(data.get("tags", "")).strip()
						if not title or not body:
								self._send_json({"error": "title and body are required"}, status=400)
								return
						row_id = execute_insert(
								"INSERT INTO ideas(title, body, tags, created_at) VALUES (?, ?, ?, ?)",
								(title, body, tags, now_iso()),
						)
						add_to_fts("idea", row_id, f"{title} {body} {tags}")
						log_activity("idea.create", title)
						self._send_json({"ok": True, "id": row_id}, status=201)
						return

				if parsed.path == "/api/entities":
						data = self._read_json()
						name = str(data.get("name", "")).strip()
						entity_type = str(data.get("entity_type", "")).strip()
						summary = str(data.get("summary", "")).strip()
						data_json = data.get("data", {})
						if not name or not entity_type:
								self._send_json({"error": "name and entity_type are required"}, status=400)
								return
						row_id = execute_insert(
								"INSERT INTO entities(name, entity_type, summary, data_json, created_at) VALUES (?, ?, ?, ?, ?)",
								(name, entity_type, summary, json.dumps(data_json, ensure_ascii=False), now_iso()),
						)
						add_to_fts("entity", row_id, f"{name} {entity_type} {summary}")
						log_activity("entity.create", f"{entity_type}:{name}")
						self._send_json({"ok": True, "id": row_id}, status=201)
						return

				if parsed.path == "/api/services":
						data = self._read_json()
						name = str(data.get("name", "")).strip()
						health_url = str(data.get("health_url", "")).strip()
						if not name or not health_url:
								self._send_json({"error": "name and health_url are required"}, status=400)
								return
						row_id = execute_insert(
								"INSERT OR REPLACE INTO services(name, health_url, created_at) VALUES (?, ?, ?)",
								(name, health_url, now_iso()),
						)
						add_to_fts("service", row_id, f"{name} {health_url}")
						log_activity("service.create", f"{name} -> {health_url}")
						self._send_json({"ok": True, "id": row_id}, status=201)
						return

				if parsed.path == "/api/services/check":
						rows = query_rows("SELECT id, name, health_url FROM services ORDER BY id DESC")
						results = []
						for row in rows:
								status, code, error_text = check_health_url(row["health_url"])
								with DB_LOCK, db_conn() as conn:
										conn.execute(
												"UPDATE services SET last_status = ?, last_checked_at = ? WHERE id = ?",
												(f"{status}:{code if code is not None else '-'}", now_iso(), row["id"]),
										)
								results.append(
										{
												"name": row["name"],
												"health_url": row["health_url"],
												"status": status,
												"status_code": code,
												"error": error_text,
										}
								)
						log_activity("service.check", f"checked={len(results)}")
						self._send_json({"ok": True, "results": results})
						return

				if parsed.path == "/api/services/restart":
						data = self._read_json()
						service_name = str(data.get("service_name", "")).strip()
						if not service_name:
								self._send_json({"error": "service_name is required"}, status=400)
								return
						if service_name not in RESTART_WHITELIST:
								self._send_json(
										{
												"error": "service not allowed",
												"allowed": sorted(RESTART_WHITELIST),
										},
										status=403,
								)
								return

						try:
								completed = subprocess.run(
										["systemctl", "restart", service_name],
										capture_output=True,
										text=True,
										timeout=20,
										check=False,
								)
								ok = completed.returncode == 0
								details = (completed.stdout or "") + (completed.stderr or "")
								log_activity("service.restart", f"{service_name} rc={completed.returncode}")
								self._send_json(
										{
												"ok": ok,
												"service_name": service_name,
												"return_code": completed.returncode,
												"details": details.strip(),
										},
										status=200 if ok else 500,
								)
								return
						except Exception as err:
								log_activity("service.restart.error", f"{service_name} | {err}")
								self._send_json({"ok": False, "error": str(err)}, status=500)
								return

				if parsed.path == "/api/decision":
						data = self._read_json()
						try:
								decision = request_ai_decision(data)
								log_activity("ai.decision", str(data.get("prompt", ""))[:120])
								self._send_json({"ok": True, "decision": decision})
						except Exception as err:
								log_activity("ai.decision.error", str(err))
								self._send_json({"ok": False, "error": str(err)}, status=502)
						return

				self._send_json({"error": "Not found"}, status=404)


INDEX_HTML = """<!doctype html>
<html lang=\"en\">
<head>
	<meta charset=\"utf-8\" />
	<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
	<title>EndCosmos Admin Control Plane</title>
	<style>
		:root {
			--bg:#060a16;
			--line:rgba(130,170,255,.24);
			--text:#eaf2ff;
			--muted:#9db1d8;
			--cyan:#71d8ff;
			--ok:#3ad29f;
			--warn:#ffd36b;
			--err:#ff7b91;
		}
		* { box-sizing: border-box; }
		body {
			margin: 0;
			background: radial-gradient(80% 120% at 50% -15%, #132542, var(--bg));
			color: var(--text);
			font-family: Inter, Segoe UI, system-ui, sans-serif;
			min-height: 100vh;
		}
		.wrap { max-width: 1320px; margin: 0 auto; padding: 1.2rem; }
		.topbar {
			border-bottom: 1px solid var(--line);
			backdrop-filter: blur(6px);
			background: rgba(8, 12, 26, .72);
			position: sticky;
			top: 0;
			z-index: 20;
		}
		.topbar .wrap {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 1rem;
		}
		h1 { margin: 0; font-size: 1.1rem; letter-spacing: .04em; }
		.muted { color: var(--muted); }
		.chips { display: flex; gap: .45rem; flex-wrap: wrap; }
		.chip {
			border: 1px solid var(--line);
			border-radius: 999px;
			font-size: .74rem;
			padding: .3rem .62rem;
			color: var(--muted);
			background: rgba(19, 30, 52, .58);
		}
		.layout {
			display: grid;
			grid-template-columns: 360px 1fr;
			gap: 1rem;
			margin-top: 1rem;
		}
		.stack { display: grid; gap: .85rem; }
		.card {
			background: linear-gradient(180deg, rgba(16,25,44,.94), rgba(8,13,24,.95));
			border: 1px solid var(--line);
			border-radius: 14px;
			padding: .9rem;
			box-shadow: 0 10px 24px rgba(0,0,0,.2);
		}
		.card h3 { margin: 0 0 .55rem; font-size: .92rem; letter-spacing: .03em; }
		.stats {
			display: grid;
			grid-template-columns: repeat(4, minmax(0,1fr));
			gap: .75rem;
			margin-bottom: .85rem;
		}
		.stat { text-align: center; }
		.stat strong { font-size: 1.2rem; color: var(--cyan); display: block; }
		.stat span { font-size: .73rem; color: var(--muted); text-transform: uppercase; }
		input, textarea, button {
			width: 100%;
			border: 1px solid var(--line);
			border-radius: 10px;
			background: #0b1425;
			color: var(--text);
			padding: .58rem .65rem;
			font: inherit;
		}
		textarea { resize: vertical; min-height: 78px; }
		button {
			cursor: pointer;
			background: linear-gradient(135deg, #2b436e, #1b2e4f);
			transition: transform .12s ease, border-color .12s ease;
		}
		button:hover { transform: translateY(-1px); border-color: rgba(113,216,255,.55); }
		.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
		.toolbar { display:flex; gap:.5rem; flex-wrap:wrap; }
		.toolbar button { width:auto; padding:.46rem .75rem; }
		.pill-ok { color: var(--ok); }
		.pill-warn { color: var(--warn); }
		.pill-err { color: var(--err); }
		.panel-grid {
			display:grid;
			grid-template-columns: 1fr 1fr;
			gap: .85rem;
			margin-top: .85rem;
		}
		.list {
			max-height: 260px;
			overflow: auto;
			display: grid;
			gap: .45rem;
			padding-right: .15rem;
		}
		.item {
			border: 1px solid rgba(130,170,255,.2);
			border-radius: 10px;
			padding: .55rem .62rem;
			background: rgba(10, 18, 34, .76);
			font-size: .86rem;
		}
		.item small { color: var(--muted); }
		pre {
			margin: 0;
			max-height: 280px;
			overflow: auto;
			background: #070d1a;
			border: 1px solid rgba(130,170,255,.2);
			border-radius: 10px;
			padding: .7rem;
			color: #dbe9ff;
			font-size: .79rem;
		}
		@media (max-width: 1080px) {
			.layout { grid-template-columns: 1fr; }
			.panel-grid { grid-template-columns: 1fr; }
			.stats { grid-template-columns: repeat(2, minmax(0,1fr)); }
		}
	</style>
</head>
<body>
	<header class=\"topbar\">
		<div class=\"wrap\">
			<div>
				<h1>EndCosmos Admin Control Plane</h1>
				<small class=\"muted\">External operations console · runtime-safe architecture</small>
			</div>
			<div class=\"chips\" id=\"chips\">
				<span class=\"chip\">Loading...</span>
			</div>
		</div>
	</header>

	<main class=\"wrap\">
		<section class=\"card\">
			<div class=\"toolbar\">
				<button onclick=\"refreshAll()\">Refresh Dashboard</button>
				<button onclick=\"checkServices()\">Check Services</button>
				<button onclick=\"loadActivity()\">Load Activity</button>
			</div>
		</section>

		<section class=\"layout\">
			<aside class=\"stack\">
				<div class=\"card\">
					<h3>Workspace</h3>
					<input id=\"wsName\" placeholder=\"Workspace name\" />
					<input id=\"wsPath\" placeholder=\"Workspace path\" />
					<textarea id=\"wsNotes\" placeholder=\"Notes\"></textarea>
					<button onclick=\"createWorkspace()\">Create Workspace</button>
				</div>

				<div class=\"card\">
					<h3>Idea</h3>
					<input id=\"ideaTitle\" placeholder=\"Idea title\" />
					<textarea id=\"ideaBody\" placeholder=\"Idea body\"></textarea>
					<input id=\"ideaTags\" placeholder=\"tags,separated\" />
					<button onclick=\"createIdea()\">Create Idea</button>
				</div>

				<div class=\"card\">
					<h3>Entity</h3>
					<input id=\"entityName\" placeholder=\"Entity name\" />
					<input id=\"entityType\" placeholder=\"entity type (planet/faction/npc)\" />
					<textarea id=\"entitySummary\" placeholder=\"summary\"></textarea>
					<button onclick=\"createEntity()\">Create Entity</button>
				</div>

				<div class=\"card\">
					<h3>Service Monitor</h3>
					<input id=\"svcName\" placeholder=\"service name (endcosmos-api)\" />
					<input id=\"svcUrl\" placeholder=\"health url (http://localhost:8000/health)\" />
					<div class=\"row2\">
						<button onclick=\"addService()\">Add Service</button>
						<button onclick=\"checkServices()\">Check All</button>
					</div>
					<div class=\"row2\" style=\"margin-top:.5rem\">
						<input id=\"restartName\" placeholder=\"restart service name\" />
						<button onclick=\"restartService()\">Safe Restart</button>
					</div>
				</div>

				<div class=\"card\">
					<h3>AI Decision</h3>
					<textarea id=\"aiPrompt\" placeholder=\"Decision prompt\"></textarea>
					<button onclick=\"askDecision()\">Call /ai/decision</button>
				</div>

				<div class=\"card\">
					<h3>Knowledge Search</h3>
					<input id=\"searchQ\" placeholder=\"search query\" />
					<button onclick=\"runSearch()\">Search</button>
				</div>
			</aside>

			<section class=\"stack\">
				<div class=\"card\">
					<h3>Live Metrics</h3>
					<div class=\"stats\" id=\"stats\">
						<div class=\"stat\"><strong>0</strong><span>Workspaces</span></div>
						<div class=\"stat\"><strong>0</strong><span>Ideas</span></div>
						<div class=\"stat\"><strong>0</strong><span>Entities</span></div>
						<div class=\"stat\"><strong>0</strong><span>Services</span></div>
					</div>
					<small class=\"muted\" id=\"aiUrl\"></small>
				</div>

				<div class=\"panel-grid\">
					<div class=\"card\">
						<h3>Services</h3>
						<div class=\"list\" id=\"servicesList\"></div>
					</div>
					<div class=\"card\">
						<h3>Recent Activity</h3>
						<div class=\"list\" id=\"activityList\"></div>
					</div>
				</div>

				<div class=\"panel-grid\">
					<div class=\"card\">
						<h3>Latest Workspaces</h3>
						<div class=\"list\" id=\"workspacesList\"></div>
					</div>
					<div class=\"card\">
						<h3>Latest Ideas</h3>
						<div class=\"list\" id=\"ideasList\"></div>
					</div>
				</div>

				<div class=\"card\">
					<h3>Output</h3>
					<pre id=\"out\">Ready.</pre>
				</div>
			</section>
		</section>
	</main>

<script>
async function api(path, method='GET', body=null){
	const res = await fetch(path, {
		method,
		headers: {'Content-Type':'application/json'},
		body: body ? JSON.stringify(body) : null
	});
	const data = await res.json().catch(()=>({error:'invalid json'}));
	return {ok: res.ok, status: res.status, data};
}

function show(x){ document.getElementById('out').textContent = JSON.stringify(x, null, 2); }

function formatTime(iso){
	if(!iso) return '-';
	try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function renderList(elId, items, renderItem){
	const el = document.getElementById(elId);
	if(!el) return;
	if(!Array.isArray(items) || !items.length){
		el.innerHTML = '<div class="item"><small>No data yet.</small></div>';
		return;
	}
	el.innerHTML = items.map(renderItem).join('');
}

async function loadDashboard(){
	const d = await api('/api/dashboard');
	if(!d.ok){ show(d); return; }
	const t = d.data.totals || {};
	const stats = document.getElementById('stats');
	stats.innerHTML = `
		<div class="stat"><strong>${t.workspaces ?? 0}</strong><span>Workspaces</span></div>
		<div class="stat"><strong>${t.ideas ?? 0}</strong><span>Ideas</span></div>
		<div class="stat"><strong>${t.entities ?? 0}</strong><span>Entities</span></div>
		<div class="stat"><strong>${t.services ?? 0}</strong><span>Services</span></div>
	`;
	document.getElementById('aiUrl').textContent = `AI endpoint: ${d.data.ai_endpoint}`;

	const chips = document.getElementById('chips');
	chips.innerHTML = `
		<span class="chip">Workspaces ${t.workspaces ?? 0}</span>
		<span class="chip">Ideas ${t.ideas ?? 0}</span>
		<span class="chip">Entities ${t.entities ?? 0}</span>
		<span class="chip">Services ${t.services ?? 0}</span>
	`;

	renderList('activityList', d.data.latest_activity, (x) =>
		`<div class="item"><strong>${x.action}</strong><br/><small>${x.details || ''}</small><br/><small>${formatTime(x.created_at)}</small></div>`
	);

	renderList('servicesList', d.data.latest_services, (x) => {
		const status = (x.last_status || 'unknown').toLowerCase();
		const cls = status.startsWith('ok') ? 'pill-ok' : (status.startsWith('fail') ? 'pill-warn' : 'pill-err');
		return `<div class="item"><strong>${x.name}</strong><br/><small>${x.health_url}</small><br/><small class="${cls}">${x.last_status || 'unchecked'} · ${formatTime(x.last_checked_at)}</small></div>`;
	});
}

async function loadWorkspaces(){
	const r = await api('/api/workspaces');
	if(!r.ok){ show(r); return; }
	renderList('workspacesList', r.data.slice(0,8), (x) =>
		`<div class="item"><strong>${x.name}</strong><br/><small>${x.path}</small><br/><small>${x.notes || ''}</small></div>`
	);
}

async function loadIdeas(){
	const r = await api('/api/ideas');
	if(!r.ok){ show(r); return; }
	renderList('ideasList', r.data.slice(0,8), (x) =>
		`<div class="item"><strong>${x.title}</strong><br/><small>${x.tags || ''}</small><br/><small>${(x.body || '').slice(0,120)}</small></div>`
	);
}

async function loadActivity(){
	const r = await api('/api/activity');
	show(r);
	await loadDashboard();
}

async function createWorkspace(){
	const payload = {name: wsName.value, path: wsPath.value, notes: wsNotes.value};
	const r = await api('/api/workspaces','POST',payload);
	show(r);
	await refreshAll();
}

async function createIdea(){
	const payload = {title: ideaTitle.value, body: ideaBody.value, tags: ideaTags.value};
	const r = await api('/api/ideas','POST',payload);
	show(r);
	await refreshAll();
}

async function createEntity(){
	const payload = {name: entityName.value, entity_type: entityType.value, summary: entitySummary.value};
	const r = await api('/api/entities','POST',payload);
	show(r);
	await refreshAll();
}

async function addService(){
	const payload = {name: svcName.value, health_url: svcUrl.value};
	const r = await api('/api/services','POST',payload);
	show(r);
	await refreshAll();
}

async function checkServices(){
	const r = await api('/api/services/check','POST',{});
	show(r);
	await refreshAll();
}

async function restartService(){
	const r = await api('/api/services/restart','POST',{service_name: restartName.value});
	show(r);
	await refreshAll();
}

async function askDecision(){
	const prompt = aiPrompt.value;
	const r = await api('/api/decision','POST',{prompt, context: prompt});
	show(r);
	await refreshAll();
}

async function runSearch(){
	const r = await api('/api/search?q='+encodeURIComponent(searchQ.value));
	show(r);
}

async function refreshAll(){
	await Promise.all([loadDashboard(), loadWorkspaces(), loadIdeas()]);
}

document.addEventListener('DOMContentLoaded', async () => {
	await refreshAll();
	setInterval(loadDashboard, 30000);
});
</script>
</body>
</html>
"""


def main() -> None:
		init_db()
		log_activity("system.start", f"{HOST}:{PORT}")
		server = ThreadingHTTPServer((HOST, PORT), AdminHandler)
		print(f"EndCosmos Admin MVP running at http://{HOST}:{PORT}")
		print(f"Health endpoint: http://{HOST}:{PORT}/health")
		try:
				server.serve_forever()
		except KeyboardInterrupt:
				pass
		finally:
				log_activity("system.stop", "shutdown")
				server.server_close()


if __name__ == "__main__":
		main()
