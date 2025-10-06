import { Layout, Menu, Typography, theme, Switch, Tooltip, Button } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  HomeOutlined,
  TeamOutlined,
  ReconciliationOutlined,
  ShareAltOutlined,
  FileDoneOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { ReactNode, useMemo } from "react";
import { useThemeController } from "../theme/ThemeProvider";
import { supabase } from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

const { Header, Sider, Content, Footer } = Layout;

type AppLayoutProps = {
  children?: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  const { token } = theme.useToken();
  const { isDarkMode, toggleDarkMode } = useThemeController();
  const location = useLocation();
  const navigate = useNavigate();
  const menuItems = useMemo(
    () => [
      { key: "/", icon: <HomeOutlined />, label: "Home" },
      { key: "/roster", icon: <TeamOutlined />, label: "Master Roster" },
      {
        key: "/grantmaking",
        icon: <ReconciliationOutlined />,
        label: "Grantmaking",
      },
      { key: "/networking", icon: <ShareAltOutlined />, label: "Networking" },
      {
        key: "/closed",
        icon: <FileDoneOutlined />,
        label: "Closed Client Files",
      },
      { key: "/settings", icon: <SettingOutlined />, label: "Settings" },
    ],
    []
  );

  return (
    <Layout style={{ minHeight: "100vh", background: token.colorBgLayout }}>
      <Sider breakpoint="lg" collapsedWidth={64}>
        <div
          style={{
            height: 48,
            margin: 12,
            background: "rgba(255,255,255,0.15)",
            borderRadius: 6,
          }}
        />
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => typeof key === "string" && navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: token.colorBgContainer,
            padding: "0 16px",
            borderBottom: `1px solid ${token.colorBorder}`,
          }}
        >
          <Typography.Title level={4} style={{ margin: 0 }}>
            NECS CRM
          </Typography.Title>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Tooltip title="Dark mode">
              <Switch
                size="small"
                checked={isDarkMode}
                onChange={toggleDarkMode}
              />
            </Tooltip>
            <Button size="small" onClick={() => supabase.auth.signOut()}>
              Logout
            </Button>
          </div>
        </Header>
        <Content style={{ margin: 16 }}>
          <div
            style={{
              position: "relative",
              padding: 16,
              background: token.colorBgContainer,
              borderRadius: token.borderRadius,
              overflow: "hidden",
            }}
          >
            {/* Morphing background blob */}
            <motion.div
              key={`bg-${location.pathname}`}
              initial={{
                scale: 0.9,
                opacity: 0.08,
                x: -40,
                y: -20,
                borderRadius: "20% 80% 30% 70% / 30% 30% 70% 70%",
              }}
              animate={{
                scale: 1.05,
                opacity: 0.12,
                x: 20,
                y: -10,
                borderRadius: "60% 40% 60% 40% / 50% 60% 40% 50%",
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut",
              }}
              style={{
                position: "absolute",
                inset: -80,
                background: isDarkMode
                  ? "linear-gradient(135deg, rgba(239,68,68,0.25), rgba(239,68,68,0.15))"
                  : "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.1))",
                filter: "blur(40px)",
                zIndex: 0,
              }}
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                style={{ position: "relative", zIndex: 1 }}
              >
                {children ?? <Outlet />}
              </motion.div>
            </AnimatePresence>
          </div>
        </Content>
        <Footer
          style={{ textAlign: "center", background: token.colorBgLayout }}
        >
          © {new Date().getFullYear()} NECS
        </Footer>
      </Layout>
    </Layout>
  );
}
