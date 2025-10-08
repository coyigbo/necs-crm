import { Alert, Button, Form, Input, Typography, theme } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MailOutlined, LockOutlined, UserOutlined } from "@ant-design/icons";
import { supabase } from "../lib/supabaseClient";

// Helper to call edge function
async function fetchOrgNameByDomain(domain: string): Promise<string | null> {
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/org-lookup`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ domain }),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data?.name ?? null;
  } catch {
    return null;
  }
}

type FormValues = {
  firstName: string;
  lastName: string;
  organization: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export default function SignUp() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const [orgLocked, setOrgLocked] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const getFriendlyAuthError = (e: any): string => {
    const msg: string = e?.message || "Sign up failed";
    if (/necservices\.org/i.test(msg)) {
      return "Only @necservices.org accounts are permitted.";
    }
    return msg;
  };

  const onFinish = async (values: FormValues) => {
    setSubmitting(true);
    setError(null);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            first_name: values.firstName,
            last_name: values.lastName,
            full_name: `${values.firstName} ${values.lastName}`,
            organization_name: values.organization,
          },
        },
      });

      if (signUpError) throw signUpError;

      // Navigate to verification page with user data
      navigate("/verify", {
        replace: true,
        state: {
          email: values.email,
          userData: {
            first_name: values.firstName,
            last_name: values.lastName,
            full_name: `${values.firstName} ${values.lastName}`,
            organization_name: values.organization,
          },
        },
      });
    } catch (err: any) {
      setError(getFriendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailChange = async (email: string) => {
    const domain = (email.split("@")[1] || "").toLowerCase();
    if (!domain) {
      setOrgLocked(false);
      return;
    }
    const orgName = await fetchOrgNameByDomain(domain);
    if (orgName) {
      form.setFieldsValue({ organization: orgName });
      setOrgLocked(true);
    } else {
      // For new domains, do not infer organization name; leave editable
      form.setFieldsValue({ organization: "" });
      setOrgLocked(false);
    }
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
            Create account
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
            Fill in your details to get started
          </Typography.Paragraph>
        </div>

        {error && (
          <Alert
            type="error"
            showIcon
            message="Sign up failed"
            description={error}
            style={{ marginBottom: 24 }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          style={{ position: "relative" }}
          validateTrigger="onBlur"
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <Form.Item
              name="firstName"
              label="First name"
              rules={[{ required: true, message: "Required" }]}
            >
              <Input
                size="large"
                placeholder="John"
                prefix={
                  <UserOutlined style={{ color: token.colorTextDescription }} />
                }
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              name="lastName"
              label="Last name"
              rules={[{ required: true, message: "Required" }]}
            >
              <Input
                size="large"
                placeholder="Smith"
                prefix={
                  <UserOutlined style={{ color: token.colorTextDescription }} />
                }
                style={{ borderRadius: 8 }}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="email"
            label="Email address"
            rules={[
              { required: true, message: "Required" },
              { type: "email", message: "Please enter a valid email" },
            ]}
          >
            <Input
              size="large"
              placeholder="name@company.com"
              autoComplete="email"
              prefix={
                <MailOutlined style={{ color: token.colorTextDescription }} />
              }
              onBlur={(e) => handleEmailChange(e.target.value)}
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="organization"
            label="Company / Organization"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input
              size="large"
              placeholder="NECS Services"
              disabled={orgLocked}
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: "Required" },
              { min: 8, message: "Password must be at least 8 characters" },
            ]}
            extra="Must be at least 8 characters"
          >
            <Input.Password
              size="large"
              placeholder="••••••••"
              prefix={
                <LockOutlined style={{ color: token.colorTextDescription }} />
              }
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm password"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Required" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password
              size="large"
              placeholder="••••••••"
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
            Create account
          </Button>
        </Form>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Typography.Text type="secondary">
            Already have an account?{" "}
            <Link to="/login" style={{ color: token.colorPrimary }}>
              Sign in
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
          By creating an account, you agree to our Terms of Service
        </Typography.Paragraph>
      </div>
    </div>
  );
}
