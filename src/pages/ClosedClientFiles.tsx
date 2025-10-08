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
  Dropdown,
  Tabs,
} from "antd";
import { LeftOutlined, RightOutlined, DownOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { motion } from "framer-motion";
import { useOrg } from "../org/OrgProvider";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

dayjs.extend(customParseFormat);

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

// Chart data processing functions
const processChartData = (data: ClosedFileRow[]) => {
  // Age distribution
  const ageGroups = data.reduce((acc, row) => {
    if (!row.age) return acc;
    let group = "";
    if (row.age <= 18) group = "0-18";
    else if (row.age <= 25) group = "19-25";
    else if (row.age <= 35) group = "26-35";
    else if (row.age <= 50) group = "36-50";
    else if (row.age <= 65) group = "51-65";
    else group = "65+";

    acc[group] = (acc[group] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const ageData = Object.entries(ageGroups).map(([age, count]) => ({
    age,
    count,
  }));

  // Race/Ethnicity distribution
  const raceData = data.reduce((acc, row) => {
    const race = row.race_eth || "Unknown";
    acc[race] = (acc[race] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const raceChartData = Object.entries(raceData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([race, count]) => ({ name: race, value: count }));

  // Sex distribution
  const sexData = data.reduce((acc, row) => {
    const sex = row.sex || "Unknown";
    acc[sex] = (acc[sex] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sexChartData = Object.entries(sexData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([sex, count]) => ({ name: sex, value: count }));

  // Area Office distribution
  const areaData = data.reduce((acc, row) => {
    const area = row.area_office || "Unknown";
    acc[area] = (acc[area] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const areaChartData = Object.entries(areaData)
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 areas

  // Life Coach distribution
  const coachData = data.reduce((acc, row) => {
    const coach = row.life_coach || "Unknown";
    acc[coach] = (acc[coach] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const coachChartData = Object.entries(coachData)
    .map(([coach, count]) => ({ coach, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 coaches

  // Hometowns (top 10)
  const hometownData = data.reduce((acc, row) => {
    const town = row.hometown || "Unknown";
    acc[town] = (acc[town] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const hometownChartData = Object.entries(hometownData)
    .map(([hometown, count]) => ({ hometown, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // KPI metrics
  const ages = data
    .map((r) => r.age)
    .filter((a): a is number => typeof a === "number" && Number.isFinite(a))
    .sort((a, b) => a - b);
  const avgAge = ages.length
    ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length)
    : null;
  const medianAge = ages.length
    ? ages.length % 2 === 1
      ? ages[(ages.length - 1) / 2]
      : Math.round((ages[ages.length / 2 - 1] + ages[ages.length / 2]) / 2)
    : null;
  const uniqueCoaches = Object.keys(coachData).length;
  const uniqueAreas = Object.keys(areaData).length;

  return {
    ageData,
    raceChartData,
    sexChartData,
    areaChartData,
    coachChartData,
    hometownChartData,
    avgAge,
    medianAge,
    uniqueCoaches,
    uniqueAreas,
  };
};

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7c7c",
  "#8dd1e1",
  "#d084d0",
];

export default function ClosedClientFiles() {
  const [params, setParams] = useSearchParams();
  const activeTab = params.get("tab") || "data";
  const [rows, setRows] = useState<ClosedFileRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm<AddFormValues>();
  const [importYear, setImportYear] = useState<number | undefined>(undefined);
  const { organizationId } = useOrg();
  const [selectedRow, setSelectedRow] = useState<ClosedFileRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm<AddFormValues>();
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  const exportCsv = () => {
    const rowsToExport = dataForYear;
    if (!rowsToExport || rowsToExport.length === 0) {
      message.info("No rows to export for selected year");
      return;
    }
    const headers = [
      "Client Name",
      "Life Coach",
      "Start Date",
      "End Date",
      "Area Office",
      "Race/Eth",
      "Sex",
      "Case",
      "Age",
      "HOMETOWN",
      "Model",
      "Notes",
      "Year",
    ];
    const esc = (s: any) => {
      if (s === null || s === undefined) return "";
      const str = String(s);
      if (/[",\n]/.test(str)) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };
    const lines = [headers.join(",")];
    rowsToExport.forEach((r) => {
      lines.push(
        [
          esc(r.client_name),
          esc(r.life_coach),
          esc(r.start_date),
          esc(r.end_date),
          esc(r.area_office),
          esc(r.race_eth),
          esc(r.sex),
          esc(r.case_code),
          esc(r.age),
          esc(r.hometown),
          esc(r.model),
          esc(r.notes),
          esc(r.year),
        ].join(",")
      );
    });
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `closed_client_files_FY${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
    // Fetch ALL records by paginating through results
    let allData: ClosedFileRow[] = [];
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("closed_client_files")
        .select(
          "id,client_name,life_coach,start_date,end_date,area_office,race_eth,sex,case_code,age,hometown,model,notes,year"
        )
        .eq("organization_id", orgId)
        .in("year", FIXED_YEARS)
        .order("client_name", { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allData = [...allData, ...(data as ClosedFileRow[])];
        hasMore = data.length === pageSize; // Continue if we got a full page
        page++;
      } else {
        hasMore = false;
      }
    }

    return allData;
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

  // Reset pagination when switching years
  useEffect(() => {
    setPage(1);
  }, [selectedYear]);

  const normalizeDate = (s: string | undefined | null) => {
    if (!s) return null;
    const formats = [
      "YYYY-MM-DD",
      "M/D/YYYY",
      "MM/DD/YYYY",
      "M/D/YY",
      "MM/DD/YY",
    ];
    const d = dayjs(s, formats, true);
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

      // Required headers/inputs validation
      if (iClient === -1) {
        message.error("Missing required header: Client Name");
        return;
      }
      if (iYear === -1 && !yearForAll) {
        message.error(
          "Provide a Year: add a Year column, set a year in the modal, or include a 4-digit year in the filename"
        );
        return;
      }
      if (typeof yearForAll === "number") {
        if (
          Number.isNaN(yearForAll) ||
          yearForAll < 2000 ||
          yearForAll > 2100
        ) {
          message.error("Year must be between 2000 and 2100");
          return;
        }
      }

      const toInsert: Omit<ClosedFileRow, "id">[] = [] as any;
      const errors: string[] = [];
      dataLines.forEach((line, idxRow) => {
        const rowNumber = idxRow + 2; // account for header line
        const cols = line.split(",");
        let hasRowError = false;

        const client = get(cols, iClient);
        if (!client) {
          errors.push(`Row ${rowNumber}: Client Name is required`);
          hasRowError = true;
        }

        const rowYearRaw = iYear >= 0 ? get(cols, iYear) : "";
        const rowYearNum = rowYearRaw ? Number(rowYearRaw) : undefined;
        const finalYear = (yearForAll ?? rowYearNum) as number | undefined;
        if (!finalYear || Number.isNaN(finalYear)) {
          errors.push(`Row ${rowNumber}: Year is missing or not a number`);
          hasRowError = true;
        } else if (finalYear < 2000 || finalYear > 2100) {
          errors.push(`Row ${rowNumber}: Year must be between 2000 and 2100`);
          hasRowError = true;
        }

        const startRaw = get(cols, iStart);
        const endRaw = get(cols, iEnd);
        const startNormalized = normalizeDate(startRaw);
        const endNormalized = normalizeDate(endRaw);
        if (startRaw && !startNormalized) {
          errors.push(`Row ${rowNumber}: Start Date has invalid format`);
          hasRowError = true;
        }
        if (endRaw && !endNormalized) {
          errors.push(`Row ${rowNumber}: End Date has invalid format`);
          hasRowError = true;
        }

        const ageRaw = get(cols, iAge);
        let ageValue: number | null = null;
        if (ageRaw) {
          const n = Number(ageRaw);
          if (!Number.isInteger(n) || n < 0) {
            errors.push(`Row ${rowNumber}: Age must be a non-negative integer`);
            hasRowError = true;
          } else {
            ageValue = n;
          }
        }

        // Only add row if no errors were introduced for this row
        const rowPayload = {
          client_name: client || "",
          life_coach: get(cols, iCoach) || null,
          start_date: startNormalized,
          end_date: endNormalized,
          area_office: get(cols, iOffice) || null,
          race_eth: get(cols, iRace) || null,
          sex: get(cols, iSex) || null,
          case_code: get(cols, iCaseAlt) || null,
          age: ageValue,
          hometown: get(cols, iTown) || null,
          model: get(cols, iModel) || null,
          notes: get(cols, iNotes) || null,
          year: (finalYear as number | undefined)!,
        } as Omit<ClosedFileRow, "id">;

        if (!hasRowError) {
          toInsert.push(rowPayload);
        }
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

  const [vizYear, setVizYear] = useState<string>("all");

  const dataForVisualization = useMemo(() => {
    if (!rows) return [];
    if (vizYear === "all") return rows;
    return rows.filter((r) => r.year === Number(vizYear));
  }, [rows, vizYear]);

  const chartData = useMemo(() => {
    if (!dataForVisualization || dataForVisualization.length === 0) {
      return {
        ageData: [],
        raceChartData: [],
        sexChartData: [],
        areaChartData: [],
        coachChartData: [],
        hometownChartData: [],
        avgAge: null,
        medianAge: null,
        uniqueCoaches: 0,
        uniqueAreas: 0,
      };
    }
    return processChartData(dataForVisualization);
  }, [dataForVisualization]);

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
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Closed Client Files
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        Manage client data and view demographic insights.
      </Typography.Paragraph>

      <Tabs
        activeKey={activeTab}
        onChange={(k) => {
          const next = new URLSearchParams(params);
          next.set("tab", k);
          setParams(next);
        }}
        items={[
          { key: "data", label: "Data" },
          { key: "visualizations", label: "Visualizations" },
        ]}
        style={{ marginBottom: 16 }}
      />

      {activeTab === "data" && (
        <>
          <Flex align="center" gap={8} style={{ marginBottom: 16 }}>
            <Button
              icon={<LeftOutlined />}
              onClick={onPrev}
              disabled={!canPrev}
            />
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
            <Button
              icon={<RightOutlined />}
              onClick={onNext}
              disabled={!canNext}
            />
            <div style={{ marginLeft: "auto" }} />
            <Button onClick={exportCsv}>Export CSV</Button>
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
              Upload a CSV with the correct headers. Optionally set a year to
              apply to all rows.
            </Typography.Paragraph>
            <div style={{ marginBottom: 12 }}>
              <InputNumber
                style={{ width: 200 }}
                min={2000}
                max={2100}
                placeholder={String(selectedYear)}
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
              <p className="ant-upload-hint">
                or drag and drop a .csv file here
              </p>
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
                  placeholder={String(selectedYear)}
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

          <Modal
            title={selectedRow ? selectedRow.client_name : "Client Details"}
            open={!!selectedRow}
            onCancel={() => setSelectedRow(null)}
            footer={null}
            destroyOnClose
          >
            {selectedRow && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <Typography.Text type="secondary">
                    Client Name
                  </Typography.Text>
                  <div>{selectedRow.client_name}</div>
                </div>
                <div>
                  <Typography.Text type="secondary">Life Coach</Typography.Text>
                  <div>{displayOrNull(selectedRow.life_coach)}</div>
                </div>
                <div>
                  <Typography.Text type="secondary">Start Date</Typography.Text>
                  <div>{displayOrNull(selectedRow.start_date)}</div>
                </div>
                <div>
                  <Typography.Text type="secondary">End Date</Typography.Text>
                  <div>{displayOrNull(selectedRow.end_date)}</div>
                </div>
                <div>
                  <Typography.Text type="secondary">
                    Area Office
                  </Typography.Text>
                  <div>
                    {selectedRow.area_office
                      ? toTitleCase(selectedRow.area_office)
                      : renderNull()}
                  </div>
                </div>
                <div>
                  <Typography.Text type="secondary">Race/Eth</Typography.Text>
                  <div>
                    {selectedRow.race_eth
                      ? toTitleCase(selectedRow.race_eth)
                      : renderNull()}
                  </div>
                </div>
                <div>
                  <Typography.Text type="secondary">Sex</Typography.Text>
                  <div>{displayOrNull(selectedRow.sex)}</div>
                </div>
                <div>
                  <Typography.Text type="secondary">Case</Typography.Text>
                  <div>{displayOrNull(selectedRow.case_code)}</div>
                </div>
                <div>
                  <Typography.Text type="secondary">Age</Typography.Text>
                  <div>
                    {selectedRow.age === null || selectedRow.age === undefined
                      ? renderNull()
                      : selectedRow.age}
                  </div>
                </div>
                <div>
                  <Typography.Text type="secondary">Hometown</Typography.Text>
                  <div>
                    {selectedRow.hometown
                      ? toTitleCase(selectedRow.hometown)
                      : renderNull()}
                  </div>
                </div>
                <div>
                  <Typography.Text type="secondary">Model</Typography.Text>
                  <div>{displayOrNull(selectedRow.model)}</div>
                </div>
                <div>
                  <Typography.Text type="secondary">Notes</Typography.Text>
                  <div style={{ whiteSpace: "pre-wrap" }}>
                    {displayOrNull(selectedRow.notes)}
                  </div>
                </div>
                <div>
                  <Typography.Text type="secondary">Year</Typography.Text>
                  <div>{selectedRow.year}</div>
                </div>
              </div>
            )}
          </Modal>

          <Modal
            title={
              selectedRow ? `Edit: ${selectedRow.client_name}` : "Edit Record"
            }
            open={editOpen}
            onCancel={() => setEditOpen(false)}
            footer={null}
            destroyOnClose
          >
            <Form
              form={editForm}
              layout="vertical"
              onFinish={async (values: AddFormValues) => {
                if (!organizationId || !selectedRow) {
                  message.error("No organization or record");
                  return;
                }
                try {
                  const payload = {
                    client_name: values.client_name,
                    life_coach: values.life_coach ?? null,
                    start_date: values.start_date
                      ? values.start_date.format("YYYY-MM-DD")
                      : null,
                    end_date: values.end_date
                      ? values.end_date.format("YYYY-MM-DD")
                      : null,
                    area_office: values.area_office ?? null,
                    race_eth: values.race_eth ?? null,
                    sex: values.sex ?? null,
                    case_code: values.case_code ?? null,
                    age: typeof values.age === "number" ? values.age : null,
                    hometown: values.hometown ?? null,
                    model: values.model ?? null,
                    notes: values.notes ?? null,
                    year: values.year,
                  };
                  const { error } = await supabase
                    .from("closed_client_files")
                    .update(payload)
                    .eq("id", selectedRow.id)
                    .eq("organization_id", organizationId);
                  if (error) throw error;
                  await refresh();
                  message.success("Record updated");
                  setEditOpen(false);
                } catch (e) {
                  message.error("Failed to update record");
                }
              }}
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
                  placeholder={String(selectedYear)}
                />
              </Form.Item>
              <Flex gap={8} justify="flex-end">
                <Button onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button type="primary" htmlType="submit">
                  Save Changes
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
                pagination={{
                  current: page,
                  pageSize,
                  showSizeChanger: true,
                  onChange: (nextPage, nextPageSize) => {
                    if (
                      typeof nextPageSize === "number" &&
                      nextPageSize !== pageSize
                    ) {
                      setPageSize(nextPageSize);
                      setPage(1);
                    } else {
                      setPage(nextPage);
                    }
                  },
                }}
                scroll={undefined}
                tableLayout="fixed"
                style={{ width: "100%" }}
                columns={[
                  {
                    title: "Client Name",
                    dataIndex: "client_name",
                    ellipsis: true,
                    onHeaderCell: () => ({ style: headerCellStyle }),
                  },
                  {
                    title: "Start Date",
                    dataIndex: "start_date",
                    ellipsis: true,
                    onHeaderCell: () => ({ style: headerCellStyle }),
                    render: (value: string | null) => displayOrNull(value),
                  },
                  {
                    title: "End Date",
                    dataIndex: "end_date",
                    ellipsis: true,
                    onHeaderCell: () => ({ style: headerCellStyle }),
                    render: (value: string | null) => displayOrNull(value),
                  },
                  {
                    title: "Area Office",
                    dataIndex: "area_office",
                    ellipsis: true,
                    render: (value: string | null) =>
                      value ? toTitleCase(String(value)) : renderNull(),
                    onHeaderCell: () => ({ style: headerCellStyle }),
                  },
                  {
                    title: "Race/Eth",
                    dataIndex: "race_eth",
                    ellipsis: true,
                    onHeaderCell: () => ({ style: headerCellStyle }),
                    render: (value: string | null) =>
                      value ? toTitleCase(String(value)) : renderNull(),
                  },
                  {
                    title: "Sex",
                    dataIndex: "sex",
                    ellipsis: true,
                    width: 80,
                    align: "center",
                    onHeaderCell: () => ({ style: headerCellStyle }),
                    render: (value: string | null) => displayOrNull(value),
                  },
                  {
                    title: "Case",
                    dataIndex: "case_code",
                    ellipsis: true,
                    width: 100,
                    align: "center",
                    onHeaderCell: () => ({ style: headerCellStyle }),
                    render: (value: string | null) => displayOrNull(value),
                  },
                  {
                    title: "Age",
                    dataIndex: "age",
                    width: 80,
                    align: "center",
                    onHeaderCell: () => ({ style: headerCellStyle }),
                    render: (value: number | null) =>
                      value === null || value === undefined
                        ? renderNull()
                        : value,
                  },
                  {
                    title: "Hometown",
                    dataIndex: "hometown",
                    ellipsis: true,
                    align: "center",
                    onHeaderCell: () => ({ style: headerCellStyle }),
                    render: (value: string | null) =>
                      value ? toTitleCase(String(value)) : renderNull(),
                  },
                  {
                    title: "Actions",
                    width: 120,
                    onHeaderCell: () => ({ style: headerCellStyle }),
                    render: (_, record) => {
                      const items = [
                        { key: "view", label: "View Details" },
                        { key: "edit", label: "Edit" },
                      ];
                      return (
                        <Dropdown
                          menu={{
                            items,
                            onClick: ({ key }) => {
                              if (key === "view") {
                                setSelectedRow(record);
                              } else if (key === "edit") {
                                setSelectedRow(record);
                                editForm.setFieldsValue({
                                  client_name: record.client_name,
                                  life_coach: record.life_coach ?? undefined,
                                  start_date: record.start_date
                                    ? dayjs(record.start_date)
                                    : undefined,
                                  end_date: record.end_date
                                    ? dayjs(record.end_date)
                                    : undefined,
                                  area_office: record.area_office ?? undefined,
                                  race_eth: record.race_eth ?? undefined,
                                  sex: record.sex ?? undefined,
                                  case_code: record.case_code ?? undefined,
                                  age: record.age ?? undefined,
                                  hometown: record.hometown ?? undefined,
                                  model: record.model ?? undefined,
                                  notes: record.notes ?? undefined,
                                  year: record.year,
                                });
                                setEditOpen(true);
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
                  onClick: () => setSelectedRow(record),
                  style: { cursor: "pointer" },
                })}
              />
            </motion.div>
          )}
        </>
      )}

      {activeTab === "visualizations" && (
        <div>
          <Typography.Title level={4}>Demographic Analytics</Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
            Insights and trends from your client data.
          </Typography.Paragraph>

          <div style={{ marginBottom: 24 }}>
            <Typography.Text strong style={{ marginRight: 12 }}>
              Filter by Year:
            </Typography.Text>
            <Segmented
              value={vizYear}
              onChange={(v) => setVizYear(v)}
              options={[
                { value: "all", label: "All Years" },
                ...years.map((y) => ({
                  value: String(y),
                  label: `FY${y}`,
                })),
              ]}
              style={{ maxWidth: "100%", overflowX: "auto" }}
            />
          </div>

          {dataForVisualization.length === 0 ? (
            <Alert
              message="No Data Available"
              description={
                vizYear === "all"
                  ? "No client records found. Switch to the Data tab to add records."
                  : `No client records found for FY${vizYear}. Switch to the Data tab to add records.`
              }
              type="info"
              showIcon
            />
          ) : (
            <>
              {/* Summary Cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                <Card size="small">
                  <Typography.Text type="secondary">
                    Total Records
                  </Typography.Text>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: "bold",
                      color: "#1890ff",
                    }}
                  >
                    {dataForVisualization.length}
                  </div>
                </Card>
                <Card size="small">
                  <Typography.Text type="secondary">
                    Year Filter
                  </Typography.Text>
                  <div style={{ fontSize: 16, fontWeight: "bold" }}>
                    {vizYear === "all" ? "All Years" : `FY${vizYear}`}
                  </div>
                </Card>
                <Card size="small">
                  <Typography.Text type="secondary">Median Age</Typography.Text>
                  <div style={{ fontSize: 16, fontWeight: "bold" }}>
                    {chartData.medianAge ?? "N/A"}
                  </div>
                </Card>
                <Card size="small">
                  <Typography.Text type="secondary">
                    Unique Life Coaches
                  </Typography.Text>
                  <div style={{ fontSize: 16, fontWeight: "bold" }}>
                    {chartData.uniqueCoaches}
                  </div>
                </Card>
                <Card size="small">
                  <Typography.Text type="secondary">
                    Unique Area Offices
                  </Typography.Text>
                  <div style={{ fontSize: 16, fontWeight: "bold" }}>
                    {chartData.uniqueAreas}
                  </div>
                </Card>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 24,
                  marginBottom: 24,
                }}
              >
                {/* Age Distribution */}
                <Card title="Age Distribution" size="small">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.ageData}>
                      <defs>
                        <linearGradient
                          id="ageGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#8884d8"
                            stopOpacity={0.9}
                          />
                          <stop
                            offset="100%"
                            stopColor="#8884d8"
                            stopOpacity={0.3}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="age" />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill="url(#ageGradient)"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                {/* Sex Distribution */}
                <Card title="Sex Distribution" size="small">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <defs>
                        <linearGradient id="pieA" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#8884d8" />
                          <stop offset="100%" stopColor="#8dd1e1" />
                        </linearGradient>
                      </defs>
                      <Pie
                        data={chartData.sexChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${((percent as number) * 100).toFixed(0)}%`
                        }
                        innerRadius={50}
                        outerRadius={80}
                        fill="url(#pieA)"
                        dataKey="value"
                      >
                        {chartData.sexChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>

                {/* Race/Ethnicity Distribution */}
                <Card title="Race/Ethnicity Distribution" size="small">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <defs>
                        <linearGradient id="pieB" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#82ca9d" />
                          <stop offset="100%" stopColor="#ffc658" />
                        </linearGradient>
                      </defs>
                      <Pie
                        data={chartData.raceChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${((percent as number) * 100).toFixed(0)}%`
                        }
                        innerRadius={50}
                        outerRadius={80}
                        fill="url(#pieB)"
                        dataKey="value"
                      >
                        {chartData.raceChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>

                {/* Life Coach Distribution */}
                <Card
                  title="Life Coach Distribution"
                  size="small"
                  style={{ gridColumn: "1 / -1" }}
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.coachChartData}>
                      <defs>
                        <linearGradient
                          id="coachGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#ffc658"
                            stopOpacity={0.9}
                          />
                          <stop
                            offset="100%"
                            stopColor="#ffc658"
                            stopOpacity={0.3}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="coach"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill="url(#coachGradient)"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
