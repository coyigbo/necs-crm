import {
  Card,
  Divider,
  Typography,
  Switch,
  Space,
  Tabs,
  Form,
  Input,
  Button,
  Table,
  Tag,
  Spin,
  Alert,
} from "antd";
import { motion } from "framer-motion";
import { useThemeController } from "../theme/ThemeProvider";
import { useEffect, useMemo, useState } from "react";
import { useOrg } from "../org/OrgProvider";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabaseClient";

type OrgUserRow = {
  id: string; // user_id
  name: string | null;
  email: string | null;
  role: "admin" | "member" | "viewer";
};

export default function Settings() {
  const { isDarkMode, toggleDarkMode } = useThemeController();
  const { organizationId } = useOrg();
  const { user } = useAuth();

  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersData, setUsersData] = useState<OrgUserRow[]>([]);

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileForm] = Form.useForm();

  useEffect(() => {
    let mounted = true;
    async function loadUsers() {
      if (!organizationId) {
        setUsersData([]);
        setUsersLoading(false);
        return;
      }
      setUsersLoading(true);
      try {
        const { data, error } = await supabase
          .from("user_organizations")
          .select("user_id, role")
          .eq("organization_id", organizationId);
        if (error) throw error;
        const list =
          (data as { user_id: string; role: OrgUserRow["role"] }[]) || [];
        const ids = Array.from(new Set(list.map((r) => r.user_id)));
        let namesMap: Record<string, string> = {};
        let emailsMap: Record<string, string> = {};
        if (ids.length > 0) {
          try {
            const url = `${
              import.meta.env.VITE_SUPABASE_URL
            }/functions/v1/user-names`;
            const res = await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${
                  import.meta.env.VITE_SUPABASE_ANON_KEY
                }`,
              },
              body: JSON.stringify({ userIds: ids }),
            });
            const payload = await res
              .json()
              .catch(() => ({ names: {}, emails: {} }));
            namesMap = payload?.names ?? {};
            emailsMap = payload?.emails ?? {};
          } catch {
            namesMap = {};
            emailsMap = {};
          }
        }
        const rows: OrgUserRow[] = list.map((r) => ({
          id: r.user_id,
          name: namesMap[r.user_id] ?? null,
          email: emailsMap[r.user_id] ?? null,
          role: r.role,
        }));
        if (!mounted) return;
        setUsersData(rows);
        setUsersError(null);
      } catch (e: any) {
        if (!mounted) return;
        setUsersError(e?.message || "Failed to load users");
        setUsersData([]);
      } finally {
        if (mounted) setUsersLoading(false);
      }
    }
    loadUsers();
    return () => {
      mounted = false;
    };
  }, [organizationId]);

  // Load user profile data
  useEffect(() => {
    if (user) {
      const meta = user.user_metadata || {};
      const fullName = meta.full_name || meta.name || meta.given_name || "";
      const email = user.email || "";

      profileForm.setFieldsValue({
        fullName,
        email,
      });
    }
  }, [user, profileForm]);

  return (
    <Card bordered={false}>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          Settings
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          Manage organization details, users, and preferences.
        </Typography.Paragraph>

        <Tabs
          defaultActiveKey="profile"
          items={[
            {
              key: "profile",
              label: "My Profile",
              children: (
                <div>
                  <Typography.Title level={5} style={{ marginTop: 0 }}>
                    Personal Settings
                  </Typography.Title>
                  {profileError && (
                    <Alert
                      type="error"
                      showIcon
                      message="Failed to update profile"
                      description={profileError}
                      style={{ marginBottom: 12 }}
                    />
                  )}
                  <Form
                    form={profileForm}
                    layout="vertical"
                    requiredMark={false}
                    style={{ maxWidth: 560 }}
                    onFinish={async (values) => {
                      setProfileLoading(true);
                      setProfileError(null);
                      try {
                        const { error } = await supabase.auth.updateUser({
                          data: {
                            full_name: values.fullName,
                          },
                        });
                        if (error) throw error;
                        // Note: Email updates require re-authentication in Supabase
                        // For now, we only update the display name
                      } catch (e: any) {
                        setProfileError(
                          e?.message || "Failed to update profile"
                        );
                      } finally {
                        setProfileLoading(false);
                      }
                    }}
                  >
                    <Form.Item
                      label="Full name"
                      name="fullName"
                      rules={[{ required: true }]}
                    >
                      <Input placeholder="Your full name" />
                    </Form.Item>
                    <Form.Item
                      label="Email"
                      name="email"
                      rules={[{ required: true, type: "email" }]}
                    >
                      <Input placeholder="your@email.com" disabled />
                    </Form.Item>
                    <Space>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={profileLoading}
                      >
                        Save changes
                      </Button>
                      <Button onClick={() => profileForm.resetFields()}>
                        Cancel
                      </Button>
                    </Space>
                  </Form>
                  <Divider style={{ margin: "16px 0" }} />
                  <Space size={12} align="center">
                    <Typography.Text>Dark mode</Typography.Text>
                    <Switch
                      size="small"
                      checked={isDarkMode}
                      onChange={toggleDarkMode}
                    />
                  </Space>
                </div>
              ),
            },
            {
              key: "users",
              label: "Users & Roles",
              children: (
                <div>
                  <Typography.Title level={5} style={{ marginTop: 0 }}>
                    Team
                  </Typography.Title>
                  {usersError && (
                    <Alert
                      type="error"
                      showIcon
                      message="Failed to load users"
                      description={usersError}
                      style={{ marginBottom: 12 }}
                    />
                  )}
                  {usersLoading ? (
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
                    <Table
                      rowKey={(r) => r.id}
                      dataSource={usersData}
                      pagination={false}
                      columns={[
                        {
                          title: "Name",
                          dataIndex: "name",
                          render: (name: string | null, r: OrgUserRow) =>
                            name || r.id,
                        },
                        {
                          title: "Email",
                          dataIndex: "email",
                          render: (v: string | null) => v || "—",
                        },
                        {
                          title: "Role",
                          dataIndex: "role",
                          width: 160,
                          render: (role: OrgUserRow["role"]) => (
                            <Tag
                              color={
                                role === "admin"
                                  ? "red"
                                  : role === "member"
                                  ? "blue"
                                  : "default"
                              }
                            >
                              {role === "admin"
                                ? "Admin"
                                : role === "member"
                                ? "Member"
                                : "Viewer"}
                            </Tag>
                          ),
                        },
                      ]}
                    />
                  )}
                  <Divider style={{ margin: "16px 0" }} />
                  <Typography.Title level={5} style={{ marginTop: 0 }}>
                    Invite user
                  </Typography.Title>
                  <Form layout="inline" requiredMark={false} style={{ gap: 8 }}>
                    <Form.Item
                      name="inviteEmail"
                      rules={[{ required: true }, { type: "email" }]}
                    >
                      <Input placeholder="user@necservices.org" />
                    </Form.Item>
                    <Form.Item name="inviteRole" initialValue="viewer">
                      <Input placeholder="Role (admin/member/viewer)" />
                    </Form.Item>
                    <Form.Item>
                      <Button disabled type="primary">
                        Send invite
                      </Button>
                    </Form.Item>
                  </Form>
                  <Typography.Paragraph
                    type="secondary"
                    style={{ marginTop: 8 }}
                  >
                    Invites and role changes are managed via secured functions.
                  </Typography.Paragraph>
                </div>
              ),
            },
          ]}
        />
      </motion.div>
    </Card>
  );
}
