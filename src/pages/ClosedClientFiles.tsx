import {
  Alert,
  Button,
  Card,
  Flex,
  Segmented,
  Spin,
  Table,
  Typography,
} from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { motion } from "framer-motion";

type FileItem = { id: string; name: string; year: number };

type YearGroup = { year: number; files: FileItem[] };

const FIXED_YEARS = [2025, 2024, 2023, 2022, 2021, 2020];
const mockData: YearGroup[] = [];

export default function ClosedClientFiles() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<FileItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const years = useMemo(() => FIXED_YEARS, []);
  const countsByYear = useMemo(() => {
    const map = new Map<number, number>();
    if (rows) {
      for (const y of FIXED_YEARS) {
        map.set(y, rows.filter((r) => r.year === y).length);
      }
    } else {
      for (const y of FIXED_YEARS) map.set(y, 0);
    }
    return map;
  }, [rows]);
  const defaultYear = years[0];
  const selectedYear = Number(params.get("year") ?? defaultYear);

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

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("closed_client_files")
        .select("id,name,year")
        .in("year", FIXED_YEARS)
        .order("name", { ascending: true });
      if (!isMounted) return;
      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data as FileItem[]) ?? []);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

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
                {y}{" "}
                <Typography.Text type="secondary">
                  ({countsByYear.get(y) ?? 0})
                </Typography.Text>
              </span>
            ),
          }))}
          style={{ maxWidth: "100%", overflowX: "auto" }}
        />
        <Button icon={<RightOutlined />} onClick={onNext} disabled={!canNext} />
      </Flex>

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
            columns={[
              { title: "Client Name", dataIndex: "name" },
              { title: "Year", dataIndex: "year", width: 120 },
              { title: "ID", dataIndex: "id", width: 120 },
            ]}
          />
        </motion.div>
      )}
    </Card>
  );
}
