"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Affix,
  Alert,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
  ActionIcon,
  ThemeIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconCalendar,
  IconCircleCheck,
  IconCircleDot,
  IconClock,
  IconMapPin,
  IconRefresh,
  IconWifi,
  IconWifiOff,
} from "@tabler/icons-react";
import DashboardNavbar from "@/components/DashboardNavbar";
import { useAppSelector } from "@/store/hooks";
import {
  apiGetEvents,
  apiClaimEvent,
  apiAcknowledgeEvent,
  Event as AppEvent,
} from "@/lib/api";
import { useEventSocket } from "@/hooks/useEventSocket";
import { EventSocketMessage } from "@/lib/socket";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AppEvent["status"],
  { color: string; label: string; icon: typeof IconCircleDot }
> = {
  available: { color: "blue", label: "Available", icon: IconCircleDot },
  claimed: { color: "orange", label: "Claimed", icon: IconClock },
  acknowledged: {
    color: "green",
    label: "Acknowledged",
    icon: IconCircleCheck,
  },
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ── EventsTable ───────────────────────────────────────────────────────────────

function EventsTable({
  title,
  events,
  accentColor,
  processingEvents,
  onRowClick,
}: {
  title: string;
  events: AppEvent[];
  accentColor: string;
  processingEvents: Set<string>;
  onRowClick: (e: AppEvent) => void;
}) {
  if (events.length === 0) return null;

  return (
    <Paper withBorder shadow="xs" radius="md" style={{ overflow: "hidden" }}>
      <Box
        px="lg"
        py="sm"
        style={{
          borderBottom: "1px solid var(--mantine-color-gray-2)",
          borderLeft: `4px solid var(--mantine-color-${accentColor}-5)`,
        }}
      >
        <Group justify="space-between">
          <Title order={5} fw={700} c="dark.8">
            {title}
          </Title>
          <Badge color={accentColor} variant="light" size="sm">
            {events.length}
          </Badge>
        </Group>
      </Box>

      <Table.ScrollContainer minWidth={700}>
        <Table
          striped
          highlightOnHover
          verticalSpacing="sm"
          horizontalSpacing="lg"
          style={{ cursor: "pointer" }}
        >
          <Table.Thead>
            <Table.Tr style={{ background: "var(--mantine-color-gray-1)" }}>
              {[
                "ID",
                "Content",
                "Status",
                "Created",
                "Claimed by",
                "Claimed at",
                "Acknowledged",
              ].map((h) => (
                <Table.Th key={h}>
                  <Text size="xs" fw={700} tt="uppercase" c="dark.4">
                    {h}
                  </Text>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {events.map((event) => {
              const cfg = STATUS_CONFIG[event.status];
              const StatusIcon = cfg.icon;
              const isProcessing = processingEvents.has(event.id);

              return (
                <Table.Tr key={event.id} onClick={() => onRowClick(event)}>
                  <Table.Td>
                    <Text size="xs" ff="monospace" c="dark.3" fw={500}>
                      {event.id.slice(0, 8)}…
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ maxWidth: 280 }}>
                    <Text size="sm" fw={500} c="dark.7" lineClamp={1}>
                      {event.content}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {isProcessing ? (
                      <Badge
                        size="sm"
                        color="indigo"
                        variant="outline"
                        leftSection={<Loader size={10} color="indigo" />}
                      >
                        Processing...
                      </Badge>
                    ) : (
                      <Badge
                        size="sm"
                        color={cfg.color}
                        variant="light"
                        leftSection={<StatusIcon size={11} />}
                      >
                        {cfg.label}
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dark.3">
                      {formatDate(event.created_at)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dark.4">
                      {event.claimed_by ?? "—"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dark.3">
                      {formatDate(event.claimed_at)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dark.3">
                      {formatDate(event.acknowledged_at)}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Paper>
  );
}

// ── EventModal ────────────────────────────────────────────────────────────────

function EventModal({
  event,
  opened,
  onClose,
  userId,
  onActionStarted,
}: {
  event: AppEvent | null;
  opened: boolean;
  onClose: () => void;
  userId: string;
  onActionStarted: (eventId: string) => void;
}) {
  const [claiming, setClaiming] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!opened) {
      setActionError("");
      setClaiming(false);
      setAcknowledging(false);
    }
  }, [opened]);

  if (!event) return null;

  const cfg = STATUS_CONFIG[event.status];
  const StatusIcon = cfg.icon;

  const handleClaim = async () => {
    setClaiming(true);
    setActionError("");
    try {
      await apiClaimEvent(event.id, userId);
      onActionStarted(event.id);
      onClose();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to claim event");
      setClaiming(false);
    }
  };

  const handleAcknowledge = async () => {
    setAcknowledging(true);
    setActionError("");
    try {
      await apiAcknowledgeEvent(event.id, userId);
      onActionStarted(event.id);
      onClose();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Failed to acknowledge event",
      );
      setAcknowledging(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconAlertCircle size={18} color="var(--mantine-color-indigo-6)" />
          <Text fw={700} c="dark.8">
            Event Details
          </Text>
        </Group>
      }
      size="lg"
      radius="md"
    >
      <Stack gap="md">
        <Group>
          <Badge
            color={cfg.color}
            variant="light"
            size="md"
            leftSection={<StatusIcon size={12} />}
          >
            {cfg.label}
          </Badge>
          <Text size="xs" c="dark.3" ff="monospace">
            {event.id}
          </Text>
        </Group>

        <Paper
          withBorder
          radius="sm"
          p="md"
          style={{ background: "var(--mantine-color-gray-0)" }}
        >
          <Text fw={600} c="dark.8" size="sm" mb={6}>
            Incident Report
          </Text>
          <Text c="dark.7" size="sm" lh={1.7}>
            {event.content}
          </Text>
        </Paper>

        <Divider />

        <Stack gap="xs">
          <Text fw={600} c="dark.7" size="sm">
            Metadata
          </Text>
          <Group gap="xl" wrap="wrap">
            {[
              {
                icon: IconMapPin,
                label: "Region",
                value: event.region,
                color: "indigo",
              },
              {
                icon: IconCalendar,
                label: "Created",
                value: formatDate(event.created_at),
                color: "indigo",
              },
              {
                icon: IconClock,
                label: "Claimed at",
                value: formatDate(event.claimed_at),
                color: "orange",
              },
              {
                icon: IconCircleCheck,
                label: "Acknowledged",
                value: formatDate(event.acknowledged_at),
                color: "green",
              },
            ].map(({ icon: Icon, label, value, color }) => (
              <Box key={label}>
                <Group gap={4} mb={2}>
                  <Icon size={13} color={`var(--mantine-color-${color}-5)`} />
                  <Text size="xs" c="dark.3" tt="uppercase" fw={700}>
                    {label}
                  </Text>
                </Group>
                <Text size="sm" c="dark.7">
                  {value}
                </Text>
              </Box>
            ))}
          </Group>
          {event.claimed_by && (
            <Text size="xs" c="dark.3">
              Claimed by:{" "}
              <Text span fw={600} c="dark.6">
                {event.claimed_by}
              </Text>
            </Text>
          )}
        </Stack>

        {actionError && (
          <Alert
            icon={<IconAlertCircle size={14} />}
            color="red"
            variant="light"
          >
            {actionError}
          </Alert>
        )}

        <Group justify="flex-end" pt="xs">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
          <Button
            leftSection={<IconClock size={14} />}
            color="orange"
            variant="light"
            loading={claiming}
            disabled={event.status !== "available" || acknowledging}
            onClick={handleClaim}
          >
            Claim
          </Button>
          <Button
            leftSection={<IconCircleCheck size={14} />}
            color="green"
            loading={acknowledging}
            disabled={event.status === "acknowledged" || claiming}
            onClick={handleAcknowledge}
          >
            Acknowledge
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ── Dashboard page ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);

  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [wsConnected, setWsConnected] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);

  const [processingEvents, setProcessingEvents] = useState<Set<string>>(
    new Set(),
  );

  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  useEffect(() => {
    if (!isAuthenticated) router.replace("/");
  }, [isAuthenticated, router]);

  // ── Stable fetchEvents (region read from ref, not closure) ────────────────
  const regionRef = useRef(user?.region);
  regionRef.current = user?.region;

  const fetchEvents = useCallback(async (silent = false) => {
    const region = regionRef.current;
    if (!region) return;
    if (!silent) setLoading(true);
    setFetchError("");
    try {
      const data = await apiGetEvents(region);
      setEvents(data);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Failed to load events");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []); // stable — no deps, region comes from ref

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ── Socket: apply incremental updates ────────────────────────────────────
const handleEventUpdate = useCallback((msg: EventSocketMessage) => {
  // console.log("[WebSocket] Raw message:", JSON.stringify(msg));

  const safeId = msg.id?.trim();
  if (!safeId) {
    console.warn("[WebSocket] Message has no id, dropping");
    return;
  }

  setEvents((prev) => {
    const exists = prev.some((e) => e.id === safeId);
    // console.log(
    //   `[WebSocket] id=${safeId} exists=${exists} total=${prev.length}`,
    // );

    if (!exists) {
      console.warn(
        `[WebSocket] Event ${safeId} not found in state — won't update`,
      );
      if (msg.content && msg.created_at) {
        return [
          {
            id: safeId,
            content: msg.content,
            region: msg.region,
            status: msg.status,
            claimed_by: msg.claimed_by ?? null,
            claimed_at: msg.claimed_at ?? null,
            acknowledged_at: msg.acknowledged_at ?? null,
            created_at: msg.created_at,
          },
          ...prev,
        ];
      }
      return prev;
    }

    const isNowAvailable = msg.status === "available";
    return prev.map((e) => {
      if (e.id !== safeId) return e;
      return {
        ...e,
        status: msg.status,
        region: msg.region || e.region,
        claimed_by: isNowAvailable
          ? null
          : msg.claimed_by !== undefined
            ? msg.claimed_by
            : e.claimed_by,
        claimed_at: isNowAvailable
          ? null
          : msg.claimed_at !== undefined
            ? msg.claimed_at
            : e.claimed_at,
        acknowledged_at: isNowAvailable
          ? null
          : msg.acknowledged_at !== undefined
            ? msg.acknowledged_at
            : e.acknowledged_at,
      };
    });
  });

  setSelectedEvent((prev) => {
    if (!prev || prev.id !== safeId) return prev;
    const isNowAvailable = msg.status === "available";
    return {
      ...prev,
      status: msg.status,
      region: msg.region || prev.region,
      claimed_by: isNowAvailable
        ? null
        : msg.claimed_by !== undefined
          ? msg.claimed_by
          : prev.claimed_by,
      claimed_at: isNowAvailable
        ? null
        : msg.claimed_at !== undefined
          ? msg.claimed_at
          : prev.claimed_at,
      acknowledged_at: isNowAvailable
        ? null
        : msg.acknowledged_at !== undefined
          ? msg.acknowledged_at
          : prev.acknowledged_at,
      ...(msg.content ? { content: msg.content } : {}),
      ...(msg.created_at ? { created_at: msg.created_at } : {}),
    };
  });

  setProcessingEvents((prev) => {
    if (prev.has(safeId)) {
      const next = new Set(prev);
      next.delete(safeId);
      return next;
    }
    return prev;
  });
}, []);

  useEventSocket({
    region: user?.region ?? "",
    userId: user?.id ?? "",
    enabled: isAuthenticated,
    onEventUpdate: handleEventUpdate,
    onConnectionChange: setWsConnected,
  });

  const handleRowClick = (event: AppEvent) => {
    setSelectedEvent(event);
    openModal();
  };

  const handleActionStarted = (eventId: string) => {
    const safeId = eventId.trim();
    setProcessingEvents((prev) => new Set(prev).add(safeId));

    setTimeout(() => {
      setProcessingEvents((prev) => {
        if (prev.has(safeId)) {
          const next = new Set(prev);
          next.delete(safeId);
          return next;
        }
        return prev;
      });
    }, 10000);
  };

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

  const claimed = events.filter((e) => e.status === "claimed");
  const acknowledged = events.filter((e) => e.status === "acknowledged");
  const available = events.filter((e) => e.status === "available");

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
                Events Dashboard
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
              <Tooltip
                label={wsConnected ? "Live updates active" : "Reconnecting…"}
              >
                <ThemeIcon
                  size="sm"
                  variant="light"
                  color={wsConnected ? "green" : "gray"}
                  radius="xl"
                >
                  {wsConnected ? (
                    <IconWifi size={12} />
                  ) : (
                    <IconWifiOff size={12} />
                  )}
                </ThemeIcon>
              </Tooltip>

              <Tooltip label="Refresh events">
                <ActionIcon
                  variant="default"
                  size="lg"
                  aria-label="Refresh"
                  onClick={() => fetchEvents()}
                  loading={loading}
                >
                  <IconRefresh size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          {/* Summary strip */}
          <Group gap="md">
            {[
              { label: "Total", value: events.length, color: "indigo" },
              { label: "Available", value: available.length, color: "blue" },
              { label: "Claimed", value: claimed.length, color: "orange" },
              {
                label: "Acknowledged",
                value: acknowledged.length,
                color: "green",
              },
            ].map((s) => (
              <Paper
                key={s.label}
                withBorder
                radius="md"
                px="lg"
                py="sm"
                style={{ minWidth: 110 }}
              >
                <Text
                  size="xs"
                  c={`${s.color}.6`}
                  tt="uppercase"
                  fw={700}
                  mb={2}
                >
                  {s.label}
                </Text>
                <Text size="xl" fw={800} c="dark.8">
                  {s.value}
                </Text>
              </Paper>
            ))}
          </Group>

          {fetchError && (
            <Alert
              icon={<IconAlertCircle size={14} />}
              color="red"
              variant="light"
            >
              {fetchError}
            </Alert>
          )}

          {loading ? (
            <Box
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "3rem",
              }}
            >
              <Loader color="indigo" />
            </Box>
          ) : (
            <>
              <EventsTable
                title="Claimed Events"
                events={claimed}
                accentColor="orange"
                processingEvents={processingEvents}
                onRowClick={handleRowClick}
              />
              <EventsTable
                title="Acknowledged Events"
                events={acknowledged}
                accentColor="green"
                processingEvents={processingEvents}
                onRowClick={handleRowClick}
              />
              <EventsTable
                title="Available Events"
                events={available}
                accentColor="blue"
                processingEvents={processingEvents}
                onRowClick={handleRowClick}
              />

              {events.length === 0 && !fetchError && (
                <Box style={{ textAlign: "center", padding: "3rem" }}>
                  <Text c="dark.3">No events found for {user.region}.</Text>
                </Box>
              )}
            </>
          )}
        </Stack>
      </Container>

      <EventModal
        event={selectedEvent}
        opened={modalOpened}
        onClose={closeModal}
        userId={user.id}
        onActionStarted={handleActionStarted}
      />

      {processingEvents.size > 0 && (
        <Affix position={{ bottom: 20, right: 20 }}>
          <Stack gap="xs">
            {Array.from(processingEvents).map((id) => (
              <Alert
                key={id}
                icon={<Loader size={14} color="indigo" />}
                title="Processing Request..."
                color="indigo"
                variant="light"
                withCloseButton
                onClose={() => {
                  setProcessingEvents((prev) => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                  });
                }}
                style={{
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  background: "rgba(238, 242, 255, 0.5)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  border: "1px solid var(--mantine-color-indigo-2)",
                }}
              >
                <Text size="xs">
                  Event{" "}
                  <Text span fw={700} ff="monospace">
                    {id.slice(0, 8)}
                  </Text>{" "}
                  is being processed in the background. This will update
                  automatically.
                </Text>
              </Alert>
            ))}
          </Stack>
        </Affix>
      )}
    </Box>
  );
}
