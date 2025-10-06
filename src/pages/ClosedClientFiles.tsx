import {
  Alert,
  Button,
  Card,
  Flex,
  Segmented,
  Spin,
  Table,
  Typography,
  Upload,
  message,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
} from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { motion } from "framer-motion";
import { useOrg } from "../org/OrgProvider";
import dayjs from "dayjs";

const { Dragger } = Upload;

// Schema row
type ClosedFileRow = {
  id: string;
  client_name: string;
  life_coach: string | null;
  start_date: string | null; // YYYY-MM-DD
  end_date: string | null;
  area_office: string | null;
  race_eth: string | null;
  sex: string | null;
  case_code: string | null;
  age: number | null;
  hometown: string | null;
  model: string | null;
  notes: string | null;
  year: number;
};

type AddFormValues = {
  client_name: string;
  life_coach?: string;
  start_date?: any;
  end_date?: any;
  area_office?: string;
  race_eth?: string;
  sex?: string;
  case_code?: string;
  age?: number;
  hometown?: string;
  model?: string;
  notes?: string;
  year: number;
};

const FIXED_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

export default function ClosedClientFiles() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<ClosedFileRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm<AddFormValues>();
  const [importYear, setImportYear] = useState<number | undefined>(undefined);
  const { organizationId } = useOrg();

  const years = useMemo(() => FIXED_YEARS, []);
  const defaultYear = years[0];
  const selectedYear = Number(params.get("year") ?? defaultYear);

  const countsByYear = useMemo(() => {
    const map = new Map<number, number>();
    (rows ?? []).forEach((r) => map.set(r.year, (map.get(r.year) ?? 0) + 1));
    years.forEach((y) => void (!map.has(y) && map.set(y, 0)));
    return map;
  }, [rows, years]);

  const yearIndex = Math.max(0, years.indexOf(selectedYear));
  const canPrev = yearIndex < years.length - 1;
  const canNext = yearIndex > 0;

  const setYear = (yr: number) => {
    const next = new URLSearchParams(params);
    next.set("year", String(yr));
    setParams(next, { replace: true });
  };

  const onPrev = () => {
    if (!canPrev) return;
    setYear(years[yearIndex + 1]);
  };

  const onNext = () => {
    if (!canNext) return;
    setYear(years[yearIndex - 1]);
  };

  const loadRows = async (orgId: string) => {
    const { data, error } = await supabase
      .from("closed_client_files")
      .select(
        "id,client_name,life_coach,start_date,end_date,area_office,race_eth,sex,case_code,age,hometown,model,notes,year"
      )
      .eq("organization_id", orgId)
      .in("year", FIXED_YEARS)
      .order("client_name", { ascending: true });
    if (error) throw error;
    return (data as ClosedFileRow[]) ?? [];
  };

  const refresh = async () => {
    if (!organizationId) {
      setRows([]);
      return;
    }
    try {
      const list = await loadRows(organizationId);
      setRows(list);
    } catch (e: any) {
      setError(e.message);
      setRows([]);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!organizationId) {
        setRows([]);
        return;
      }
      try {
        const list = await loadRows(organizationId);
        if (!isMounted) return;
        setRows(list);
      } catch (e: any) {
        if (!isMounted) return;
        setError(e.message);
        setRows([]);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [organizationId]);

  const normalizeDate = (s: string | undefined | null) => {
    if (!s) return null;
    const d = dayjs(s);
    return d.isValid() ? d.format("YYYY-MM-DD") : null;
  };

  const parseCsv = async (file: File) => {
    if (!organizationId) {
      message.error("No organization");
      return;
    }
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length === 0) {
        message.error("CSV is empty");
        return;
      }
      const [headerLine, ...dataLines] = lines;
      const headers = headerLine.split(",").map((h) => h.trim());
      const idx = (label: string) =>
        headers.findIndex((h) => h.toLowerCase() === label.toLowerCase());
      const get = (cols: string[], idxNum: number) =>
        idxNum >= 0 ? (cols[idxNum] ?? "").trim() : "";

      const iClient = idx("Client Name");
      const iCoach = idx("Life Coach");
      const iStart = idx("Start Date");
      const iEnd = idx("End Date");
      const iOffice = idx("Area Office");
      const iRace = idx("Race/Eth");
      const iSex = idx("Sex");
      const iCase = idx("Case"); // header appears as "Case " sometimes
      const iCaseAlt =
        iCase === -1
          ? headers.findIndex((h) => h.trim().toLowerCase() === "case")
          : iCase;
      const iAge = idx("Age");
      const iTown = idx("HOMETOWN");
      const iModel = idx("Model");
      const iNotes = idx("Notes");
      const iYear = idx("Year");

      // Determine year override
      let yearForAll = importYear;
      if (!yearForAll) {
        // Try from header/rows
        // If there's a Year column and first row has a number, we won't override per-row
        yearForAll = undefined;
        if (iYear === -1) {
          // Try infer from filename
          const m = file.name.match(/20\d{2}/);
          if (m) yearForAll = Number(m[0]);
        }
      }

      const toInsert: Omit<ClosedFileRow, "id">[] = [] as any;
      for (const line of dataLines) {
        const cols = line.split(",");
        const client = get(cols, iClient);
        if (!client) continue;
        const rowYear = iYear >= 0 ? Number(get(cols, iYear)) : undefined;
        const finalYear = (yearForAll ?? rowYear) as number | undefined;
        if (!finalYear || Number.isNaN(finalYear)) {
          // Schema requires year, skip row if not resolvable
          continue;
        }
        toInsert.push({
          client_name: client,
          life_coach: get(cols, iCoach) || null,
          start_date: normalizeDate(get(cols, iStart)),
          end_date: normalizeDate(get(cols, iEnd)),
          area_office: get(cols, iOffice) || null,
          race_eth: get(cols, iRace) || null,
          sex: get(cols, iSex) || null,
          case_code: get(cols, iCaseAlt) || null,
          age: (() => {
            const n = Number(get(cols, iAge));
            return Number.isNaN(n) ? null : n;
          })(),
          hometown: get(cols, iTown) || null,
          model: get(cols, iModel) || null,
          notes: get(cols, iNotes) || null,
          year: finalYear,
        } as Omit<ClosedFileRow, "id">);
      }

      if (toInsert.length === 0) {
        message.warning("No valid rows found in CSV");
        return;
      }

      const { error } = await supabase
        .from("closed_client_files")
        .insert(
          toInsert.map((r) => ({ ...r, organization_id: organizationId }))
        );
      if (error) throw error;
      await refresh();
      message.success(`Imported ${toInsert.length} rows`);
      setImportOpen(false);
      setImportYear(undefined);
    } catch (e) {
      message.error("Failed to import CSV");
    }
  };

  const onAddRecord = async (values: AddFormValues) => {
    if (!organizationId) {
      message.error("No organization");
      return;
    }
    try {
      const payload = {
        client_name: values.client_name,
        life_coach: values.life_coach ?? null,
        start_date: values.start_date
          ? values.start_date.format("YYYY-MM-DD")
          : null,
        end_date: values.end_date ? values.end_date.format("YYYY-MM-DD") : null,
        area_office: values.area_office ?? null,
        race_eth: values.race_eth ?? null,
        sex: values.sex ?? null,
        case_code: values.case_code ?? null,
        age: typeof values.age === "number" ? values.age : null,
        hometown: values.hometown ?? null,
        model: values.model ?? null,
        notes: values.notes ?? null,
        year: values.year,
        organization_id: organizationId,
      };
      const { error } = await supabase
        .from("closed_client_files")
        .insert(payload);
      if (error) throw error;
      await refresh();
      message.success("Record added");
      setAddOpen(false);
      addForm.resetFields();
    } catch (e) {
      message.error("Failed to add record");
    }
  };

  const dataForYear = useMemo(
    () => (rows ?? []).filter((r) => r.year === selectedYear),
    [rows, selectedYear]
  );

  return (
    <Card bordered={false}>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Closed Client Files
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        Organized by year
      </Typography.Paragraph>

      <Flex align="center" gap={8} style={{ marginBottom: 16 }}>
        <Button icon={<LeftOutlined />} onClick={onPrev} disabled={!canPrev} />
        <Segmented
          value={selectedYear}
          onChange={(v) => setYear(Number(v))}
          options={years.map((y) => ({
            value: y,
            label: (
              <span>
                {`FY${y}`}{" "}
                <Typography.Text type="secondary">
                  ({countsByYear.get(y) ?? 0})
                </Typography.Text>
              </span>
            ),
          }))}
          style={{ maxWidth: "100%", overflowX: "auto" }}
        />
        <Button icon={<RightOutlined />} onClick={onNext} disabled={!canNext} />
        <div style={{ marginLeft: "auto" }} />
        <Button onClick={() => setAddOpen(true)}>Add Record</Button>
        <Button type="primary" danger onClick={() => setImportOpen(true)}>
          Import Data as CSV
        </Button>
      </Flex>

      <Modal
        title="Import Closed Client Files"
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          Upload a CSV with the correct headers. Optionally set a year to apply
          to all rows.
        </Typography.Paragraph>
        <div style={{ marginBottom: 12 }}>
          <InputNumber
            style={{ width: 200 }}
            min={2000}
            max={2100}
            placeholder={selectedYear}
            value={importYear}
            onChange={(v) =>
              setImportYear(typeof v === "number" ? v : undefined)
            }
          />
        </div>
        <Dragger
          accept=".csv"
          multiple={false}
          showUploadList={false}
          beforeUpload={(file) => {
            parseCsv(file);
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
        title="Add Record"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={addForm}
          layout="vertical"
          onFinish={onAddRecord}
          requiredMark={false}
        >
          <Form.Item
            name="client_name"
            label="Client Name"
            rules={[{ required: true }]}
          >
            <Input placeholder="Client Name" />
          </Form.Item>
          <Form.Item name="life_coach" label="Life Coach">
            <Input placeholder="Life Coach" />
          </Form.Item>
          <Form.Item name="start_date" label="Start Date">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="end_date" label="End Date">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="area_office" label="Area Office">
            <Input placeholder="Area Office" />
          </Form.Item>
          <Form.Item name="race_eth" label="Race/Eth">
            <Input placeholder="Race/Eth" />
          </Form.Item>
          <Form.Item name="sex" label="Sex">
            <Input placeholder="Sex" />
          </Form.Item>
          <Form.Item name="case_code" label="Case Code">
            <Input placeholder="Case" />
          </Form.Item>
          <Form.Item name="age" label="Age">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item name="hometown" label="Hometown">
            <Input placeholder="Hometown" />
          </Form.Item>
          <Form.Item name="model" label="Model">
            <Input placeholder="Model" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea placeholder="Notes" rows={3} />
          </Form.Item>
          <Form.Item
            name="year"
            label="Year"
            rules={[{ required: true, type: "number" }]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={2000}
              max={2100}
              placeholder={selectedYear}
            />
          </Form.Item>
          <Flex gap={8} justify="flex-end">
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">
              Add
            </Button>
          </Flex>
        </Form>
      </Modal>

      {error && (
        <Alert
          type="error"
          showIcon
          message="Failed to load files"
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
          <Table
            rowKey={(r) => r.id}
            dataSource={dataForYear}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1000 }}
            columns={[
              {
                title: "Client Name",
                dataIndex: "client_name",
                fixed: "left" as const,
              },
              { title: "Life Coach", dataIndex: "life_coach" },
              { title: "Start Date", dataIndex: "start_date" },
              { title: "End Date", dataIndex: "end_date" },
              { title: "Area Office", dataIndex: "area_office" },
              { title: "Race/Eth", dataIndex: "race_eth" },
              { title: "Sex", dataIndex: "sex" },
              { title: "Case", dataIndex: "case_code" },
              { title: "Age", dataIndex: "age", width: 80 },
              { title: "Hometown", dataIndex: "hometown" },
              { title: "Model", dataIndex: "model" },
              { title: "Notes", dataIndex: "notes" },
              { title: "Year", dataIndex: "year", width: 100 },
            ]}
          />
        </motion.div>
      )}
    </Card>
  );
}
