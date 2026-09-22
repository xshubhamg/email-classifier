const $ = (id) => document.getElementById(id);

const ACTION_TONE = {
  quarantine: "red",
  notify_urgent: "amber",
  route_human: "amber",
  auto_label: "green",
  route_team: "green",
};

const confTone = (c) => (c >= 0.85 ? "g" : c >= 0.6 ? "a" : "r");
const riskTone = (r) => (r >= 0.8 ? "hot" : r >= 0.4 ? "warm" : "");

const thresholds = () => ({
  spamQuarantine: Number($("q-thresh").value),
  reviewConfidence: Number($("r-thresh").value),
});

// Animate bars after paint so the width transition runs.
function animateFills(scope) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() =>
      scope.querySelectorAll(".fill[data-w]").forEach((el) => {
        el.style.width = el.dataset.w;
      })
    )
  );
}

function signalRow(name, value, dangerAt = 0.8) {
  const hot = value >= dangerAt ? "hot" : value >= 0.5 ? "warm" : "";
  return `<div class="bar-row">
    <span class="name">${name}</span>
    <div class="track"><div class="fill ${hot}" data-w="${(value * 100).toFixed(0)}%"></div></div>
    <span class="num">${value.toFixed(2)}</span>
  </div>`;
}

function renderResult(r, ms) {
  const tone = ACTION_TONE[r.action] ?? "green";
  const probs = Object.entries(r.departmentProbabilities).sort((a, b) => b[1] - a[1]);

  $("result-body").innerHTML = `<div class="pop">
    <div class="banner ${tone}">
      <div class="traffic" aria-hidden="true"><i></i><i></i><i></i></div>
      <span class="action">${r.action.replace(/_/g, " ")}</span>
      <span class="route">→ ${r.route}</span>
    </div>

    <div class="section-label">Department · choice</div>
    <div class="kv">
      <span class="k">verdict</span>
      <span class="v"><span class="sdot ${confTone(r.departmentConfidence)}"></span>${r.department}</span>
      <span class="k">confidence</span><span class="v">${r.departmentConfidence.toFixed(2)}</span>
      <span class="k">frustration</span><span class="v">${r.frustration.toFixed(1)} / 2</span>
      <span class="k">priority</span><span class="v">${r.priority.toFixed(1)} / 2</span>
    </div>
    <div class="bars">
      ${probs
        .map(
          ([k, p]) => `<div class="bar-row">
            <span class="name">${k}</span>
            <div class="track"><div class="fill" data-w="${(p * 100).toFixed(0)}%"></div></div>
            <span class="num">${p.toFixed(2)}</span>
          </div>`
        )
        .join("")}
    </div>

    <div class="section-label">Signals · noul</div>
    <div class="bars">
      ${signalRow("urgent", r.isUrgent)}
      ${signalRow("sales pitch", r.isSalesPitch)}
      ${signalRow("credentials", r.requestsCredentials)}
      ${signalRow("identity Δ", r.identityMismatch)}
      ${signalRow("reward", r.unexpectedReward)}
    </div>

    <div class="gauge-wrap">
      <div class="gauge-top"><span>SPAM RISK · 0.45 creds + 0.30 mismatch + 0.25 reward</span><b>${r.spamRisk.toFixed(2)}</b></div>
      <div class="gauge">
        <div class="fill ${riskTone(r.spamRisk)}" data-w="${(r.spamRisk * 100).toFixed(0)}%"></div>
        <div class="marker" style="left:${Number($("q-thresh").value) * 100}%"></div>
      </div>
    </div>
  </div>`;

  animateFills($("result-body"));
  $("latency").textContent = `${ms} ms`;
  $("meta").textContent =
    `model ${r.model}${r.mocked ? " · MOCK" : ""} · question set EMAIL_Q_V1 · ` +
    (r.usage ? `tokens ${r.usage.input_tokens} in / ${r.usage.output_tokens} out` : "tokens —");
}

async function classify() {
  const btn = $("go");
  const subject = $("subject").value.trim();
  const body = $("body").value.trim();
  if (!subject || !body) {
    $("result-body").innerHTML = `<div class="pop"><div class="banner amber">
      <div class="traffic"><i></i><i></i><i></i></div>
      <span class="action">missing input</span><span class="route">subject + body required</span>
    </div></div>`;
    return;
  }
  btn.disabled = true;
  btn.classList.add("loading");
  $("result-body").innerHTML = `<div class="empty"><span class="dot pulse" style="display:inline-block"></span><p>asking jev…</p></div>`;
  const t0 = performance.now();
  try {
    const res = await fetch("/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        body,
        from: $("from").value.trim() || undefined,
        thresholds: thresholds(),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    renderResult(data, Math.round(performance.now() - t0));
  } catch (e) {
    $("result-body").innerHTML = `<div class="pop"><div class="banner red">
      <div class="traffic"><i></i><i></i><i></i></div>
      <span class="action">request failed</span><span class="route">${String(e.message || e).slice(0, 80)}</span>
    </div></div>`;
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
  }
}

async function boot() {
  // Sliders
  $("q-thresh").addEventListener("input", (e) => ($("q-val").textContent = Number(e.target.value).toFixed(2)));
  $("r-thresh").addEventListener("input", (e) => ($("r-val").textContent = Number(e.target.value).toFixed(2)));
  $("go").addEventListener("click", classify);
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") classify();
  });

  // Health
  try {
    const h = await (await fetch("/health")).json();
    $("model-pill").textContent = h.model;
    $("live-dot").className = "dot " + (h.mock ? "mock" : "on");
    $("live-label").textContent = h.mock ? "mock mode" : "live · jev";
  } catch {
    $("live-label").textContent = "offline";
  }

  // Demo inbox: samples + one batch call for traffic lights
  try {
    const { emails } = await (await fetch("/demo")).json();
    const sel = $("sample");
    emails.forEach((e, i) => {
      const o = document.createElement("option");
      o.value = String(i);
      o.textContent = e.subject;
      sel.appendChild(o);
    });
    sel.addEventListener("change", () => {
      const e = emails[Number(sel.value)];
      if (!e) return;
      $("subject").value = e.subject;
      $("from").value = e.from || "";
      $("body").value = e.body;
      classify();
    });

    const batch = await (
      await fetch("/classify/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: emails.map(({ subject, body, from }) => ({ subject, body, from })),
        }),
      })
    ).json();

    $("inbox-count").textContent = `${emails.length} emails`;
    $("inbox-list").innerHTML = batch.results
      .map((r, i) => {
        const tone = ACTION_TONE[r.action] ?? "green";
        const dot = tone === "red" ? "r" : tone === "amber" ? "a" : "g";
        return `<div class="inbox-row" style="--d:${i * 60}ms" data-i="${i}">
          <span class="sdot ${dot}"></span>
          <div><div class="subj">${emails[i].subject}</div>
          <div class="from">${emails[i].from || ""} · ${r.department} · risk ${r.spamRisk.toFixed(2)}</div></div>
          <div class="tags"><span>${r.action.replace(/_/g, " ")}</span><span>${(r.departmentConfidence * 100).toFixed(0)}%</span></div>
        </div>`;
      })
      .join("");
    document.querySelectorAll(".inbox-row").forEach((row) =>
      row.addEventListener("click", () => {
        const e = emails[Number(row.dataset.i)];
        $("subject").value = e.subject;
        $("from").value = e.from || "";
        $("body").value = e.body;
        $("sample").value = String(row.dataset.i);
        classify();
        document.querySelector(".composer").scrollIntoView({ behavior: "smooth", block: "nearest" });
      })
    );
  } catch {
    $("inbox-list").innerHTML = `<div class="inbox-loading">could not load demo inbox</div>`;
  }
}

boot();
