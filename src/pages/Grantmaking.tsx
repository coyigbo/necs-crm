import {
  Card,
  Typography,
  Table,
  Alert,
  Spin,
  Tabs,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Popconfirm,
  message,
  Dropdown,
  Divider,
} from "antd";
import { Upload } from "antd";
const { Dragger } = Upload;
import { useSearchParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import { useOrg } from "../org/OrgProvider";
import { useAuth } from "../auth/AuthProvider";
import dayjs from "dayjs";
import { DownOutlined } from "@ant-design/icons";

type GrantStatus =
  | "Pending Submission"
  | "Submission"
  | "Proposal Rejected"
  | "Proposal Accepted";

type GrantItem = {
  id: string;
  donor_name: string;
  status: GrantStatus | null;
  user_id?: string | null;
  date_opened: string | null;
  date_due: string | null;
  program: string | null;
  value: number | null;
  region: string | null;
  contact: string | null;
  review_url: string | null;
  notes: string | null;
  date_submission: string | null;
  report_due: string | null;
  review_outcome?: string | null;
};

type DisbursedAwardItem = {
  id: string;
  donor_name: string | null;
  award_name: string | null;
  amount: number | null;
  date_disbursed: string | null;
  notes: string | null;
  user_id?: string | null;
};

export default function Grantmaking() {
  const [rows, setRows] = useState<GrantItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { organizationId } = useOrg();
  const [params, setParams] = useSearchParams();
  const activeTab = params.get("tab") || "applications";
  const appsView = params.get("apps") || "pending";
  const outView = params.get("out") || "accepted";
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const { user } = useAuth();
  const [selectedGrant, setSelectedGrant] = useState<GrantItem | null>(null);
  const [awards, setAwards] = useState<DisbursedAwardItem[] | null>(null);
  const [awardOpen, setAwardOpen] = useState(false);
  const [awardForm] = Form.useForm();
  const [awardImportOpen, setAwardImportOpen] = useState(false);
  const [appImportOpen, setAppImportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingGrant, setEditingGrant] = useState<GrantItem | null>(null);
  const [editForm] = Form.useForm();

  const loadGrantsWithNames = async (orgId: string) => {
    const { data, error } = await supabase
      .from("grants")
      .select(
        "id,donor_name,status,user_id,date_opened,date_due,program,value,region,contact,review_url,notes,date_submission,report_due,review_outcome"
      )
      .eq("organization_id", orgId)
      .order("donor_name", { ascending: true });
    if (error) throw error;
    const list = (data as GrantItem[]) ?? [];
    try {
      const ids = Array.from(
        new Set(list.map((r) => r.user_id).filter(Boolean) as string[])
      );
      if (ids.length > 0) {
        const url = `${
          import.meta.env.VITE_SUPABASE_URL
        }/functions/v1/user-names`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ userIds: ids }),
        });
        const payload = await res.json().catch(() => ({ names: {} }));
        const names: Record<string, string> = payload?.names ?? {};
        setRows(
          list.map((r) => ({
            ...(r as any),
            _creatorName: names[r.user_id ?? ""],
          }))
        );
      } else {
        setRows(list);
      }
    } catch {
      setRows(list);
    }
  };

  const loadAwards = async (orgId: string) => {
    const { data, error } = await supabase
      .from("disbursed_awards")
      .select("id,donor_name,award_name,amount,date_disbursed,notes,user_id")
      .eq("organization_id", orgId)
      .order("date_disbursed", { ascending: false });
    if (error) throw error;
    const list = (data as DisbursedAwardItem[]) ?? [];
    try {
      const ids = Array.from(
        new Set(list.map((r) => r.user_id).filter(Boolean) as string[])
      );
      if (ids.length > 0) {
        const url = `${
          import.meta.env.VITE_SUPABASE_URL
        }/functions/v1/user-names`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ userIds: ids }),
        });
        const payload = await res.json().catch(() => ({ names: {} }));
        const names: Record<string, string> = payload?.names ?? {};
        setAwards(
          list.map((r) => ({
            ...(r as any),
            _creatorName: names[r.user_id ?? ""],
          }))
        );
      } else {
        setAwards(list);
      }
    } catch {
      setAwards(list);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!organizationId) {
        setRows([]);
        setAwards([]);
        return;
      }
      await loadGrantsWithNames(organizationId);
      await loadAwards(organizationId);
      if (!isMounted) return;
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [organizationId]);

  const renderNull = () => <span style={{ color: "#ef4444" }}>NULL</span>;

  const displayOrNull = (value: any): ReactNode => {
    if (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "")
    ) {
      return renderNull();
    }
    return value;
  };

  const toTitleCase = (s: string) =>
    s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  const headerCellStyle: CSSProperties = useMemo(
    () => ({
      backgroundColor: "#f7f9fc",
      fontWeight: 600,
      textTransform: "uppercase",
      fontSize: 12,
      letterSpacing: 0.3,
      color: "#344054",
      borderBottom: "1px solid #e5e7eb",
      textAlign: "center",
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
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          Grants
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          Manage applications and outcomes.
        </Typography.Paragraph>
        <Tabs
          activeKey={activeTab}
          onChange={(k) => {
            const next = new URLSearchParams(params);
            next.set("tab", k);
            setParams(next);
          }}
          items={[
            { key: "applications", label: "Applications" },
            { key: "outcomes", label: "Outcomes" },
          ]}
          style={{ marginBottom: 16 }}
        />
        {error && (
          <Alert
            type="error"
            showIcon
            message="Failed to load grants"
            description={error}
            style={{ marginBottom: 12 }}
          />
        )}
        {rows === null ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 48,
            }}
          >
            <Spin />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            {activeTab === "applications" && (
              <>
                {(() => {
                  const submitted = (rows ?? []).filter(
                    (r) => (r.status ?? "") === "Submission"
                  );
                  const queued = (rows ?? []).filter(
                    (r) => String(r.status ?? "") === "Queued"
                  );
                  const pending = (rows ?? []).filter(
                    (r) => (r.status ?? "") === "Pending Submission"
                  );
                  const data = appsView === "submitted" ? submitted : pending;
                  return (
                    <>
                      <AnimatePresence initial={false}>
                        {queued.length > 0 && (
                          <motion.div
                            key="queued-section"
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.18 }}
                            layout
                          >
                            <div style={{ marginBottom: 16 }}>
                              <Typography.Text
                                strong
                                style={{
                                  fontSize: 16,
                                  marginBottom: 8,
                                  display: "block",
                                }}
                              >
                                Queued ({queued.length})
                              </Typography.Text>
                              <Table
                                rowKey={(r) => r.id}
                                dataSource={queued}
                                pagination={{
                                  showSizeChanger: true,
                                  showQuickJumper: false,
                                  showTotal: (total, range) =>
                                    `${range[0]}-${range[1]} of ${total} items`,
                                }}
                                scroll={{ x: 1000 }}
                                tableLayout="fixed"
                                style={{ width: "100%" }}
                                columns={(() => {
                                  const currency = new Intl.NumberFormat(
                                    "en-US",
                                    {
                                      style: "currency",
                                      currency: "USD",
                                      maximumFractionDigits: 0,
                                    }
                                  );
                                  return [
                                    {
                                      title: "Donor Name",
                                      dataIndex: "donor_name",
                                      width: 130,
                                      ellipsis: true,
                                      align: "center",
                                      onHeaderCell: () => ({
                                        style: headerCellStyle,
                                      }),
                                      render: (value: string | null) =>
                                        value
                                          ? toTitleCase(String(value))
                                          : renderNull(),
                                    },
                                    {
                                      title: "Date Opened",
                                      dataIndex: "date_opened",
                                      width: 100,
                                      align: "center",
                                      ellipsis: true,
                                      onHeaderCell: () => ({
                                        style: headerCellStyle,
                                      }),
                                      render: (value: string | null) =>
                                        displayOrNull(value),
                                    },
                                    {
                                      title: "Date Due",
                                      dataIndex: "date_due",
                                      width: 100,
                                      align: "center",
                                      ellipsis: true,
                                      onHeaderCell: () => ({
                                        style: headerCellStyle,
                                      }),
                                      render: (value: string | null) =>
                                        displayOrNull(value),
                                    },
                                    {
                                      title: "Program",
                                      dataIndex: "program",
                                      width: 100,
                                      ellipsis: true,
                                      align: "center",
                                      onHeaderCell: () => ({
                                        style: headerCellStyle,
                                      }),
                                      render: (value: string | null) =>
                                        value
                                          ? toTitleCase(String(value))
                                          : renderNull(),
                                    },
                                    {
                                      title: "Value",
                                      dataIndex: "value",
                                      width: 100,
                                      align: "center",
                                      onHeaderCell: () => ({
                                        style: headerCellStyle,
                                      }),
                                      render: (v: number | null) =>
                                        typeof v === "number"
                                          ? currency.format(v)
                                          : renderNull(),
                                    },
                                    {
                                      title: "Region",
                                      dataIndex: "region",
                                      width: 100,
                                      ellipsis: true,
                                      align: "center",
                                      onHeaderCell: () => ({
                                        style: headerCellStyle,
                                      }),
                                      render: (value: string | null) =>
                                        value
                                          ? toTitleCase(String(value))
                                          : renderNull(),
                                    },
                                    {
                                      title: "Actions",
                                      width: 120,
                                      align: "center",
                                      onHeaderCell: () => ({
                                        style: headerCellStyle,
                                      }),
                                      render: (r: GrantItem) => {
                                        const items: any[] = [
                                          {
                                            key: "move-pending",
                                            label: (
                                              <span
                                                onClick={async (e) => {
                                                  e.stopPropagation();
                                                  if (!organizationId) return;
                                                  try {
                                                    const { error } =
                                                      await supabase
                                                        .from("grants")
                                                        .update({
                                                          status:
                                                            "Pending Submission",
                                                        })
                                                        .eq("id", r.id)
                                                        .eq(
                                                          "organization_id",
                                                          organizationId
                                                        );
                                                    if (error) throw error;
                                                    message.success(
                                                      "Moved to pending submission"
                                                    );
                                                    await loadGrantsWithNames(
                                                      organizationId
                                                    );
                                                    const next =
                                                      new URLSearchParams(
                                                        params
                                                      );
                                                    next.set("apps", "pending");
                                                    setParams(next);
                                                  } catch (e) {
                                                    message.error(
                                                      "Failed to move to pending"
                                                    );
                                                  }
                                                }}
                                              >
                                                Move to pending
                                              </span>
                                            ),
                                          },
                                          {
                                            key: "edit",
                                            label: (
                                              <span
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingGrant(r);
                                                  setEditOpen(true);
                                                  editForm.setFieldsValue({
                                                    donor_name: r.donor_name,
                                                    date_opened: r.date_opened
                                                      ? dayjs(r.date_opened)
                                                      : null,
                                                    date_due: r.date_due
                                                      ? dayjs(r.date_due)
                                                      : null,
                                                    program: r.program,
                                                    value: r.value,
                                                    region: r.region,
                                                    contact: r.contact,
                                                    review_url: r.review_url,
                                                    notes: r.notes,
                                                    report_due: r.report_due
                                                      ? dayjs(r.report_due)
                                                      : null,
                                                  });
                                                }}
                                              >
                                                Edit
                                              </span>
                                            ),
                                          },
                                          {
                                            key: "delete",
                                            label: (
                                              <span
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  Modal.confirm({
                                                    title:
                                                      "Delete application?",
                                                    okText: "Delete",
                                                    okType: "danger",
                                                    onOk: async () => {
                                                      if (!organizationId)
                                                        return;
                                                      try {
                                                        const { error } =
                                                          await supabase
                                                            .from("grants")
                                                            .delete()
                                                            .eq("id", r.id)
                                                            .eq(
                                                              "organization_id",
                                                              organizationId
                                                            );
                                                        if (error) throw error;
                                                        message.success(
                                                          "Application deleted"
                                                        );
                                                        await loadGrantsWithNames(
                                                          organizationId
                                                        );
                                                      } catch {
                                                        message.error(
                                                          "Failed to delete"
                                                        );
                                                      }
                                                    },
                                                  });
                                                }}
                                              >
                                                Delete
                                              </span>
                                            ),
                                          },
                                        ];
                                        return (
                                          <Dropdown
                                            menu={{
                                              items,
                                              onClick: async ({
                                                key,
                                                domEvent,
                                              }) => {
                                                domEvent.stopPropagation();
                                                if (key === "view") {
                                                  setSelectedGrant(r);
                                                }
                                              },
                                            }}
                                            placement="bottomRight"
                                            trigger={["click"]}
                                          >
                                            <Button
                                              type="primary"
                                              danger
                                              size="small"
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                            >
                                              Actions <DownOutlined />
                                            </Button>
                                          </Dropdown>
                                        );
                                      },
                                    },
                                  ];
                                })()}
                                onRow={(record) => ({
                                  onClick: () => setSelectedGrant(record),
                                  style: { cursor: "pointer" },
                                })}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <Tabs
                        size="small"
                        activeKey={appsView}
                        onChange={(k) => {
                          const next = new URLSearchParams(params);
                          next.set("apps", k);
                          setParams(next);
                        }}
                        tabBarExtraContent={{
                          right: (
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                marginBottom: 6,
                              }}
                            >
                              <Button
                                type="primary"
                                danger
                                onClick={() => setAppImportOpen(true)}
                              >
                                Import Data as CSV
                              </Button>
                              <Button
                                type="primary"
                                onClick={() => setCreateOpen(true)}
                              >
                                Start Application
                              </Button>
                            </div>
                          ),
                        }}
                        items={[
                          {
                            key: "pending",
                            label: `Pending Submission (${pending.length})`,
                          },
                          {
                            key: "submitted",
                            label: `Submitted (${submitted.length})`,
                          },
                        ]}
                        style={{ marginBottom: 12 }}
                      />
                      <motion.div
                        key={`apps-${appsView}-${data.length}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                        layout
                      >
                        <Table
                          rowKey={(r) => r.id}
                          dataSource={data}
                          pagination={{
                            showSizeChanger: true,
                            showQuickJumper: false,
                            showTotal: (total, range) =>
                              `${range[0]}-${range[1]} of ${total} items`,
                          }}
                          scroll={{ x: 1000 }}
                          tableLayout="fixed"
                          style={{ width: "100%" }}
                          columns={(() => {
                            const actionsCol = {
                              title: "Actions",
                              width: 120,
                              align: "center",
                              onHeaderCell: () => ({ style: headerCellStyle }),
                              render: (r: GrantItem) => {
                                const status = r.status ?? "";
                                const isPending =
                                  status === "Pending Submission";
                                const isSubmitted =
                                  status === "Submission" ||
                                  status === "Proposal Accepted";
                                const inSubmittedView =
                                  appsView === "submitted";
                                const inPendingView = appsView === "pending";
                                const items: any[] = [
                                  { key: "view", label: "View Details" },
                                ];
                                if (inPendingView) {
                                  items.push({
                                    key: "mark-submitted",
                                    disabled: !isPending,
                                    label: (
                                      <span
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (!organizationId) return;
                                          try {
                                            const today = new Date()
                                              .toISOString()
                                              .slice(0, 10);
                                            const { error } = await supabase
                                              .from("grants")
                                              .update({
                                                status: "Submission",
                                                date_submission: today,
                                              })
                                              .eq("id", r.id)
                                              .eq(
                                                "organization_id",
                                                organizationId
                                              );
                                            if (error) throw error;
                                            message.success(
                                              "Marked as submitted"
                                            );
                                            await loadGrantsWithNames(
                                              organizationId
                                            );
                                            const next = new URLSearchParams(
                                              params
                                            );
                                            next.set("apps", "submitted");
                                            setParams(next);
                                          } catch {
                                            message.error(
                                              "Failed to mark as submitted"
                                            );
                                          }
                                        }}
                                      >
                                        Mark as submitted
                                      </span>
                                    ),
                                  });
                                  items.push({
                                    key: "revert-queue",
                                    label: (
                                      <span
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (!organizationId) return;
                                          try {
                                            const { error } = await supabase
                                              .from("grants")
                                              .update({
                                                status: "Queued",
                                                date_submission: null,
                                              })
                                              .eq("id", r.id)
                                              .eq(
                                                "organization_id",
                                                organizationId
                                              );
                                            if (error) throw error;
                                            message.success("Moved to queue");
                                            await loadGrantsWithNames(
                                              organizationId
                                            );
                                          } catch {
                                            message.error(
                                              "Failed to move to queue"
                                            );
                                          }
                                        }}
                                      >
                                        Revert to queue
                                      </span>
                                    ),
                                  });
                                  items.push({
                                    key: "delete",
                                    label: (
                                      <span
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          Modal.confirm({
                                            title: "Delete application?",
                                            okText: "Delete",
                                            okType: "danger",
                                            onOk: async () => {
                                              if (!organizationId) return;
                                              try {
                                                const { error } = await supabase
                                                  .from("grants")
                                                  .delete()
                                                  .eq("id", r.id)
                                                  .eq(
                                                    "organization_id",
                                                    organizationId
                                                  );
                                                if (error) throw error;
                                                message.success(
                                                  "Application deleted"
                                                );
                                                await loadGrantsWithNames(
                                                  organizationId
                                                );
                                              } catch {
                                                message.error(
                                                  "Failed to delete"
                                                );
                                              }
                                            },
                                          });
                                        }}
                                      >
                                        Delete
                                      </span>
                                    ),
                                  });
                                }
                                if (inSubmittedView) {
                                  // New Review Outcome shortcuts (no-ops for now; will define behavior later)
                                  const reviewItems = [
                                    {
                                      key: "loi-accepted",
                                      label: "LOI Accepted",
                                    },
                                    {
                                      key: "loi-rejected",
                                      label: "LOI Rejected",
                                    },
                                    {
                                      key: "full-accepted",
                                      label: "Full Proposal Accepted",
                                    },
                                    {
                                      key: "full-rejected",
                                      label: "Full Proposal Rejected",
                                    },
                                  ];
                                  for (const it of reviewItems) {
                                    items.push({
                                      key: it.key,
                                      label: (
                                        <span
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            if (!organizationId) return;
                                            try {
                                              if (
                                                it.key === "loi-rejected" ||
                                                it.key === "full-rejected"
                                              ) {
                                                const { error } = await supabase
                                                  .from("grants")
                                                  .update({
                                                    status: "Proposal Rejected",
                                                    review_outcome: it.label,
                                                  })
                                                  .eq("id", r.id)
                                                  .eq(
                                                    "organization_id",
                                                    organizationId
                                                  );
                                                if (error) throw error;
                                                message.success(
                                                  "Moved to rejected"
                                                );
                                                await loadGrantsWithNames(
                                                  organizationId
                                                );
                                                const next =
                                                  new URLSearchParams(params);
                                                next.set("tab", "outcomes");
                                                next.set("out", "rejected");
                                                setParams(next);
                                              } else if (
                                                it.key === "loi-accepted"
                                              ) {
                                                const { error } = await supabase
                                                  .from("grants")
                                                  .update({
                                                    status:
                                                      "Pending Submission",
                                                    review_outcome: it.label,
                                                    date_submission: null,
                                                  })
                                                  .eq("id", r.id)
                                                  .eq(
                                                    "organization_id",
                                                    organizationId
                                                  );
                                                if (error) throw error;
                                                message.success(
                                                  "Moved to pending (LOI Accepted)"
                                                );
                                                await loadGrantsWithNames(
                                                  organizationId
                                                );
                                                const next =
                                                  new URLSearchParams(params);
                                                next.set("apps", "pending");
                                                setParams(next);
                                              } else if (
                                                it.key === "full-accepted"
                                              ) {
                                                const { error } = await supabase
                                                  .from("grants")
                                                  .update({
                                                    status: "Proposal Accepted",
                                                    review_outcome: it.label,
                                                  })
                                                  .eq("id", r.id)
                                                  .eq(
                                                    "organization_id",
                                                    organizationId
                                                  );
                                                if (error) throw error;
                                                message.success(
                                                  "Moved to accepted"
                                                );
                                                await loadGrantsWithNames(
                                                  organizationId
                                                );
                                                const next =
                                                  new URLSearchParams(params);
                                                next.set("tab", "outcomes");
                                                next.set("out", "accepted");
                                                setParams(next);
                                              }
                                            } catch {
                                              message.error(
                                                "Failed to update outcome"
                                              );
                                            }
                                          }}
                                        >
                                          {it.label}
                                        </span>
                                      ),
                                    });
                                  }
                                  items.push({
                                    key: "delete",
                                    label: (
                                      <span
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          Modal.confirm({
                                            title: "Delete application?",
                                            okText: "Delete",
                                            okType: "danger",
                                            onOk: async () => {
                                              if (!organizationId) return;
                                              try {
                                                const { error } = await supabase
                                                  .from("grants")
                                                  .delete()
                                                  .eq("id", r.id)
                                                  .eq(
                                                    "organization_id",
                                                    organizationId
                                                  );
                                                if (error) throw error;
                                                message.success(
                                                  "Application deleted"
                                                );
                                                await loadGrantsWithNames(
                                                  organizationId
                                                );
                                              } catch {
                                                message.error(
                                                  "Failed to delete"
                                                );
                                              }
                                            },
                                          });
                                        }}
                                      >
                                        Delete
                                      </span>
                                    ),
                                  });
                                }
                                return (
                                  <Dropdown
                                    menu={{
                                      items,
                                      onClick: async ({ key, domEvent }) => {
                                        domEvent.stopPropagation();
                                        if (key === "view") {
                                          setSelectedGrant(r);
                                        }
                                      },
                                    }}
                                    placement="bottomRight"
                                    trigger={["click"]}
                                  >
                                    <Button
                                      type="primary"
                                      danger
                                      size="small"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      Actions <DownOutlined />
                                    </Button>
                                  </Dropdown>
                                );
                              },
                            } as any;
                            const inSubmittedView = appsView === "submitted";
                            const inPendingView = appsView === "pending";
                            const currency = new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                              maximumFractionDigits: 0,
                            });
                            const baseCols = [
                              {
                                title: "Donor Name",
                                dataIndex: "donor_name",
                                width: 130,
                                ellipsis: true,
                                align: "center",
                                onHeaderCell: () => ({
                                  style: headerCellStyle,
                                }),
                                render: (value: string | null) =>
                                  value
                                    ? toTitleCase(String(value))
                                    : renderNull(),
                              },
                              {
                                title: "Date Opened",
                                dataIndex: "date_opened",
                                width: 100,
                                ellipsis: true,
                                align: "center",
                                onHeaderCell: () => ({
                                  style: headerCellStyle,
                                }),
                                render: (value: string | null) =>
                                  displayOrNull(value),
                              },
                              {
                                title: "Date Due",
                                dataIndex: "date_due",
                                width: 100,
                                ellipsis: true,
                                align: "center",
                                onHeaderCell: () => ({
                                  style: headerCellStyle,
                                }),
                                render: (value: string | null) =>
                                  displayOrNull(value),
                              },
                              {
                                title: "Program",
                                dataIndex: "program",
                                width: 100,
                                ellipsis: true,
                                align: "center",
                                onHeaderCell: () => ({
                                  style: headerCellStyle,
                                }),
                                render: (value: string | null) =>
                                  value
                                    ? toTitleCase(String(value))
                                    : renderNull(),
                              },
                              {
                                title: "Value",
                                dataIndex: "value",
                                width: 100,
                                align: "center",
                                onHeaderCell: () => ({
                                  style: headerCellStyle,
                                }),
                                render: (v: number | null) =>
                                  typeof v === "number"
                                    ? currency.format(v)
                                    : renderNull(),
                              },
                              {
                                title: "Region",
                                dataIndex: "region",
                                width: 100,
                                ellipsis: true,
                                align: "center",
                                onHeaderCell: () => ({
                                  style: headerCellStyle,
                                }),
                                render: (value: string | null) =>
                                  value
                                    ? toTitleCase(String(value))
                                    : renderNull(),
                              },
                            ] as any[];
                            if (inPendingView) {
                              // Insert Review Outcome column at the end
                              const insertIndex = baseCols.length;
                              baseCols.splice(insertIndex, 0, {
                                title: "Review Outcome",
                                dataIndex: "review_outcome",
                                width: 140,
                                ellipsis: true,
                                align: "center",
                                onHeaderCell: () => ({
                                  style: headerCellStyle,
                                }),
                                render: (v: string | null | undefined) =>
                                  v === "LOI Accepted" ? (
                                    <Typography.Text
                                      style={{ color: "#ef4444" }}
                                    >
                                      {v}
                                    </Typography.Text>
                                  ) : (
                                    displayOrNull(v)
                                  ),
                              } as any);
                            }
                            return [...baseCols, actionsCol];
                          })()}
                          onRow={(record) => ({
                            onClick: () => setSelectedGrant(record),
                            style: { cursor: "pointer" },
                          })}
                        />
                      </motion.div>
                    </>
                  );
                })()}
              </>
            )}
            {activeTab === "outcomes" && (
              <>
                {(() => {
                  const accepted = (rows ?? []).filter(
                    (r) => (r.status ?? "") === "Proposal Accepted"
                  );
                  const rejected = (rows ?? []).filter(
                    (r) => (r.status ?? "") === "Proposal Rejected"
                  );
                  const data = outView === "accepted" ? accepted : rejected;
                  return (
                    <>
                      <Tabs
                        size="small"
                        activeKey={outView}
                        onChange={(k) => {
                          const next = new URLSearchParams(params);
                          next.set("out", k);
                          setParams(next);
                        }}
                        items={[
                          {
                            key: "accepted",
                            label: `Accepted Applications (${accepted.length})`,
                          },
                          {
                            key: "rejected",
                            label: `Rejected Applications (${rejected.length})`,
                          },
                        ]}
                        style={{ marginBottom: 12 }}
                      />
                      <Table
                        rowKey={(r) => r.id}
                        dataSource={data}
                        pagination={{
                          showSizeChanger: true,
                          showQuickJumper: false,
                          showTotal: (total, range) =>
                            `${range[0]}-${range[1]} of ${total} items`,
                        }}
                        scroll={{ x: 1200 }}
                        tableLayout="fixed"
                        style={{ width: "100%" }}
                        columns={(() => {
                          const currency = new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                            maximumFractionDigits: 0,
                          });
                          const baseCols = [
                            {
                              title: "Donor Name",
                              dataIndex: "donor_name",
                              width: 150,
                              ellipsis: true,
                              align: "center",
                              onHeaderCell: () => ({ style: headerCellStyle }),
                              render: (value: string | null) =>
                                value
                                  ? toTitleCase(String(value))
                                  : renderNull(),
                            },
                            {
                              title: "Date Opened",
                              dataIndex: "date_opened",
                              width: 120,
                              ellipsis: true,
                              align: "center",
                              onHeaderCell: () => ({ style: headerCellStyle }),
                              render: (value: string | null) =>
                                displayOrNull(value),
                            },
                            {
                              title: "Date Due",
                              dataIndex: "date_due",
                              width: 120,
                              ellipsis: true,
                              align: "center",
                              onHeaderCell: () => ({ style: headerCellStyle }),
                              render: (value: string | null) =>
                                displayOrNull(value),
                            },
                            {
                              title: "Program",
                              dataIndex: "program",
                              width: 120,
                              ellipsis: true,
                              align: "center",
                              onHeaderCell: () => ({ style: headerCellStyle }),
                              render: (value: string | null) =>
                                value
                                  ? toTitleCase(String(value))
                                  : renderNull(),
                            },
                            {
                              title: "Value",
                              dataIndex: "value",
                              width: 120,
                              align: "center",
                              onHeaderCell: () => ({ style: headerCellStyle }),
                              render: (v: number | null) =>
                                typeof v === "number"
                                  ? currency.format(v)
                                  : renderNull(),
                            },
                            {
                              title: "Region",
                              dataIndex: "region",
                              width: 140,
                              ellipsis: true,
                              align: "center",
                              onHeaderCell: () => ({ style: headerCellStyle }),
                              render: (value: string | null) =>
                                value
                                  ? toTitleCase(String(value))
                                  : renderNull(),
                            },
                          ] as any[];
                          const actionsCol = {
                            title: "Actions",
                            width: 320,
                            align: "center",
                            onHeaderCell: () => ({ style: headerCellStyle }),
                            render: (r: GrantItem) => {
                              const items: any[] = [
                                { key: "view", label: "View Details" },
                                {
                                  key: "revert",
                                  label: (
                                    <span
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!organizationId) return;
                                        try {
                                          const { error } = await supabase
                                            .from("grants")
                                            .update({
                                              status: "Pending Submission",
                                              date_submission: null,
                                            })
                                            .eq("id", r.id)
                                            .eq(
                                              "organization_id",
                                              organizationId
                                            );
                                          if (error) throw error;
                                          message.success(
                                            "Reverted to pending"
                                          );
                                          await loadGrantsWithNames(
                                            organizationId
                                          );
                                          const next = new URLSearchParams(
                                            params
                                          );
                                          next.set("apps", "pending");
                                          setParams(next);
                                        } catch {
                                          message.error(
                                            "Failed to revert to pending"
                                          );
                                        }
                                      }}
                                    >
                                      Revert to pending
                                    </span>
                                  ),
                                },
                                {
                                  key: "delete",
                                  label: (
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        Modal.confirm({
                                          title: "Delete application?",
                                          okText: "Delete",
                                          okType: "danger",
                                          onOk: async () => {
                                            if (!organizationId) return;
                                            try {
                                              const { error } = await supabase
                                                .from("grants")
                                                .delete()
                                                .eq("id", r.id)
                                                .eq(
                                                  "organization_id",
                                                  organizationId
                                                );
                                              if (error) throw error;
                                              message.success(
                                                "Application deleted"
                                              );
                                              await loadGrantsWithNames(
                                                organizationId
                                              );
                                            } catch {
                                              message.error("Failed to delete");
                                            }
                                          },
                                        });
                                      }}
                                    >
                                      Delete
                                    </span>
                                  ),
                                },
                              ];
                              return (
                                <Dropdown
                                  menu={{
                                    items,
                                    onClick: async ({ key, domEvent }) => {
                                      domEvent.stopPropagation();
                                      if (key === "view") {
                                        setSelectedGrant(r);
                                      }
                                    },
                                  }}
                                  placement="bottomRight"
                                  trigger={["click"]}
                                >
                                  <Button
                                    type="primary"
                                    danger
                                    size="small"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Actions <DownOutlined />
                                  </Button>
                                </Dropdown>
                              );
                            },
                          } as any;
                          return [...baseCols, actionsCol];
                        })()}
                        onRow={(record) => ({
                          onClick: () => setSelectedGrant(record),
                          style: { cursor: "pointer" },
                        })}
                      />
                    </>
                  );
                })()}
              </>
            )}
            {activeTab === "disbursed" && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: 12,
                  }}
                >
                  <Button type="primary" onClick={() => setAwardOpen(true)}>
                    Add Disbursed Award
                  </Button>
                  <Button
                    style={{ marginLeft: 8 }}
                    onClick={() => setAwardImportOpen(true)}
                  >
                    Import CSV
                  </Button>
                </div>
                <Table
                  rowKey={(r) => r.id}
                  dataSource={awards ?? []}
                  columns={[
                    { title: "Donor Name", dataIndex: "donor_name" },
                    {
                      title: "Created By",
                      render: (r: any) => r._creatorName || "—",
                    },
                    {
                      title: "Date Opened",
                      dataIndex: "date_opened",
                      width: 120,
                      render: () => null,
                    },
                    {
                      title: "Date Due",
                      dataIndex: "date_due",
                      width: 120,
                      render: () => null,
                    },
                    {
                      title: "Report Due",
                      dataIndex: "report_due",
                      width: 120,
                      render: () => null,
                    },
                    {
                      title: "Program",
                      dataIndex: "program",
                      render: () => null,
                    },
                    { title: "Award Name", dataIndex: "award_name" },
                    {
                      title: "Amount",
                      dataIndex: "amount",
                      width: 140,
                      render: (v: number | null) =>
                        typeof v === "number"
                          ? new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                              maximumFractionDigits: 0,
                            }).format(v)
                          : "—",
                    },
                    {
                      title: "Date Disbursed",
                      dataIndex: "date_disbursed",
                      width: 140,
                    },
                    {
                      title: "Region",
                      dataIndex: "region",
                      render: () => null,
                    },
                    { title: "Notes", dataIndex: "notes" },
                  ]}
                />
              </>
            )}
          </motion.div>
        )}
      </motion.div>
      <Modal
        title="Start Application"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={async (values: any) => {
            if (!organizationId || !user?.id) {
              return Modal.error({ title: "No organization or user found" });
            }
            try {
              const { error } = await supabase.from("grants").insert({
                donor_name: values.donor_name,
                date_opened: values.date_opened
                  ? values.date_opened.format("YYYY-MM-DD")
                  : null,
                date_due: values.date_due
                  ? values.date_due.format("YYYY-MM-DD")
                  : null,
                program: values.program ?? null,
                value:
                  typeof values.value === "number" &&
                  !Number.isNaN(values.value)
                    ? values.value
                    : null,
                region: values.region ?? null,
                contact: values.contact ?? null,
                review_url: values.review_url ?? null,
                notes: values.notes ?? null,
                date_submission: null,
                status: "Queued",
                report_due: values.report_due
                  ? values.report_due.format("YYYY-MM-DD")
                  : null,
                organization_id: organizationId,
                user_id: user.id,
              });
              if (error) throw error;
              createForm.resetFields();
              setCreateOpen(false);
              // Reload the list
              await loadGrantsWithNames(organizationId);
              const next = new URLSearchParams(params);
              next.set("tab", "applications");
              next.set("apps", "pending");
              setParams(next);
            } catch (e) {
              Modal.error({ title: "Failed to create application" });
            }
          }}
          requiredMark={false}
        >
          <Form.Item
            name="donor_name"
            label="Donor Name"
            rules={[{ required: true }]}
          >
            <Input placeholder="Donor name" />
          </Form.Item>
          <Form.Item name="date_opened" label="Date Opened">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="date_due" label="Date Due">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="program" label="Program">
            <Input placeholder="Program" />
          </Form.Item>
          <Form.Item name="value" label="Value">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item name="region" label="Region">
            <Input placeholder="Region" />
          </Form.Item>
          <Form.Item name="contact" label="Contact">
            <Input placeholder="Contact" />
          </Form.Item>
          <Form.Item name="review_url" label="Review (URL)">
            <Input placeholder="https://..." type="url" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
          {/* Status is auto-set to Pending Submission; Date of Submission captured after submit */}
          <Form.Item name="report_due" label="Report Due">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">
              Create
            </Button>
          </div>
        </Form>
      </Modal>

      {/* helpers for CSV parsing */}
      {/* keep functions local to component scope */}
      <Modal
        title={selectedGrant ? selectedGrant.donor_name : "Application Details"}
        open={!!selectedGrant}
        onCancel={() => setSelectedGrant(null)}
        footer={null}
        destroyOnClose
      >
        {selectedGrant && (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <Typography.Text type="secondary">Donor Name</Typography.Text>
              <div>
                {selectedGrant.donor_name
                  ? toTitleCase(selectedGrant.donor_name)
                  : renderNull()}
              </div>
            </div>
            <div>
              <Typography.Text type="secondary">Date Opened</Typography.Text>
              <div>{displayOrNull(selectedGrant.date_opened)}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Date Due</Typography.Text>
              <div>{displayOrNull(selectedGrant.date_due)}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Program</Typography.Text>
              <div>
                {selectedGrant.program
                  ? toTitleCase(selectedGrant.program)
                  : renderNull()}
              </div>
            </div>
            <div>
              <Typography.Text type="secondary">Value</Typography.Text>
              <div>
                {typeof selectedGrant.value === "number"
                  ? new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(selectedGrant.value)
                  : renderNull()}
              </div>
            </div>
            <div>
              <Typography.Text type="secondary">Region</Typography.Text>
              <div>
                {selectedGrant.region
                  ? toTitleCase(selectedGrant.region)
                  : renderNull()}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="Add Disbursed Award"
        open={awardOpen}
        onCancel={() => setAwardOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={awardForm}
          layout="vertical"
          onFinish={async (values: {
            donor_name?: string;
            award_name?: string;
            amount?: number;
            date_disbursed?: any;
            notes?: string;
          }) => {
            if (!organizationId) return;
            try {
              const { error } = await supabase.from("disbursed_awards").insert({
                donor_name: values.donor_name ?? null,
                award_name: values.award_name ?? null,
                amount:
                  typeof values.amount === "number" ? values.amount : null,
                date_disbursed: values.date_disbursed
                  ? values.date_disbursed.format("YYYY-MM-DD")
                  : null,
                notes: values.notes ?? null,
                organization_id: organizationId,
                user_id: user?.id ?? null,
              });
              if (error) throw error;
              message.success("Award added");
              awardForm.resetFields();
              setAwardOpen(false);
              await loadAwards(organizationId);
            } catch {
              message.error("Failed to add award");
            }
          }}
          requiredMark={false}
        >
          <Form.Item name="donor_name" label="Donor Name">
            <Input placeholder="Donor Name" />
          </Form.Item>
          <Form.Item name="award_name" label="Award Name">
            <Input placeholder="Award Name" />
          </Form.Item>
          <Form.Item name="amount" label="Amount">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item name="date_disbursed" label="Date Disbursed">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={() => setAwardOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">
              Add
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Import Applications (CSV)"
        open={appImportOpen}
        onCancel={() => setAppImportOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          Upload a CSV with headers matching the grants import schema
          (donor_name, date_opened, date_due, program, value, region, contact,
          review_url, notes, date_submission, report_due, status). All imported
          rows will be queued.
        </Typography.Paragraph>
        <Dragger
          accept=".csv"
          multiple={false}
          showUploadList={false}
          beforeUpload={async (file) => {
            if (!organizationId) {
              message.error("No organization");
              return false;
            }
            try {
              const text = await file.text();
              const lines = text
                .split(/\r?\n/)
                .filter((l) => l.trim().length > 0);
              if (lines.length === 0) {
                message.error("CSV is empty");
                return false;
              }
              const [headerLine, ...dataLines] = lines;
              const headers = headerLine
                .replace(/^\uFEFF/, "")
                .split(",")
                .map((h) => h.trim().toLowerCase());
              const idx = (label: string) =>
                headers.indexOf(label.toLowerCase());
              const get = (cols: string[], i: number) =>
                i >= 0 ? (cols[i] ?? "").trim() : "";

              const iDonor = idx("donor_name");
              if (iDonor === -1) {
                message.error("Missing required header: donor_name");
                return false;
              }
              const iOpened = idx("date_opened");
              const iDue = idx("date_due");
              const iProgram = idx("program");
              const iValue = idx("value");
              const iRegion = idx("region");
              const iContact = idx("contact");
              const iUrl = idx("review_url");
              const iNotes = idx("notes");
              const iSub = idx("date_submission");
              const iReport = idx("report_due");
              const iStatus = idx("status");

              const toInsert: any[] = [];
              dataLines.forEach((line) => {
                const cols = splitCsvLine(line);
                const donor_name = get(cols, iDonor);
                if (!donor_name) return;
                const date_opened = normalizeDate(get(cols, iOpened));
                const date_due = normalizeDate(get(cols, iDue));
                const date_submission = normalizeDate(get(cols, iSub));
                const report_due = normalizeDate(get(cols, iReport));
                const valueParsed = parseCurrencyToNumber(get(cols, iValue));
                toInsert.push({
                  donor_name,
                  date_opened,
                  date_due,
                  program: get(cols, iProgram) || null,
                  value: valueParsed,
                  region: get(cols, iRegion) || null,
                  contact: get(cols, iContact) || null,
                  review_url: get(cols, iUrl) || null,
                  notes: get(cols, iNotes) || null,
                  date_submission,
                  report_due,
                  status: "Queued",
                });
              });
              if (toInsert.length === 0) {
                message.warning("No valid rows found in CSV");
                return false;
              }
              const { error } = await supabase.from("grants").insert(
                toInsert.map((r) => ({
                  ...r,
                  status: "Queued",
                  date_submission: null,
                  organization_id: organizationId,
                  user_id: user?.id ?? null,
                }))
              );
              if (error) throw error;
              message.success(`Imported ${toInsert.length} rows`);
              await loadGrantsWithNames(organizationId);
              setAppImportOpen(false);
            } catch (e: any) {
              const msg = e?.message || String(e);
              message.error(`Failed to import CSV: ${msg}`);
            }
            return false;
          }}
          style={{ padding: 12 }}
        >
          <p className="ant-upload-drag-icon">📄</p>
          <p className="ant-upload-text">Select from Local Computer</p>
          <p className="ant-upload-hint">or drag and drop a .csv file here</p>
        </Dragger>
      </Modal>

      <Modal
        title="Import Disbursed Awards (CSV)"
        open={awardImportOpen}
        onCancel={() => setAwardImportOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          Upload a CSV with headers like Donor Name, Award Name, Amount, Date
          Disbursed, Notes. Only these fields are imported.
        </Typography.Paragraph>
        <Dragger
          accept=".csv"
          multiple={false}
          showUploadList={false}
          beforeUpload={async (file) => {
            if (!organizationId) {
              message.error("No organization");
              return false;
            }
            try {
              const text = await file.text();
              const lines = text.split(/\r?\n/).filter(Boolean);
              if (lines.length === 0) {
                message.error("CSV is empty");
                return false;
              }
              const [headerLine, ...rowsLines] = lines;
              const headers = headerLine
                .split(",")
                .map((h) => h.trim().toLowerCase());
              const idx = (label: string) =>
                headers.findIndex((h) => h === label.toLowerCase());
              const get = (cols: string[], i: number) =>
                i >= 0 ? (cols[i] ?? "").trim() : "";
              const iDonor = idx("donor name");
              const iAward = idx("award name");
              const iAmt = idx("amount");
              const iDate = idx("date disbursed");
              const iNotes = idx("notes");
              const errors: string[] = [];
              const payloads: any[] = [];
              rowsLines.forEach((line, idxRow) => {
                const rowNum = idxRow + 2;
                const cols = line.split(",");
                const donor = get(cols, iDonor);
                const amtRaw = get(cols, iAmt);
                const dateRaw = get(cols, iDate);
                const amt = amtRaw ? Number(amtRaw.replace(/[$,]/g, "")) : null;
                const date = dateRaw ? dateRaw : null;
                if (!donor) errors.push(`Row ${rowNum}: Donor Name required`);
                if (amtRaw && Number.isNaN(amt))
                  errors.push(`Row ${rowNum}: Amount invalid`);
                if (errors.length === 0) {
                  payloads.push({
                    donor_name: donor || null,
                    award_name: get(cols, iAward) || null,
                    amount: typeof amt === "number" ? amt : null,
                    date_disbursed: date,
                    notes: get(cols, iNotes) || null,
                    organization_id: organizationId,
                    user_id: user?.id ?? null,
                  });
                }
              });
              if (errors.length > 0) {
                Modal.error({
                  title: "Import blocked",
                  content: errors
                    .slice(0, 50)
                    .map((e, i) => <div key={i}>{e}</div>),
                });
                return false;
              }
              if (payloads.length === 0) {
                message.warning("No valid rows found");
                return false;
              }
              const { error } = await supabase
                .from("disbursed_awards")
                .insert(payloads);
              if (error) throw error;
              await loadAwards(organizationId);
              message.success(`Imported ${payloads.length} rows`);
              setAwardImportOpen(false);
            } catch {
              message.error("Failed to import CSV");
            }
            return false;
          }}
          style={{ padding: 12 }}
        >
          <p className="ant-upload-drag-icon">📄</p>
          <p className="ant-upload-text">Select from Local Computer</p>
          <p className="ant-upload-hint">or drag and drop a .csv file here</p>
        </Dragger>
      </Modal>

      <Modal
        title="Edit Application"
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setEditingGrant(null);
          editForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={async (values: any) => {
            if (!organizationId || !editingGrant) return;
            try {
              const { error } = await supabase
                .from("grants")
                .update({
                  donor_name: values.donor_name,
                  date_opened: values.date_opened
                    ? values.date_opened.format("YYYY-MM-DD")
                    : null,
                  date_due: values.date_due
                    ? values.date_due.format("YYYY-MM-DD")
                    : null,
                  program: values.program ?? null,
                  value:
                    typeof values.value === "number" &&
                    !Number.isNaN(values.value)
                      ? values.value
                      : null,
                  region: values.region ?? null,
                  contact: values.contact ?? null,
                  review_url: values.review_url ?? null,
                  notes: values.notes ?? null,
                  report_due: values.report_due
                    ? values.report_due.format("YYYY-MM-DD")
                    : null,
                })
                .eq("id", editingGrant.id)
                .eq("organization_id", organizationId);
              if (error) throw error;
              message.success("Application updated");
              editForm.resetFields();
              setEditOpen(false);
              setEditingGrant(null);
              await loadGrantsWithNames(organizationId);
            } catch (e) {
              message.error("Failed to update application");
            }
          }}
          requiredMark={false}
        >
          <Form.Item
            name="donor_name"
            label="Donor Name"
            rules={[{ required: true }]}
          >
            <Input placeholder="Donor name" />
          </Form.Item>
          <Form.Item name="date_opened" label="Date Opened">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="date_due" label="Date Due">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="program" label="Program">
            <Input placeholder="Program" />
          </Form.Item>
          <Form.Item name="value" label="Value">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item name="region" label="Region">
            <Input placeholder="Region" />
          </Form.Item>
          <Form.Item name="contact" label="Contact">
            <Input placeholder="Contact" />
          </Form.Item>
          <Form.Item name="review_url" label="Review (URL)">
            <Input placeholder="https://..." type="url" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="report_due" label="Report Due">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button
              onClick={() => {
                setEditOpen(false);
                setEditingGrant(null);
                editForm.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              Update
            </Button>
          </div>
        </Form>
      </Modal>
    </Card>
  );
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function normalizeDate(s: string | null): string | null {
  if (!s) return null;
  const t = s.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(t)) return t.slice(0, 10);
  const m = t.match(/^(\d{1,2})[\/](\d{1,2})[\/](\d{2,4})$/);
  if (m) {
    let mm = Number(m[1]);
    let dd = Number(m[2]);
    let yy = Number(m[3]);
    if (yy < 100) yy = 2000 + yy;
    return `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(
      2,
      "0"
    )}`;
  }
  return null; // return null for non-date strings (e.g., region values like "Dedham")
}

function parseCurrencyToNumber(s: string | null): number | null {
  if (!s) return null;
  const t = s.replace(/[$,]/g, "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
