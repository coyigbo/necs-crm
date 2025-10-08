import { Alert, Button, Form, Input, Typography, theme } from "antd";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MailOutlined, LockOutlined } from "@ant-design/icons";

type FormValues = {
  email: string;
  password: string;
};

export default function Login() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const getFriendlyAuthError = (e: any): string => {
    const msg: string = e?.message || "Authentication failed";
    if (/necservices\.org/i.test(msg)) {
      return "Only @necservices.org accounts are permitted.";
    }
    return msg;
  };

  const onFinish = async (values: FormValues) => {
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    setSubmitting(false);
    if (error) {
      setError(getFriendlyAuthError(error));
      return;
    }
    const from = (location.state as any)?.from?.pathname || "/";
    navigate(from, { replace: true });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${token.colorBgContainer}, ${token.colorBgLayout})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(480px, 100%)",
          background: token.colorBgContainer,
          borderRadius: 24,
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
          padding: "32px 24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative gradient orb */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            right: "-120px",
            width: "240px",
            height: "240px",
            background: `linear-gradient(135deg, ${token.colorPrimary}40, ${token.colorPrimary}00)`,
            borderRadius: "50%",
            zIndex: 0,
          }}
        />

        {/* Logo and welcome */}
        <div style={{ position: "relative", marginBottom: 32 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <img
              src="/logo.svg"
              alt="App logo"
              style={{ width: 40, height: 40 }}
            />
            <Typography.Text
              strong
              style={{ fontSize: 16, letterSpacing: -0.5 }}
            >
              Welcome
            </Typography.Text>
          </div>
          <Typography.Title level={2} style={{ marginTop: 0, marginBottom: 8 }}>
            {greeting} 👋
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
            Sign in to access your workspace
          </Typography.Paragraph>
        </div>

        {(location.state as any)?.message && (
          <Alert
            type="success"
            showIcon
            message={(location.state as any).message}
            style={{ marginBottom: 24 }}
          />
        )}

        {error && (
          <Alert
            type="error"
            showIcon
            message="Sign in failed"
            description={error}
            style={{ marginBottom: 24 }}
          />
        )}

        <Form
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          style={{ position: "relative" }}
          validateTrigger="onBlur"
        >
          <Form.Item
            name="email"
            label="Email address"
            rules={[
              { required: true },
              { type: "email" },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const allowed = /@necservices\.org$/i.test(value.trim());
                  return allowed
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error("Use your @necservices.org email")
                      );
                },
              },
            ]}
          >
            <Input
              size="large"
              placeholder="name@necservices.org"
              autoComplete="email"
              prefix={
                <MailOutlined style={{ color: token.colorTextDescription }} />
              }
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true }]}
          >
            <Input.Password
              size="large"
              placeholder="••••••••"
              autoComplete="current-password"
              prefix={
                <LockOutlined style={{ color: token.colorTextDescription }} />
              }
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            loading={submitting}
            size="large"
            style={{
              height: 48,
              borderRadius: 8,
              marginTop: 8,
              boxShadow: `0 4px 12px ${token.colorPrimary}40`,
            }}
          >
            Sign in
          </Button>
        </Form>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Typography.Text type="secondary">
            Don't have an account?{" "}
            <Link to="/signup" style={{ color: token.colorPrimary }}>
              Sign up
            </Link>
          </Typography.Text>
        </div>

        <Typography.Paragraph
          type="secondary"
          style={{
            fontSize: 13,
            textAlign: "center",
            marginTop: 24,
            marginBottom: 0,
            position: "relative",
          }}
        >
          Protected by industry-standard encryption
        </Typography.Paragraph>
      </div>
    </div>
  );
}
