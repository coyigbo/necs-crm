import { useEffect, useMemo, useState } from "react";
import {
  Card,
  Typography,
  Table,
  Button,
  Upload,
  Modal,
  message,
  Spin,
  Alert,
  Form,
  Input,
  Dropdown,
} from "antd";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import { useOrg } from "../org/OrgProvider";
import { useAuth } from "../auth/AuthProvider";

type Row = {
  id?: string;
  donor_name: string;
  date_opened: string;
  date_due: string;
  program: string;
  value: string;
  region: string;
  contact: string;
  review_url: string;
  notes: string;
  date_submission: string;
  report_due: string;
  status: string;
};

export default function DonorTracker() {
  const [importOpen, setImportOpen] = useState(false);
  const { organizationId } = useOrg();
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);

  const loadRows = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from("donor_tracker")
        .select(
          "id,donor_name,date_opened,date_due,program,value,region,contact,review_url,notes,date_submission,report_due,status"
        )
        .eq("organization_id", orgId)
        .order("donor_name", { ascending: true });
      if (error) throw error;
      setRows(data as any[] as Row[]);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load donor tracker");
      setRows([]);
    }
  };

  useEffect(() => {
    if (!organizationId) {
      setRows([]);
      return;
    }
    loadRows(organizationId);
  }, [organizationId]);
  const onImportCsv = async (file: File) => {
    if (!organizationId) {
      message.error("No organization");
      return;
    }
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
      if (lines.length === 0) {
        message.error("CSV is empty");
        return;
      }
      const [headerLine, ...dataLines] = lines;
      const headers = splitCsvLine(headerLine).map((h) => h.trim());
      const idx = (label: string) =>
        headers.findIndex((h) => h.toLowerCase() === label.toLowerCase());

      const iDonor = idx("donor_name");
      const iOpened = idx("date_opened");
      const iDue = idx("date_due");
      const iProgram = idx("program");
      const iValue = idx("value");
      const iRegion = idx("region");
      const iContact = idx("contact");
      const iUrl = idx("review_url");
      const iNotes = idx("notes");
      const iSubmitted = idx("date_submission");
      const iReport = idx("report_due");
      const iStatus = idx("status");

      if (iDonor === -1) {
        message.error("Missing required header: donor_name");
        return;
      }

      const toInsert: any[] = [];
      const errors: string[] = [];
      dataLines.forEach((line, rowIdx) => {
        const rowNum = rowIdx + 2;
        const cols = splitCsvLine(line);
        const get = (i: number) => (i >= 0 ? (cols[i] ?? "").trim() : "");

        const donor = get(iDonor);
        if (!donor) {
          errors.push(`Row ${rowNum}: donor_name is required`);
          return;
        }

        const date_opened = normalizeDate(get(iOpened));
        const date_due = normalizeDate(get(iDue));
        const date_submission = normalizeDate(get(iSubmitted));
        const report_due = normalizeDate(get(iReport));

        toInsert.push({
          donor_name: donor,
          date_opened,
          date_due,
          program: get(iProgram) || null,
          value: get(iValue) || null,
          region: get(iRegion) || null,
          contact: get(iContact) || null,
          review_url: get(iUrl) || null,
          notes: get(iNotes) || null,
          date_submission,
          report_due,
          status: get(iStatus) || null,
        });
      });

      if (errors.length > 0) {
        Modal.error({
          title: "Import blocked - validation errors",
          width: 720,
          content: (
            <div>
              <Typography.Paragraph>
                {`Found ${errors.length} validation error(s). Fix these and try again.`}
              </Typography.Paragraph>
              <div style={{ maxHeight: 240, overflowY: "auto" }}>
                <ul style={{ paddingLeft: 16 }}>
                  {errors.slice(0, 50).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
                {errors.length > 50 && (
                  <Typography.Text type="secondary">
                    {`…and ${errors.length - 50} more`}
                  </Typography.Text>
                )}
              </div>
            </div>
          ),
        });
        return;
      }

      if (toInsert.length === 0) {
        message.warning("No valid rows found in CSV");
        return;
      }

      const { error } = await supabase.from("donor_tracker").insert(
        toInsert.map((r) => ({
          ...r,
          organization_id: organizationId,
          user_id: user?.id ?? null,
        }))
      );
      if (error) throw error;
      message.success(`Imported ${toInsert.length} rows`);
      setImportOpen(false);
      await loadRows(organizationId);
    } catch (e) {
      message.error("Failed to import CSV");
    }
  };
  const columns = useMemo(
    () => [
      { title: "Donor Name", dataIndex: "donor_name" },
      { title: "Program", dataIndex: "program" },
      { title: "Value", dataIndex: "value", width: 140 },
      { title: "Contact", dataIndex: "contact" },
      {
        title: "Review URL",
        dataIndex: "review_url",
        render: (url: string) =>
          url ? (
            <a href={url} target="_blank" rel="noreferrer">
              {url}
            </a>
          ) : (
            ""
          ),
      },
      { title: "Notes", dataIndex: "notes" },
      {
        title: "Actions",
        fixed: "right" as const,
        width: 120,
        render: (r: Row) => {
          const items = [
            { key: "edit", label: "Edit" },
            { key: "delete", label: "Delete", danger: true },
          ];
          return (
            <Dropdown
              menu={{
                items,
                onClick: async ({ key }) => {
                  if (key === "edit") {
                    setSelectedRow(r);
                    setEditOpen(true);
                    editForm.setFieldsValue({
                      donor_name: r.donor_name,
                      program: (r as any).program ?? "",
                      value: (r as any).value ?? "",
                      contact: (r as any).contact ?? "",
                      review_url: (r as any).review_url ?? "",
                      notes: (r as any).notes ?? "",
                    });
                  } else if (key === "delete") {
                    Modal.confirm({
                      title: "Delete record?",
                      content: `Are you sure you want to delete ${r.donor_name}?`,
                      okButtonProps: { danger: true },
                      onOk: async () => {
                        try {
                          const { error } = await supabase
                            .from("donor_tracker")
                            .delete()
                            .eq("id", (r as any).id);
                          if (error) throw error;
                          message.success("Record deleted");
                          if (organizationId) await loadRows(organizationId);
                        } catch (e) {
                          message.error("Failed to delete record");
                        }
                      },
                    });
                  }
                },
              }}
            >
              <Button type="primary" danger>
                Actions
              </Button>
            </Dropdown>
          );
        },
      },
    ],
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
          Donor Tracker
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          Track donors using the import schema.
        </Typography.Paragraph>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 12,
            gap: 8,
          }}
        >
          <Button onClick={() => setAddOpen(true)}>Add Record</Button>
          <Button type="primary" onClick={() => setImportOpen(true)}>
            Import Data as CSV
          </Button>
        </div>
        {error && (
          <Alert
            type="error"
            showIcon
            message="Failed to load donor tracker"
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
          <Table<Row>
            rowKey={(r) => (r.id as string) || r.donor_name}
            dataSource={rows}
            columns={columns as any}
            scroll={{ x: true }}
          />
        )}
        <ImportCsvModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImport={onImportCsv}
        />
        <Modal
          title="Edit Record"
          open={editOpen}
          onCancel={() => setEditOpen(false)}
          footer={null}
          destroyOnClose
        >
          <Form
            form={editForm}
            layout="vertical"
            onFinish={async (values: any) => {
              if (!selectedRow || !(selectedRow as any).id) return;
              try {
                const payload = {
                  donor_name: values.donor_name,
                  program: values.program || null,
                  value: values.value || null,
                  contact: values.contact || null,
                  review_url: values.review_url || null,
                  notes: values.notes || null,
                };
                const { error } = await supabase
                  .from("donor_tracker")
                  .update(payload)
                  .eq("id", (selectedRow as any).id);
                if (error) throw error;
                if (organizationId) await loadRows(organizationId);
                message.success("Record updated");
                setEditOpen(false);
              } catch (e) {
                message.error("Failed to update record");
              }
            }}
            requiredMark={false}
          >
            <Form.Item
              name="donor_name"
              label="Donor Name"
              rules={[{ required: true }]}
            >
              <Input placeholder="Donor Name" />
            </Form.Item>
            <Form.Item name="program" label="Program">
              <Input placeholder="Program" />
            </Form.Item>
            <Form.Item name="value" label="Value">
              <Input placeholder="Value" />
            </Form.Item>
            <Form.Item name="contact" label="Contact">
              <Input placeholder="Contact" />
            </Form.Item>
            <Form.Item name="review_url" label="Review URL">
              <Input placeholder="https://..." />
            </Form.Item>
            <Form.Item name="notes" label="Notes">
              <Input.TextArea placeholder="Notes" rows={3} />
            </Form.Item>
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
            >
              <Button onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                Save
              </Button>
            </div>
          </Form>
        </Modal>
        <Modal
          title="Add Record"
          open={addOpen}
          onCancel={() => setAddOpen(false)}
          footer={null}
          destroyOnClose
        >
          <Form
            form={addForm}
            layout="vertical"
            onFinish={async (values: any) => {
              if (!organizationId) {
                message.error("No organization");
                return;
              }
              try {
                const payload = {
                  donor_name: values.donor_name,
                  program: values.program || null,
                  value: values.value || null,
                  region: values.region || null,
                  contact: values.contact || null,
                  review_url: values.review_url || null,
                  notes: values.notes || null,
                  organization_id: organizationId,
                  user_id: user?.id ?? null,
                };
                const { error } = await supabase
                  .from("donor_tracker")
                  .insert(payload);
                if (error) throw error;
                await loadRows(organizationId);
                message.success("Record added");
                setAddOpen(false);
                addForm.resetFields();
              } catch (e) {
                message.error("Failed to add record");
              }
            }}
            requiredMark={false}
          >
            <Form.Item
              name="donor_name"
              label="Donor Name"
              rules={[{ required: true }]}
            >
              <Input placeholder="Donor Name" />
            </Form.Item>
            <Form.Item name="program" label="Program">
              <Input placeholder="Program" />
            </Form.Item>
            <Form.Item name="value" label="Value">
              <Input placeholder="Value" />
            </Form.Item>
            <Form.Item name="region" label="Region">
              <Input placeholder="Region" />
            </Form.Item>
            <Form.Item name="contact" label="Contact">
              <Input placeholder="Contact" />
            </Form.Item>
            <Form.Item name="review_url" label="Review URL">
              <Input placeholder="https://..." />
            </Form.Item>
            <Form.Item name="notes" label="Notes">
              <Input.TextArea placeholder="Notes" rows={3} />
            </Form.Item>
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
            >
              <Button onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                Add
              </Button>
            </div>
          </Form>
        </Modal>
      </motion.div>
    </Card>
  );
}

function ImportCsvModal({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (file: File) => void;
}) {
  const { Dragger } = Upload;
  return (
    <Modal
      title="Import Donor Tracker CSV"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        Upload a CSV file with headers matching the Donor Tracker schema.
      </Typography.Paragraph>
      <Dragger
        accept=".csv"
        multiple={false}
        showUploadList={false}
        beforeUpload={(file) => {
          onImport(file as File);
          return false;
        }}
        style={{ padding: 12 }}
      >
        <p className="ant-upload-drag-icon">📄</p>
        <p className="ant-upload-text">Select from Local Computer</p>
        <p className="ant-upload-hint">or drag and drop a .csv file here</p>
      </Dragger>
    </Modal>
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

function normalizeDate(s: string): string | null {
  if (!s) return null;
  const t = s.trim();
  if (!t) return null;
  // Try common formats
  const m1 = t.match(/^\d{4}-\d{2}-\d{2}$/);
  if (m1) return t;
  const m2 = t.match(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/);
  if (m2) return t.slice(0, 10);
  const md = t.match(/^(\d{1,2})[\/](\d{1,2})[\/](\d{2,4})$/);
  if (md) {
    let m = Number(md[1]);
    let d = Number(md[2]);
    let y = Number(md[3]);
    if (y < 100) y = 2000 + y;
    const mm = String(m).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }
  return null;
}
