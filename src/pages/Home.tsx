import { useEffect, useMemo, useState } from "react";
import { Card, Typography, theme, Skeleton, Alert, Tag } from "antd";
import { motion } from "framer-motion";
import { useAuth } from "../auth/AuthProvider";
import { useOrg } from "../org/OrgProvider";
import { supabase } from "../lib/supabaseClient";
// removed navigate-dependent bubbles
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
import {
  DashboardOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  FileDoneOutlined,
} from "@ant-design/icons";

type GrantsSummary = {
  total: number;
  queued: number;
  pending: number;
  submitted: number;
  accepted: number;
  rejected: number;
};

type TrendPoint = { month: string; submissions: number };

export default function Home() {
  const { token } = theme.useToken();
  const { user } = useAuth();
  const { organizationId } = useOrg();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grants, setGrants] = useState<GrantsSummary>({
    total: 0,
    queued: 0,
    pending: 0,
    submitted: 0,
    accepted: 0,
    rejected: 0,
  });
  const [networkingCount, setNetworkingCount] = useState(0);
  const [closedFilesCount, setClosedFilesCount] = useState(0);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [networkingTrend, setNetworkingTrend] = useState<TrendPoint[]>([]);
  const [closedByYear, setClosedByYear] = useState<
    { year: number; count: number }[]
  >([]);

  const displayName = useMemo(() => {
    const meta: any = user?.user_metadata || {};
    return (
      meta.full_name ||
      meta.name ||
      meta.given_name ||
      meta.preferred_username ||
      user?.email ||
      "there"
    );
  }, [user?.email, user?.user_metadata]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        if (!organizationId) {
          setLoading(false);
          return;
        }
        setLoading(true);

        // Parallel fetches
        const inLastYear = new Date();
        inLastYear.setMonth(inLastYear.getMonth() - 11);
        inLastYear.setDate(1);
        const since = inLastYear.toISOString().slice(0, 10);

        const [grantsRes, netRes, netCreatedRes, closedRes, closedCountRes] =
          await Promise.all([
            supabase
              .from("grants")
              .select(
                "id,status,date_submission,date_opened,value,date_due,donor_name",
                { count: "exact" }
              )
              .eq("organization_id", organizationId),
            supabase
              .from("networking_contacts")
              .select("id", { count: "exact", head: false })
              .eq("organization_id", organizationId),
            supabase
              .from("networking_contacts")
              .select("created_at")
              .eq("organization_id", organizationId)
              .gte("created_at", since),
            supabase
              .from("closed_client_files")
              .select("id,year")
              .eq("organization_id", organizationId),
            // exact count without fetching rows (avoids 1000 row cap)
            supabase
              .from("closed_client_files")
              .select("id", { count: "exact", head: true })
              .eq("organization_id", organizationId),
          ]);

        if (!mounted) return;

        // Grants summary + trend
        const grantsRows = (grantsRes.data as any[]) || [];
        const gSummary: GrantsSummary = {
          total: grantsRes.count || grantsRows.length,
          queued: 0,
          pending: 0,
          submitted: 0,
          accepted: 0,
          rejected: 0,
        };
        const monthKey = (d: string) => d.slice(0, 7); // YYYY-MM
        const trendMap = new Map<string, number>();
        // initialize last 12 months to 0
        const months: string[] = [];
        {
          const cur = new Date(inLastYear);
          for (let i = 0; i < 12; i++) {
            const key = `${cur.getFullYear()}-${String(
              cur.getMonth() + 1
            ).padStart(2, "0")}`;
            months.push(key);
            trendMap.set(key, 0);
            cur.setMonth(cur.getMonth() + 1);
          }
        }
        for (const r of grantsRows) {
          const s = String(r.status ?? "");
          if (s === "Queued") gSummary.queued++;
          else if (s === "Pending Submission") gSummary.pending++;
          else if (s === "Submission") gSummary.submitted++;
          else if (s === "Proposal Accepted") gSummary.accepted++;
          else if (s === "Proposal Rejected") gSummary.rejected++;
          if (r.date_submission) {
            const k = monthKey(String(r.date_submission));
            if (trendMap.has(k)) trendMap.set(k, (trendMap.get(k) || 0) + 1);
          }
        }
        const trendData: TrendPoint[] = months.map((m) => ({
          month: m,
          submissions: trendMap.get(m) || 0,
        }));

        // Networking trend (last 12 months)
        const netCreatedRows = (netCreatedRes.data as any[]) || [];
        const netTrendMap = new Map<string, number>();
        const netMonths: string[] = [];
        {
          const cur = new Date(inLastYear);
          for (let i = 0; i < 12; i++) {
            const key = `${cur.getFullYear()}-${String(
              cur.getMonth() + 1
            ).padStart(2, "0")}`;
            netMonths.push(key);
            netTrendMap.set(key, 0);
            cur.setMonth(cur.getMonth() + 1);
          }
        }
        for (const r of netCreatedRows) {
          const created = String(r.created_at || "");
          if (created) {
            const k = created.slice(0, 7);
            if (netTrendMap.has(k))
              netTrendMap.set(k, (netTrendMap.get(k) || 0) + 1);
          }
        }
        const netTrendData: TrendPoint[] = netMonths.map((m) => ({
          month: m,
          submissions: netTrendMap.get(m) || 0,
        }));

        // Closed client files per year
        const closedRows = (closedRes.data as any[]) || [];
        const closedMap = new Map<number, number>();
        for (const r of closedRows) {
          const y = Number(r.year);
          if (Number.isFinite(y)) closedMap.set(y, (closedMap.get(y) || 0) + 1);
        }
        const closedYearData = Array.from(closedMap.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([year, count]) => ({ year, count }));

        setGrants(gSummary);
        setTrend(trendData);
        setNetworkingTrend(netTrendData);
        setNetworkingCount(netRes.count || (netRes.data as any[])?.length || 0);
        setClosedFilesCount(closedCountRes.count || closedRows.length);
        setClosedByYear(closedYearData);

        setError(null);
      } catch (e: any) {
        setError(e?.message || "Failed to load overview");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [organizationId]);

  const currency = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    []
  );

  return (
    <Card bordered={false}>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div>
            <Typography.Title
              level={2}
              style={{ marginTop: 0, marginBottom: 0 }}
            >
              Welcome back, {displayName}
            </Typography.Title>
            <Typography.Paragraph
              type="secondary"
              style={{ marginBottom: 0, fontSize: 16 }}
            >
              High-level overview of your organization's data footprint
            </Typography.Paragraph>
          </div>
        </div>

        {error && (
          <Alert
            type="error"
            showIcon
            message="Failed to load overview"
            description={error}
            style={{ marginBottom: 12 }}
          />
        )}

        {loading ? (
          <>
            <Skeleton active paragraph={{ rows: 2 }} />
            <div style={{ height: 12 }} />
            <Skeleton active paragraph={{ rows: 6 }} />
          </>
        ) : (
          <>
            {/* KPI cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <KpiCard
                title="Active Applications"
                value={grants.pending + grants.submitted + grants.queued}
                hint={`${grants.total} total records`}
                icon={<DashboardOutlined />}
                accent="#ef4444"
              />
              <KpiCard
                title="Accepted"
                value={grants.accepted}
                icon={<CheckCircleOutlined />}
                accent="#16a34a"
              />
              <KpiCard
                title="Rejected"
                value={grants.rejected}
                icon={<CloseCircleOutlined />}
                accent="#dc2626"
              />
              <KpiCard
                title="Contacts"
                value={networkingCount}
                icon={<TeamOutlined />}
                accent="#2563eb"
              />
              <KpiCard
                title="Closed Client Files"
                value={closedFilesCount}
                icon={<FileDoneOutlined />}
                accent="#7c3aed"
              />
            </div>

            {/* Networking + Closed Files visualizations */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginTop: 12,
              }}
            >
              <Card
                title={
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>Contacts Added (last 12 months)</span>
                    <Tag color="red">Networking</Tag>
                  </div>
                }
                bordered
              >
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={networkingTrend}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorNet"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#ef4444"
                            stopOpacity={0.32}
                          />
                          <stop
                            offset="100%"
                            stopColor="#ef4444"
                            stopOpacity={0.06}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={token.colorBorder}
                      />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(v: any) => [String(v), "Contacts"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="submissions"
                        stroke="#ef4444"
                        fill="url(#colorNet)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card
                title={
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>Closed Files by FY</span>
                    <Tag color="red">Closed Client Files</Tag>
                  </div>
                }
                bordered
              >
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={closedByYear}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={token.colorBorder}
                      />
                      <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: any) => [String(v), "Records"]} />
                      <Bar
                        dataKey="count"
                        fill="#ef4444"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Submissions trend */}
            <Card
              title={
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Submissions (last 12 months)</span>
                  <Tag color="red">Applications</Tag>
                </div>
              }
              bordered
              style={{ background: token.colorBgContainer }}
            >
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trend}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorPrimary"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#ef4444"
                          stopOpacity={0.38}
                        />
                        <stop
                          offset="100%"
                          stopColor="#ef4444"
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={token.colorBorder}
                    />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(v: any) => [String(v), "Submissions"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="submissions"
                      stroke="#ef4444"
                      fill="url(#colorPrimary)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </>
        )}
      </motion.div>
    </Card>
  );
}

function KpiCard({
  title,
  value,
  hint,
  extra,
  icon,
  accent,
}: {
  title: string;
  value: number;
  hint?: string;
  extra?: string;
  icon?: React.ReactNode;
  accent?: string;
}) {
  const { token } = theme.useToken();
  return (
    <Card
      bordered={false}
      style={{
        borderColor: token.colorBorder,
        background: `linear-gradient(180deg, ${
          accent || "#ef4444"
        }14, transparent 85%)`,
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {icon && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              display: "grid",
              placeItems: "center",
              background: `${accent || "#ef4444"}22`,
              color: accent || "#ef4444",
            }}
          >
            {icon}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Typography.Text type="secondary">{title}</Typography.Text>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <Typography.Title level={2} style={{ margin: 0 }}>
              {new Intl.NumberFormat("en-US").format(value)}
            </Typography.Title>
            {extra ? (
              <Typography.Text type="secondary">{extra}</Typography.Text>
            ) : null}
          </div>
          {hint && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {hint}
            </Typography.Text>
          )}
        </div>
      </div>
    </Card>
  );
}

function renderStatusTag(status: string | null) {
  const s = (status || "").toLowerCase();
  let color: string = "default";
  if (s.includes("accepted")) color = "green";
  else if (s.includes("rejected")) color = "red";
  else if (s.includes("submission")) color = "blue";
  else if (s.includes("pending")) color = "gold";
  return (
    <Tag color={color} style={{ height: 22, lineHeight: "20px" }}>
      {status || ""}
    </Tag>
  );
}
