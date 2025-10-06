import { Card, Typography, Table, Alert, Spin } from "antd";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabaseClient";

type GrantItem = {
  id: string;
  name: string;
  status?: string;
};

export default function Grantmaking() {
  const [rows, setRows] = useState<GrantItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("grants")
        .select("id,name,status")
        .order("name", { ascending: true });
      if (!isMounted) return;
      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data as GrantItem[]) ?? []);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Card bordered={false}>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          Grantmaking
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          Track grants, statuses, and more.
        </Typography.Paragraph>
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
            <Table
              rowKey={(r) => r.id}
              dataSource={rows}
              columns={[
                { title: "Grant Name", dataIndex: "name" },
                { title: "Status", dataIndex: "status", width: 160 },
                { title: "ID", dataIndex: "id", width: 120 },
              ]}
            />
          </motion.div>
        )}
      </motion.div>
    </Card>
  );
}
