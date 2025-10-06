import { Card, Typography, Table, Alert, Spin } from "antd";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Contact = {
  id: string;
  name: string;
  organization?: string;
  status?: string;
};

export default function Networking() {
  const [rows, setRows] = useState<Contact[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("networking_contacts")
        .select("id,name,organization,status")
        .order("name", { ascending: true });
      if (!isMounted) return;
      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data as Contact[]) ?? []);
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
          Networking
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          Contacts, partnerships, and outreach.
        </Typography.Paragraph>
        {error && (
          <Alert
            type="error"
            showIcon
            message="Failed to load contacts"
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
                { title: "Name", dataIndex: "name" },
                { title: "Organization", dataIndex: "organization" },
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
