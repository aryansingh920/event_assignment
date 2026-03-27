"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconActivity,
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconDownload,
  IconEye,
  IconRefresh,
  IconServer,
  IconUsers,
} from "@tabler/icons-react";
import DashboardNavbar from "@/components/DashboardNavbar";
import { useAppSelector } from "@/store/hooks";

// ── Sample data ────────────────────────────────────────────────────────────────

const STATS = [
  {
    label: "Total Users",
    value: "4,821",
    icon: IconUsers,
    color: "indigo",
    change: "+12%",
  },
  {
    label: "Active Services",
    value: "38",
    icon: IconServer,
    color: "teal",
    change: "+3",
  },
  {
    label: "Uptime",
    value: "99.97%",
    icon: IconActivity,
    color: "green",
    change: "Stable",
  },
  {
    label: "Avg. Response",
    value: "142ms",
    icon: IconClock,
    color: "orange",
    change: "-8ms",
  },
];

type Status = "active" | "degraded" | "offline";

interface ServiceRow {
  id: string;
  name: string;
  environment: string;
  region: string;
  status: Status;
  lastChecked: string;
  owner: string;
}

const ROWS: ServiceRow[] = [
  {
    id: "SVC-001",
    name: "Auth Gateway",
    environment: "Production",
    region: "us-east",
    status: "active",
    lastChecked: "2 min ago",
    owner: "platform-team",
  },
  {
    id: "SVC-002",
    name: "Data Pipeline",
    environment: "Production",
    region: "eu-central",
    status: "active",
    lastChecked: "5 min ago",
    owner: "data-team",
  },
  {
    id: "SVC-003",
    name: "Notification Worker",
    environment: "Staging",
    region: "us-west",
    status: "degraded",
    lastChecked: "1 min ago",
    owner: "backend-team",
  },
  {
    id: "SVC-004",
    name: "Report Engine",
    environment: "Production",
    region: "ap-south",
    status: "active",
    lastChecked: "3 min ago",
    owner: "analytics-team",
  },
  {
    id: "SVC-005",
    name: "Cache Layer",
    environment: "Production",
    region: "us-east",
    status: "offline",
    lastChecked: "12 min ago",
    owner: "platform-team",
  },
  {
    id: "SVC-006",
    name: "ML Inference",
    environment: "Staging",
    region: "ap-southeast",
    status: "active",
    lastChecked: "7 min ago",
    owner: "ml-team",
  },
  {
    id: "SVC-007",
    name: "File Storage",
    environment: "Production",
    region: "eu-central",
    status: "active",
    lastChecked: "4 min ago",
    owner: "infra-team",
  },
];

const STATUS_CONFIG: Record<
  Status,
  { color: string; icon: typeof IconCircleCheck; label: string }
> = {
  active: { color: "green", icon: IconCircleCheck, label: "Active" },
  degraded: { color: "yellow", icon: IconClock, label: "Degraded" },
  offline: { color: "red", icon: IconCircleX, label: "Offline" },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);

  // Guard – redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader color="indigo" />
      </Box>
    );
  }

  return (
    <Box
      style={{ minHeight: "100vh", background: "var(--mantine-color-gray-0)" }}
    >
      <DashboardNavbar />

      <Container size="xl" py="xl">
        <Stack gap="xl">
          {/* Page header */}
          <Group justify="space-between" align="flex-end">
            <Box>
              <Text size="sm" c="dark.3" mb={2}>
                Good day,{" "}
                <Text span fw={600} c="indigo.7">
                  {user.first_name}
                </Text>
              </Text>
              <Title order={2} fw={700} c="dark.8">
                Service Dashboard
              </Title>
              <Group gap={6} mt={2}>
                <Text size="xs" c="dark.4">
                  Region:
                </Text>
                <Badge size="xs" color="indigo" variant="light">
                  {user.region}
                </Badge>
                <Text size="xs" c="dark.4">
                  · {user.username}
                </Text>
              </Group>
            </Box>
            <Group gap="xs">
              <Tooltip label="Refresh data">
                <ActionIcon variant="default" size="lg" aria-label="Refresh">
                  <IconRefresh size={16} />
                </ActionIcon>
              </Tooltip>
              <Button
                leftSection={<IconDownload size={14} />}
                variant="default"
                size="sm"
              >
                Export
              </Button>
            </Group>
          </Group>

          {/* Stats cards */}
          <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="md">
            {STATS.map((stat) => (
              <Card
                key={stat.label}
                withBorder
                shadow="xs"
                radius="md"
                padding="md"
              >
                <Group justify="space-between" mb="xs">
                  <Text
                    size="xs"
                    c="dark.3"
                    tt="uppercase"
                    fw={700}
                    style={{ letterSpacing: "0.05em" }}
                  >
                    {stat.label}
                  </Text>
                  <Box
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: `var(--mantine-color-${stat.color}-1)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <stat.icon
                      size={16}
                      color={`var(--mantine-color-${stat.color}-6)`}
                    />
                  </Box>
                </Group>
                <Text size="xl" fw={800} c="dark.8">
                  {stat.value}
                </Text>
                <Text
                  size="xs"
                  c={stat.color === "orange" ? "teal.7" : `${stat.color}.7`}
                  mt={2}
                  fw={500}
                >
                  {stat.change} from last week
                </Text>
              </Card>
            ))}
          </SimpleGrid>

          {/* Table */}
          <Paper
            withBorder
            shadow="xs"
            radius="md"
            style={{ overflow: "hidden" }}
          >
            <Box
              px="lg"
              py="md"
              style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}
            >
              <Group justify="space-between">
                <Title order={4} fw={700} c="dark.8">
                  Services Overview
                </Title>
                <Badge color="indigo" variant="light">
                  {ROWS.length} services
                </Badge>
              </Group>
            </Box>

            <Table.ScrollContainer minWidth={640}>
              <Table
                striped
                highlightOnHover
                verticalSpacing="sm"
                horizontalSpacing="lg"
              >
                <Table.Thead>
                  <Table.Tr
                    style={{ background: "var(--mantine-color-gray-1)" }}
                  >
                    <Table.Th>
                      <Text size="xs" fw={700} tt="uppercase" c="dark.4">
                        ID
                      </Text>
                    </Table.Th>
                    <Table.Th>
                      <Text size="xs" fw={700} tt="uppercase" c="dark.4">
                        Service
                      </Text>
                    </Table.Th>
                    <Table.Th>
                      <Text size="xs" fw={700} tt="uppercase" c="dark.4">
                        Environment
                      </Text>
                    </Table.Th>
                    <Table.Th>
                      <Text size="xs" fw={700} tt="uppercase" c="dark.4">
                        Region
                      </Text>
                    </Table.Th>
                    <Table.Th>
                      <Text size="xs" fw={700} tt="uppercase" c="dark.4">
                        Status
                      </Text>
                    </Table.Th>
                    <Table.Th>
                      <Text size="xs" fw={700} tt="uppercase" c="dark.4">
                        Last Checked
                      </Text>
                    </Table.Th>
                    <Table.Th>
                      <Text size="xs" fw={700} tt="uppercase" c="dark.4">
                        Actions
                      </Text>
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {ROWS.map((row) => {
                    const cfg = STATUS_CONFIG[row.status];
                    const StatusIcon = cfg.icon;
                    return (
                      <Table.Tr key={row.id}>
                        <Table.Td>
                          <Text size="xs" ff="monospace" c="dark.3" fw={500}>
                            {row.id}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={600} c="dark.7">
                            {row.name}
                          </Text>
                          <Text size="xs" c="dark.3">
                            {row.owner}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            size="sm"
                            variant="light"
                            color={
                              row.environment === "Production"
                                ? "indigo"
                                : "gray"
                            }
                          >
                            {row.environment}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dark.6">
                            {row.region}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            size="sm"
                            color={cfg.color}
                            variant="light"
                            leftSection={<StatusIcon size={11} />}
                          >
                            {cfg.label}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dark.3">
                            {row.lastChecked}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4}>
                            <Tooltip label="View details">
                              <ActionIcon
                                variant="subtle"
                                color="indigo"
                                size="sm"
                              >
                                <IconEye size={14} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Restart service">
                              <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="sm"
                              >
                                <IconRefresh size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
