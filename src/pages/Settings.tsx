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
} from "antd";
import { motion } from "framer-motion";
import { useThemeController } from "../theme/ThemeProvider";
import { useMemo } from "react";

export default function Settings() {
  const { isDarkMode, toggleDarkMode } = useThemeController();

  const usersData = useMemo(
    () => [
      {
        id: "u_1",
        name: "Ada Lovelace",
        email: "ada@necservices.org",
        role: "Admin",
      },
      {
        id: "u_2",
        name: "Alan Turing",
        email: "alan@necservices.org",
        role: "Editor",
      },
      {
        id: "u_3",
        name: "Grace Hopper",
        email: "grace@necservices.org",
        role: "Viewer",
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
          Settings
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          Manage organization details, users, and preferences.
        </Typography.Paragraph>

        <Tabs
          defaultActiveKey="org"
          items={[
            {
              key: "org",
              label: "Organization Profile",
              children: (
                <div>
                  <Typography.Title level={5} style={{ marginTop: 0 }}>
                    Profile
                  </Typography.Title>
                  <Form
                    layout="vertical"
                    requiredMark={false}
                    style={{ maxWidth: 560 }}
                  >
                    <Form.Item
                      label="Organization name"
                      name="orgName"
                      rules={[{ required: true }]}
                    >
                      <Input placeholder="NECS" />
                    </Form.Item>
                    <Form.Item label="Website" name="website">
                      <Input placeholder="https://www.necservices.org" />
                    </Form.Item>
                    <Form.Item
                      label="Support email"
                      name="supportEmail"
                      rules={[{ type: "email" }]}
                    >
                      <Input placeholder="support@necservices.org" />
                    </Form.Item>
                    <Space>
                      <Button type="primary">Save changes</Button>
                      <Button>Cancel</Button>
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
                  <Table
                    rowKey={(r) => r.id}
                    dataSource={usersData}
                    pagination={false}
                    columns={[
                      { title: "Name", dataIndex: "name" },
                      { title: "Email", dataIndex: "email" },
                      {
                        title: "Role",
                        dataIndex: "role",
                        width: 160,
                        render: (role: string) => (
                          <Tag
                            color={
                              role === "Admin"
                                ? "red"
                                : role === "Editor"
                                ? "blue"
                                : "default"
                            }
                          >
                            {role}
                          </Tag>
                        ),
                      },
                      {
                        title: "Actions",
                        width: 160,
                        render: () => (
                          <Space>
                            <Button size="small">Change role</Button>
                            <Button size="small" danger>
                              Remove
                            </Button>
                          </Space>
                        ),
                      },
                    ]}
                  />
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
                    <Form.Item name="inviteRole" initialValue="Viewer">
                      <Input placeholder="Role (Admin/Editor/Viewer)" />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary">Send invite</Button>
                    </Form.Item>
                  </Form>
                </div>
              ),
            },
            {
              key: "notifications",
              label: "Notifications",
              children: (
                <div>
                  <Typography.Title level={5} style={{ marginTop: 0 }}>
                    Email notifications
                  </Typography.Title>
                  <Form
                    layout="vertical"
                    requiredMark={false}
                    style={{ maxWidth: 560 }}
                  >
                    <Form.Item
                      label="System alerts"
                      name="alerts"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                    <Form.Item
                      label="Weekly digest"
                      name="digest"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                    <Form.Item
                      label="Product updates"
                      name="updates"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                    <Space>
                      <Button type="primary">Save preferences</Button>
                      <Button>Cancel</Button>
                    </Space>
                  </Form>
                  <Divider style={{ margin: "16px 0" }} />
                  <Typography.Title level={5} style={{ marginTop: 0 }}>
                    In-app notifications
                  </Typography.Title>
                  <Form
                    layout="vertical"
                    requiredMark={false}
                    style={{ maxWidth: 560 }}
                  >
                    <Form.Item
                      label="Show toast notifications"
                      name="toast"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                    <Form.Item
                      label="Sound"
                      name="sound"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                  </Form>
                </div>
              ),
            },
          ]}
        />
      </motion.div>
    </Card>
  );
}
