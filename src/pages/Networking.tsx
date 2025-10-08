import {
  Card,
  Typography,
  Table,
  Alert,
  Spin,
  Button,
  Modal,
  Upload,
  Dropdown,
  message,
  Form,
  Input,
  Flex,
} from "antd";
import { motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import { useOrg } from "../org/OrgProvider";
import { useAuth } from "../auth/AuthProvider";
import { DownOutlined } from "@ant-design/icons";

type Contact = {
  id: string;
  name: string;
  organization?: string;
  title?: string;
  email?: string;
  phone?: string;
  donor?: string;
  award_ceremony?: string;
  status?: string;
  created_at?: string;
};

export default function Networking() {
  const [rows, setRows] = useState<Contact[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const { organizationId } = useOrg();
  const { user } = useAuth();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();

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

  const loadRows = async (orgId: string) => {
    const { data, error } = await supabase
      .from("networking_contacts")
      .select(
        "id,name,organization,title,email,phone,donor,award_ceremony,status,created_at"
      )
      .eq("organization_id", orgId)
      .order("name", { ascending: true });
    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      setRows((data as Contact[]) ?? []);
      setError(null);
    }
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!organizationId) {
        setRows([]);
        return;
      }
      if (!isMounted) return;
      await loadRows(organizationId);
    })();
    return () => {
      isMounted = false;
    };
  }, [organizationId]);

  const onImportCsv = async (file: File) => {
    if (!organizationId) {
      messageApi.error("No organization");
      return false;
    }
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        messageApi.error("CSV is empty");
        return false;
      }
      const [headerLine, ...dataLines] = lines;
      const headers = splitCsvLine(headerLine).map((h) =>
        h.replace(/^\uFEFF/, "").trim()
      );
      const normalize = (s: string) => s.toLowerCase().replace(/[\s-]+/g, "_");
      const normalizedHeaders = headers.map(normalize);
      const idx = (label: string) =>
        normalizedHeaders.indexOf(normalize(label));
      const iName = idx("name");
      const iOrg = idx("organization");
      const iTitle = idx("title");
      const iEmail = idx("email");
      const iPhone = idx("phone");
      const iDonor = idx("donor");
      const iCeremony = idx("award_ceremony");
      if (iName === -1) {
        messageApi.error("Missing required header: name");
        return false;
      }
      const toInsert: any[] = [];
      dataLines.forEach((line) => {
        const cols = splitCsvLine(line);
        const get = (i: number) => (i >= 0 ? (cols[i] ?? "").trim() : "");
        const name = get(iName);
        if (!name) return;
        toInsert.push({
          name,
          organization: get(iOrg) || null,
          title: get(iTitle) || null,
          email: get(iEmail) || null,
          phone: get(iPhone) || null,
          donor: get(iDonor) || null,
          award_ceremony: get(iCeremony) || null,
        });
      });
      if (toInsert.length === 0) {
        messageApi.warning("No valid rows found in CSV");
        return false;
      }
      const { error } = await supabase.from("networking_contacts").insert(
        toInsert.map((r) => ({
          ...r,
          organization_id: organizationId,
          user_id: user?.id ?? null,
        }))
      );
      if (error) throw error;
      messageApi.success(`Imported ${toInsert.length} rows`);
      setImportOpen(false);
      await loadRows(organizationId);
      return false;
    } catch (e: any) {
      const msg = e?.message || String(e);
      messageApi.error(`Failed to import CSV: ${msg}`);
      return false;
    }
  };

  return (
    <Card bordered={false}>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          Networking
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          Contacts, partnerships, and outreach.
        </Typography.Paragraph>
        {messageContextHolder}
        {modalContextHolder}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Button onClick={() => setAddOpen(true)}>Add Record</Button>
          <Button type="primary" danger onClick={() => setImportOpen(true)}>
            Import Data as CSV
          </Button>
        </div>
        {error && (
          <Alert
            type="error"
            showIcon
            message="Failed to load contacts"
            description={error}
            style={{ marginBottom: 12 }}
          />
        )}
        <Modal
          title="Import Networking Contacts"
          open={importOpen}
          onCancel={() => setImportOpen(false)}
          footer={null}
          destroyOnClose
        >
          <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
            Upload a CSV with the correct headers.
          </Typography.Paragraph>
          <Upload.Dragger
            accept=".csv"
            multiple={false}
            showUploadList={false}
            beforeUpload={(file) => onImportCsv(file as File)}
            style={{ padding: 12 }}
          >
            <p className="ant-upload-drag-icon">📄</p>
            <p className="ant-upload-text">Select from Local Computer</p>
            <p className="ant-upload-hint">or drag and drop a .csv file here</p>
          </Upload.Dragger>
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
                messageApi.error("No organization");
                return;
              }
              try {
                const payload = {
                  name: values.name,
                  organization: values.organization || null,
                  title: values.title || null,
                  email: values.email || null,
                  phone: values.phone || null,
                  donor: values.donor || null,
                  award_ceremony: values.award_ceremony || null,
                  organization_id: organizationId,
                  user_id: user?.id ?? null,
                };
                const { error } = await supabase
                  .from("networking_contacts")
                  .insert(payload);
                if (error) throw error;
                await loadRows(organizationId);
                messageApi.success("Record added");
                setAddOpen(false);
                addForm.resetFields();
              } catch (e) {
                messageApi.error("Failed to add record");
              }
            }}
            requiredMark={false}
          >
            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
              <Input placeholder="Name" />
            </Form.Item>
            <Form.Item name="organization" label="Organization">
              <Input placeholder="Organization" />
            </Form.Item>
            <Form.Item name="title" label="Title">
              <Input placeholder="Title" />
            </Form.Item>
            <Form.Item name="email" label="Email">
              <Input placeholder="Email" />
            </Form.Item>
            <Form.Item name="phone" label="Phone">
              <Input placeholder="Phone" />
            </Form.Item>
            <Form.Item name="donor" label="Donor">
              <Input placeholder="Y/N/Yes/No" />
            </Form.Item>
            <Form.Item name="award_ceremony" label="Award Ceremony">
              <Input placeholder="Inv/Yes/No" />
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
              if (!selected) return;
              try {
                const payload = {
                  name: values.name,
                  organization: values.organization || null,
                  title: values.title || null,
                  email: values.email || null,
                  phone: values.phone || null,
                  donor: values.donor || null,
                  award_ceremony: values.award_ceremony || null,
                };
                const { error } = await supabase
                  .from("networking_contacts")
                  .update(payload)
                  .eq("id", selected.id);
                if (error) throw error;
                if (organizationId) await loadRows(organizationId);
                messageApi.success("Record updated");
                setEditOpen(false);
              } catch (e) {
                messageApi.error("Failed to update record");
              }
            }}
            requiredMark={false}
          >
            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
              <Input placeholder="Name" />
            </Form.Item>
            <Form.Item name="organization" label="Organization">
              <Input placeholder="Organization" />
            </Form.Item>
            <Form.Item name="title" label="Title">
              <Input placeholder="Title" />
            </Form.Item>
            <Form.Item name="email" label="Email">
              <Input placeholder="Email" />
            </Form.Item>
            <Form.Item name="phone" label="Phone">
              <Input placeholder="Phone" />
            </Form.Item>
            <Form.Item name="donor" label="Donor">
              <Input placeholder="Y/N/Yes/No" />
            </Form.Item>
            <Form.Item name="award_ceremony" label="Award Ceremony">
              <Input placeholder="Inv/Yes/No" />
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
          title={selected ? selected.name : "Contact Details"}
          open={!!selected}
          onCancel={() => setSelected(null)}
          footer={null}
          destroyOnClose
        >
          {selected && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <Typography.Text type="secondary">Name</Typography.Text>
                <div>{selected.name}</div>
              </div>
              <div>
                <Typography.Text type="secondary">Organization</Typography.Text>
                <div>
                  {selected.organization
                    ? toTitleCase(selected.organization)
                    : renderNull()}
                </div>
              </div>
              <div>
                <Typography.Text type="secondary">Title</Typography.Text>
                <div>{displayOrNull(selected.title)}</div>
              </div>
              <div>
                <Typography.Text type="secondary">Email</Typography.Text>
                <div>{displayOrNull(selected.email)}</div>
              </div>
              <div>
                <Typography.Text type="secondary">Phone</Typography.Text>
                <div>{displayOrNull(selected.phone)}</div>
              </div>
              <div>
                <Typography.Text type="secondary">Donor</Typography.Text>
                <div>{displayOrNull(selected.donor)}</div>
              </div>
              <div>
                <Typography.Text type="secondary">
                  Award Ceremony
                </Typography.Text>
                <div>{displayOrNull(selected.award_ceremony)}</div>
              </div>
              <div>
                <Typography.Text type="secondary">Status</Typography.Text>
                <div>{displayOrNull(selected.status)}</div>
              </div>
              <div>
                <Typography.Text type="secondary">Created At</Typography.Text>
                <div>
                  {selected.created_at
                    ? new Date(selected.created_at).toLocaleDateString()
                    : renderNull()}
                </div>
              </div>
            </div>
          )}
        </Modal>

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
            <Table
              rowKey={(r) => r.id}
              dataSource={rows}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: false,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} items`,
              }}
              scroll={undefined}
              tableLayout="fixed"
              style={{ width: "100%" }}
              columns={[
                {
                  title: "Name",
                  dataIndex: "name",
                  ellipsis: true,
                  align: "center",
                  onHeaderCell: () => ({ style: headerCellStyle }),
                  render: (value: string | null) =>
                    value ? toTitleCase(String(value)) : renderNull(),
                },
                {
                  title: "Organization",
                  dataIndex: "organization",
                  ellipsis: true,
                  align: "center",
                  onHeaderCell: () => ({ style: headerCellStyle }),
                  render: (value: string | null) =>
                    value ? toTitleCase(String(value)) : renderNull(),
                },
                {
                  title: "Title",
                  dataIndex: "title",
                  ellipsis: true,
                  align: "center",
                  onHeaderCell: () => ({ style: headerCellStyle }),
                  render: (value: string | null) =>
                    value ? toTitleCase(String(value)) : renderNull(),
                },
                {
                  title: "Email",
                  dataIndex: "email",
                  ellipsis: true,
                  align: "center",
                  onHeaderCell: () => ({ style: headerCellStyle }),
                  render: (value: string | null) =>
                    value ? String(value).toLowerCase() : renderNull(),
                },
                {
                  title: "Phone",
                  dataIndex: "phone",
                  ellipsis: true,
                  width: 120,
                  align: "center",
                  onHeaderCell: () => ({ style: headerCellStyle }),
                  render: (value: string | null) => displayOrNull(value),
                },
                {
                  title: "Donor",
                  dataIndex: "donor",
                  width: 80,
                  align: "center",
                  onHeaderCell: () => ({ style: headerCellStyle }),
                  render: (value: string | null) => displayOrNull(value),
                },
                {
                  title: "Award Ceremony",
                  dataIndex: "award_ceremony",
                  width: 120,
                  align: "center",
                  onHeaderCell: () => ({ style: headerCellStyle }),
                  render: (value: string | null) => displayOrNull(value),
                },
                {
                  title: "Actions",
                  width: 120,
                  onHeaderCell: () => ({ style: headerCellStyle }),
                  render: (_, record) => {
                    const items = [
                      { key: "view", label: "View Details" },
                      { key: "edit", label: "Edit" },
                      { key: "delete", label: "Delete", danger: true },
                    ];
                    return (
                      <Dropdown
                        menu={{
                          items,
                          onClick: async ({ key }) => {
                            if (key === "view") {
                              setSelected(record);
                            } else if (key === "edit") {
                              setSelected(record);
                              setEditOpen(true);
                              editForm.setFieldsValue({
                                name: record.name,
                                organization: record.organization ?? "",
                                title: record.title ?? "",
                                email: record.email ?? "",
                                phone: record.phone ?? "",
                                donor: record.donor ?? "",
                                award_ceremony: record.award_ceremony ?? "",
                              });
                            } else if (key === "delete") {
                              modal.confirm({
                                title: "Delete record?",
                                content: `Are you sure you want to delete ${record.name}?`,
                                okButtonProps: { danger: true },
                                onOk: async () => {
                                  try {
                                    const { error } = await supabase
                                      .from("networking_contacts")
                                      .delete()
                                      .eq("id", record.id);
                                    if (error) throw error;
                                    messageApi.success("Record deleted");
                                    if (organizationId)
                                      await loadRows(organizationId);
                                  } catch (e) {
                                    messageApi.error("Failed to delete record");
                                  }
                                },
                              });
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
                },
              ]}
              onRow={(record) => ({
                onClick: () => setSelected(record),
                style: { cursor: "pointer" },
              })}
            />
          </motion.div>
        )}
      </motion.div>
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
