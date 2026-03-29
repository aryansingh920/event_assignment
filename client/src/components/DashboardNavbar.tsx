"use client";

import { useRouter } from "next/navigation";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Group,
  Menu,
  Text,
  Anchor,
} from "@mantine/core";
import {
  IconChevronDown,
  IconLayoutDashboard,
  IconLogout,
  IconUser,
} from "@tabler/icons-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/authSlice";
import { clearSession } from "@/store/session";

export default function DashboardNavbar() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    clearSession();
    router.replace("/");
  };

  const initials = user
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : "U";

  const fullName = user ? `${user.first_name} ${user.last_name}` : "";

  return (
    <Box
      component="nav"
      style={{
        height: 60,
        borderBottom: "1px solid var(--mantine-color-gray-2)",
        background: "#fff",
        display: "flex",
        alignItems: "center",
        padding: "0 1.5rem",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <Group justify="space-between" w="100%">
        {/* Left – brand */}
        <Group gap="md">
          <Group gap="xs">
            <Box
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "var(--mantine-color-indigo-6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconLayoutDashboard size={18} color="white" />
            </Box>
            <Text
              fw={700}
              size="lg"
              style={{ color: "var(--mantine-color-indigo-8)" }}
            >
              Portal
            </Text>
          </Group>

          {/* Added Assignment Attribution */}
          <Box
            visibleFrom="xs"
            style={{
              borderLeft: "1px solid var(--mantine-color-gray-3)",
              paddingLeft: "1rem",
            }}
          >
            <Text size="xs" c="dimmed">
              Assignment made by{" "}
              <Anchor
                href="https://www.aryan-singh.online/"
                target="_blank"
                size="xs"
                fw={500}
                underline="hover"
              >
                Aryan
              </Anchor>
            </Text>
          </Box>
        </Group>

        {/* Right – user menu */}
        {user && (
          <Menu shadow="md" width={220} position="bottom-end">
            <Menu.Target>
              <Button
                variant="subtle"
                color="gray"
                rightSection={<IconChevronDown size={14} />}
                px="xs"
              >
                <Group gap="xs">
                  <Avatar color="indigo" radius="xl" size="sm">
                    {initials}
                  </Avatar>
                  <Box visibleFrom="sm">
                    <Text size="sm" fw={500} lh={1.2}>
                      {fullName}
                    </Text>
                    <Text size="xs" c="dimmed" lh={1.2}>
                      @{user.username}
                    </Text>
                  </Box>
                </Group>
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Account</Menu.Label>
              <Menu.Item leftSection={<IconUser size={14} />} disabled>
                <Text size="sm" fw={500}>
                  {fullName}
                </Text>
                <Text size="xs" c="dimmed">
                  @{user.username}
                </Text>
                <Text size="xs" c="dimmed">
                  {user.id}
                </Text>
              </Menu.Item>
              <Menu.Item
                leftSection={
                  <Badge size="xs" color="teal" variant="light">
                    {user.prefix}
                  </Badge>
                }
              >
                <Text size="xs" c="dimmed">
                  Role prefix
                </Text>
              </Menu.Item>
              <Menu.Item
                leftSection={
                  <Badge size="xs" color="indigo" variant="light">
                    {user.region}
                  </Badge>
                }
              >
                <Text size="xs" c="dimmed">
                  Region
                </Text>
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<IconLogout size={14} />}
                onClick={handleLogout}
              >
                Sign out
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>
    </Box>
  );
}
