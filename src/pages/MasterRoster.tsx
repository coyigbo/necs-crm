import { Card, Typography, Table, Alert, Spin } from "antd";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { motion } from "framer-motion";
import { useOrg } from "../org/OrgProvider";

type RosterItem = {
  id: string;
  name: string;
  status: string;
};

export default function MasterRoster() {
  const [rows, setRows] = useState<RosterItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { organizationId } = useOrg();

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!organizationId) {
        setRows([]);
        return;
      }
      const { data, error } = await supabase
        .from("master_roster")
        .select("id,name,status")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true });
      if (!isMounted) return;
      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data as RosterItem[]) ?? []);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [organizationId]);

  return (
    <Card bordered={false}>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Master Roster
      </Typography.Title>
      {error && (
        <Alert
          type="error"
          showIcon
          message="Failed to load roster"
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
              { title: "Status", dataIndex: "status", width: 160 },
              { title: "ID", dataIndex: "id", width: 120 },
            ]}
          />
        </motion.div>
      )}
    </Card>
  );
}
