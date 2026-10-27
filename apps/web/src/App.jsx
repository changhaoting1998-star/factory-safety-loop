import { useEffect, useMemo, useState } from "react";

const statusLabel = {
  OPEN: "待分派",
  ASSIGNED: "已分派",
  RECTIFYING: "整改中",
  VERIFYING: "待复核",
  CLOSED: "已关闭",
};

const riskLabel = {
  LOW: "低风险",
  MEDIUM: "中风险",
  HIGH: "高风险",
  CRITICAL: "重大风险",
};

const fallbackReports = [
  {
    id: "demo_report_local_001",
    title: "通道临时堆放物料",
    location: "示例一厂·包装区",
    riskLevel: "HIGH",
    status: "RECTIFYING",
    dueAt: "2099-12-18T09:00:00.000Z",
  },
  {
    id: "demo_report_local_002",
    title: "消防器材点检标识缺失",
    location: "示例一厂·成品库",
    riskLevel: "MEDIUM",
    status: "VERIFYING",
    dueAt: "2099-12-20T09:00:00.000Z",
  },
];

function calculate(items) {
  const closed = items.filter((item) => item.status === "CLOSED").length;
  return {
    open: items.length - closed,
    verifying: items.filter((item) => item.status === "VERIFYING").length,
    overdue: 0,
    closeRate: items.length ? Math.round((closed / items.length) * 100) : 0,
  };
}

function StatCard({ label, value, tone, hint }) {
  return (
    <article className={`stat-card ${tone || ""}`}>
      <div className="stat-label">{label}</div>
      <strong>{value}</strong>
      <span>{hint}</span>
    </article>
  );
}

function NewReportDialog({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "",
    location: "示例一厂·生产区",
    riskLevel: "MEDIUM",
    dueAt: "2099-12-31T09:00",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, dueAt: new Date(form.dueAt).toISOString() }),
      });
      if (!response.ok) throw new Error("create failed");
      onCreated(await response.json());
      onClose();
    } catch {
      onCreated({
        ...form,
        id: `demo_report_local_${Date.now()}`,
        dueAt: new Date(form.dueAt).toISOString(),
        status: "OPEN",
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="dialog" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="dialog-head">
          <div>
            <p className="eyebrow">NEW REPORT</p>
            <h2>登记安全隐患</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <label>问题标题<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label>发生位置<input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
        <div className="form-grid">
          <label>风险等级<select value={form.riskLevel} onChange={(e) => setForm({ ...form, riskLevel: e.target.value })}>
            <option value="LOW">低风险</option><option value="MEDIUM">中风险</option>
            <option value="HIGH">高风险</option><option value="CRITICAL">重大风险</option>
          </select></label>
          <label>整改期限<input required type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} /></label>
        </div>
        <label>补充说明<textarea rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>取消</button><button className="button primary" disabled={saving}>{saving ? "保存中" : "创建隐患"}</button></div>
      </form>
    </div>
  );
}

export default function App() {
  const [reports, setReports] = useState(fallbackReports);
  const [dashboard, setDashboard] = useState(calculate(fallbackReports));
  const [filter, setFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    fetch("/api/reports")
      .then((response) => {
        if (!response.ok) throw new Error("offline");
        return response.json();
      })
      .then((payload) => {
        setReports(payload.items);
        setDashboard(payload.dashboard);
        setOnline(true);
      })
      .catch(() => setOnline(false));
  }, []);

  const visible = useMemo(
    () => filter === "ALL" ? reports : reports.filter((item) => item.status === filter),
    [filter, reports],
  );

  function addReport(report) {
    const next = [report, ...reports];
    setReports(next);
    setDashboard(calculate(next));
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">安</div><div><strong>安全闭环</strong><span>Factory Safety</span></div></div>
        <nav>
          <button className="nav-item active"><span>⌂</span>工作台</button>
          <button className="nav-item"><span>◇</span>隐患台账</button>
          <button className="nav-item"><span>✓</span>整改复核</button>
          <button className="nav-item"><span>▦</span>巡检计划</button>
          <button className="nav-item"><span>◎</span>协作集成</button>
        </nav>
        <div className="sidebar-bottom"><div className="avatar">演</div><div><strong>演示管理员</strong><span>本地模拟模式</span></div></div>
      </aside>

      <main>
        <header className="topbar">
          <div><p className="eyebrow">SAFETY OVERVIEW</p><h1>安全工作台</h1><p>把每一项隐患推进到关闭与复核。</p></div>
          <div className="top-actions"><span className={`connection ${online ? "online" : ""}`}>{online ? "API 已连接" : "离线演示"}</span><button className="button primary" onClick={() => setDialogOpen(true)}>＋ 登记隐患</button></div>
        </header>

        <section className="stats">
          <StatCard label="开放隐患" value={dashboard.open} hint="需要持续跟进" />
          <StatCard label="逾期隐患" value={dashboard.overdue} tone="danger" hint="优先处理" />
          <StatCard label="待复核" value={dashboard.verifying} tone="warning" hint="等待安全员确认" />
          <StatCard label="关闭率" value={`${dashboard.closeRate}%`} tone="success" hint="本期闭环进度" />
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>隐患进度</h2><p>当前演示数据均为虚构内容</p></div><div className="filters">
            {[['ALL','全部'], ['OPEN','待分派'], ['RECTIFYING','整改中'], ['VERIFYING','待复核'], ['CLOSED','已关闭']].map(([value, label]) => <button key={value} className={filter === value ? "selected" : ""} onClick={() => setFilter(value)}>{label}</button>)}
          </div></div>
          <div className="table-wrap"><table><thead><tr><th>隐患</th><th>位置</th><th>风险</th><th>状态</th><th>整改期限</th></tr></thead><tbody>
            {visible.map((report) => <tr key={report.id}><td><strong>{report.title}</strong><span className="sub-id">{report.id}</span></td><td>{report.location}</td><td><span className={`risk ${report.riskLevel.toLowerCase()}`}>{riskLabel[report.riskLevel]}</span></td><td><span className={`status ${report.status.toLowerCase()}`}>{statusLabel[report.status]}</span></td><td>{new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date(report.dueAt))}</td></tr>)}
          </tbody></table></div>
        </section>

        <section className="integration-card"><div className="integration-icon">飞</div><div><p className="eyebrow">OPTIONAL ADAPTER</p><h2>飞书协作已预留</h2><p>支持 SSO 与群消息通知。演示模式不会连接任何外部账号。</p></div><button className="button secondary">查看接入说明</button></section>
      </main>
      {dialogOpen && <NewReportDialog onClose={() => setDialogOpen(false)} onCreated={addReport} />}
    </div>
  );
}
