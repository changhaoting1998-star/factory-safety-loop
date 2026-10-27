export const REPORT_STATUS = Object.freeze({
  OPEN: "OPEN",
  ASSIGNED: "ASSIGNED",
  RECTIFYING: "RECTIFYING",
  VERIFYING: "VERIFYING",
  CLOSED: "CLOSED",
});

export const RISK_LEVEL = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
});

const TRANSITIONS = Object.freeze({
  OPEN: new Set(["ASSIGNED"]),
  ASSIGNED: new Set(["RECTIFYING"]),
  RECTIFYING: new Set(["VERIFYING"]),
  VERIFYING: new Set(["CLOSED", "RECTIFYING"]),
  CLOSED: new Set(["RECTIFYING"]),
});

export function canTransition(from, to) {
  return Boolean(TRANSITIONS[from]?.has(to));
}

export function transitionReport(report, to, metadata = {}) {
  if (!canTransition(report.status, to)) {
    throw new Error(`Unsupported transition: ${report.status} -> ${to}`);
  }

  const now = metadata.at || new Date().toISOString();
  return {
    ...report,
    status: to,
    assigneeId: metadata.assigneeId ?? report.assigneeId ?? null,
    updatedAt: now,
    closedAt: to === REPORT_STATUS.CLOSED ? now : null,
    history: [
      ...(report.history || []),
      {
        from: report.status,
        to,
        at: now,
        actorId: metadata.actorId || "demo_system",
        note: metadata.note || "",
      },
    ],
  };
}

export function createReport(input, options = {}) {
  const now = options.at || new Date().toISOString();
  const required = ["title", "location", "riskLevel", "dueAt"];
  for (const field of required) {
    if (!input[field]) throw new Error(`Missing required field: ${field}`);
  }
  if (!Object.values(RISK_LEVEL).includes(input.riskLevel)) {
    throw new Error("Unsupported risk level");
  }

  return {
    id: options.id || `demo_report_${Date.now()}`,
    title: String(input.title).trim(),
    location: String(input.location).trim(),
    riskLevel: input.riskLevel,
    description: String(input.description || "").trim(),
    reporterId: options.reporterId || "demo_user_reporter",
    assigneeId: null,
    status: REPORT_STATUS.OPEN,
    dueAt: input.dueAt,
    createdAt: now,
    updatedAt: now,
    closedAt: null,
    history: [],
  };
}

export function calculateDashboard(reports, now = new Date()) {
  const open = reports.filter((item) => item.status !== REPORT_STATUS.CLOSED);
  const overdue = open.filter((item) => new Date(item.dueAt) < now);
  const verifying = reports.filter((item) => item.status === REPORT_STATUS.VERIFYING);
  const closed = reports.filter((item) => item.status === REPORT_STATUS.CLOSED);
  const closeRate = reports.length ? Math.round((closed.length / reports.length) * 100) : 0;
  return {
    total: reports.length,
    open: open.length,
    overdue: overdue.length,
    verifying: verifying.length,
    closed: closed.length,
    closeRate,
  };
}
