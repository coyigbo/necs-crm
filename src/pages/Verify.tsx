import { Alert, Button, Form, Input, Typography, theme } from "antd";
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import { supabase } from "../lib/supabaseClient";

export default function Verify() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  const email = location.state?.email;
  const userData = location.state?.userData;

  // Redirect if no email in state
  useEffect(() => {
    if (!email) {
      navigate("/signup", { replace: true });
    }
  }, [email, navigate]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const onFinish = async (values: { code: string }) => {
    setSubmitting(true);
    setError(null);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: values.code,
        type: "signup",
      });

      if (verifyError) throw verifyError;

      // Get the verified user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found after verification");

      // Create organization after successful verification
      try {
        console.log("Creating organization for user:", user.id);
        console.log("User metadata:", user.user_metadata);

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/org-link`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              type: "signup",
              user: {
                id: user.id,
                email: user.email,
                user_metadata: user.user_metadata,
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            "Organization creation failed:",
            response.status,
            errorText
          );
          throw new Error(`Organization creation failed: ${response.status}`);
        }

        const result = await response.json();
        console.log("Organization creation result:", result);
      } catch (orgError) {
        console.error("Failed to create organization:", orgError);
        // Don't fail verification if org creation fails
      }

      // Sign out and redirect to login
      await supabase.auth.signOut();

      navigate("/login", {
        replace: true,
        state: {
          message: "Account verified successfully! You can now sign in.",
        },
      });
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (resendError) throw resendError;

      setCountdown(60); // 60 second cooldown
    } catch (err: any) {
      setError(err.message || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return null; // Will redirect
  }

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
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: token.colorPrimary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 20,
                fontWeight: "bold",
              }}
            >
              N
            </div>
            <Typography.Text
              strong
              style={{ fontSize: 16, letterSpacing: -0.5 }}
            >
              NECS CRM
            </Typography.Text>
          </div>
          <Typography.Title level={2} style={{ marginTop: 0, marginBottom: 8 }}>
            Verify your email
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
            We sent a 6-digit code to <strong>{email}</strong>
          </Typography.Paragraph>
        </div>

        {error && (
          <Alert
            type="error"
            showIcon
            message="Verification failed"
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
          <Form.Item
            name="code"
            label="Verification code"
            rules={[
              { required: true, message: "Required" },
              { len: 6, message: "Code must be 6 digits" },
              {
                pattern: /^\d{6}$/,
                message: "Code must be 6 digits",
              },
            ]}
          >
            <Input
              size="large"
              placeholder="123456"
              maxLength={6}
              style={{
                borderRadius: 8,
                textAlign: "center",
                fontSize: 24,
                letterSpacing: 4,
                fontWeight: "bold",
              }}
              prefix={
                <LockOutlined style={{ color: token.colorTextDescription }} />
              }
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
            Verify account
          </Button>
        </Form>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Typography.Text type="secondary">
            Didn't receive the code?{" "}
            {countdown > 0 ? (
              <Typography.Text type="secondary">
                Resend in {countdown}s
              </Typography.Text>
            ) : (
              <Button
                type="link"
                loading={resending}
                onClick={handleResend}
                style={{ padding: 0, height: "auto" }}
              >
                Resend code
              </Button>
            )}
          </Typography.Text>
        </div>

        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Typography.Text type="secondary">
            Wrong email?{" "}
            <Link to="/signup" style={{ color: token.colorPrimary }}>
              Start over
            </Link>
          </Typography.Text>
        </div>
      </div>
    </div>
  );
}
