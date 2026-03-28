"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
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
  // ThemeIcon,
  Title,
  Tooltip,
  ActionIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconCalendar,
  IconCircleCheck,
  IconCircleDot,
  IconClock,
  IconHourglass,
  IconMapPin,
  IconRefresh,
} from "@tabler/icons-react";
import DashboardNavbar from "@/components/DashboardNavbar";
import { useAppSelector } from "@/store/hooks";
import {
  apiGetEvents,
  apiClaimEvent,
  apiAcknowledgeEvent,
  Event,
} from "@/lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Event["status"],
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

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// Poll the events API until `predicate` is true for the target event,
// or until maxAttempts is reached. Returns the final events list.
// async function pollUntil(
//   region: string,
//   eventId: string,
//   predicate: (e: Event) => boolean,
//   intervalMs = 1500,
//   maxAttempts = 8,
// ): Promise<Event[]> {
//   const { apiGetEvents } = await import("@/lib/api");
//   for (let i = 0; i < maxAttempts; i++) {
//     await new Promise((r) => setTimeout(r, intervalMs));
//     const events = await apiGetEvents(region);
//     const target = events.find((e) => e.id === eventId);
//     if (target && predicate(target)) return events;
//   }
//   // Return whatever the last fetch gave us
//   return apiGetEvents(region);
// }

// ── Shared events table ───────────────────────────────────────────────────────

function EventsTable({
  title,
  events,
  accentColor,
  pendingIds,
  onRowClick,
}: {
  title: string;
  events: Event[];
  accentColor: string;
  pendingIds: Set<string>;
  onRowClick: (e: Event) => void;
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
              <Table.Th>
                <Text size="xs" fw={700} tt="uppercase" c="dark.4">
                  ID
                </Text>
              </Table.Th>
              <Table.Th>
                <Text size="xs" fw={700} tt="uppercase" c="dark.4">
                  Content
                </Text>
              </Table.Th>
              <Table.Th>
                <Text size="xs" fw={700} tt="uppercase" c="dark.4">
                  Status
                </Text>
              </Table.Th>
              <Table.Th>
                <Text size="xs" fw={700} tt="uppercase" c="dark.4">
                  Created
                </Text>
              </Table.Th>
              <Table.Th>
                <Text size="xs" fw={700} tt="uppercase" c="dark.4">
                  Claimed by
                </Text>
              </Table.Th>
              <Table.Th>
                <Text size="xs" fw={700} tt="uppercase" c="dark.4">
                  Claimed at
                </Text>
              </Table.Th>
              <Table.Th>
                <Text size="xs" fw={700} tt="uppercase" c="dark.4">
                  Acknowledged
                </Text>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {events.map((event) => {
              const cfg = STATUS_CONFIG[event.status];
              const StatusIcon = cfg.icon;
              const isPending = pendingIds.has(event.id);
              return (
                <Table.Tr
                  key={event.id}
                  onClick={() => !isPending && onRowClick(event)}
                  style={{ opacity: isPending ? 0.6 : 1 }}
                >
                  <Table.Td>
                    <Group gap={4}>
                      {isPending && <Loader size={10} color="orange" />}
                      <Text size="xs" ff="monospace" c="dark.3" fw={500}>
                        {event.id.slice(0, 8)}…
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td style={{ maxWidth: 280 }}>
                    <Text size="sm" fw={500} c="dark.7" lineClamp={1}>
                      {event.content}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {isPending ? (
                      <Badge
                        size="sm"
                        color="yellow"
                        variant="light"
                        leftSection={<IconHourglass size={11} />}
                      >
                        Processing…
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

// ── Event detail modal ────────────────────────────────────────────────────────

function EventModal({
  event,
  opened,
  onClose,
  onClaimStart,
  onAcknowledgeStart,
  userId,
}: {
  event: Event | null;
  opened: boolean;
  onClose: () => void;
  onClaimStart: (eventId: string) => void;
  onAcknowledgeStart: (eventId: string) => void;
  userId: string;
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
      onClaimStart(event.id); // hand off polling to parent, close modal
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
      onAcknowledgeStart(event.id); // hand off polling to parent, close modal
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

        <Stack gap={4}>
          <Text fw={600} c="dark.7" size="sm">
            Assessment
          </Text>
          <Text size="sm" c="dark.5" lh={1.8}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur.
          </Text>
          <Text size="sm" c="dark.5" lh={1.8}>
            Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
            officia deserunt mollit anim id est laborum. Curabitur pretium
            tincidunt lacus. Nulla gravida orci a odio, et tempus feugiat.
          </Text>
        </Stack>

        <Divider />

        <Stack gap="xs">
          <Text fw={600} c="dark.7" size="sm">
            Metadata
          </Text>
          <Group gap="xl" wrap="wrap">
            <Box>
              <Group gap={4} mb={2}>
                <IconMapPin size={13} color="var(--mantine-color-indigo-5)" />
                <Text size="xs" c="dark.3" tt="uppercase" fw={700}>
                  Region
                </Text>
              </Group>
              <Text size="sm" c="dark.7">
                {event.region}
              </Text>
            </Box>
            <Box>
              <Group gap={4} mb={2}>
                <IconCalendar size={13} color="var(--mantine-color-indigo-5)" />
                <Text size="xs" c="dark.3" tt="uppercase" fw={700}>
                  Created
                </Text>
              </Group>
              <Text size="sm" c="dark.7">
                {formatDate(event.created_at)}
              </Text>
            </Box>
            <Box>
              <Group gap={4} mb={2}>
                <IconClock size={13} color="var(--mantine-color-orange-5)" />
                <Text size="xs" c="dark.3" tt="uppercase" fw={700}>
                  Claimed at
                </Text>
              </Group>
              <Text size="sm" c="dark.7">
                {formatDate(event.claimed_at)}
              </Text>
            </Box>
            <Box>
              <Group gap={4} mb={2}>
                <IconCircleCheck
                  size={13}
                  color="var(--mantine-color-green-6)"
                />
                <Text size="xs" c="dark.3" tt="uppercase" fw={700}>
                  Acknowledged
                </Text>
              </Group>
              <Text size="sm" c="dark.7">
                {formatDate(event.acknowledged_at)}
              </Text>
            </Box>
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

        {/* Pipeline note */}
        <Alert
          icon={<IconHourglass size={14} />}
          color="blue"
          variant="light"
          styles={{ message: { fontSize: 12 } }}
        >
          After claiming or acknowledging, the event goes through a Kafka
          pipeline. Status updates may take a few seconds to reflect.
        </Alert>

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

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  // Track event IDs that are awaiting pipeline confirmation
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const pollingRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    if (!isAuthenticated) router.replace("/");
  }, [isAuthenticated, router]);

  const fetchEvents = useCallback(
    async (silent = false) => {
      if (!user?.region) return;
      if (!silent) setLoading(true);
      setFetchError("");
      try {
        const data = await apiGetEvents(user.region);
        setEvents(data);
        return data;
      } catch (e) {
        setFetchError(e instanceof Error ? e.message : "Failed to load events");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [user?.region],
  );

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Poll silently until the event changes to the expected status
  const startPolling = useCallback(
    (eventId: string, expectedStatus: Event["status"]) => {
      // Mark as pending immediately
      setPendingIds((prev) => new Set(prev).add(eventId));

      let attempts = 0;
      const maxAttempts = 10;
      const intervalMs = 1800;

      const tick = async () => {
        attempts++;
        try {
          const data = await apiGetEvents(user!.region);
          setEvents(data);
          const updated = data.find((e) => e.id === eventId);
          if (updated && updated.status === expectedStatus) {
            // Confirmed — remove from pending
            setPendingIds((prev) => {
              const next = new Set(prev);
              next.delete(eventId);
              return next;
            });
            pollingRef.current.delete(eventId);
            return;
          }
        } catch {
          /* silent */
        }

        if (attempts >= maxAttempts) {
          // Give up polling, remove pending indicator
          setPendingIds((prev) => {
            const next = new Set(prev);
            next.delete(eventId);
            return next;
          });
          pollingRef.current.delete(eventId);
          return;
        }

        // Schedule next tick
        const t = setTimeout(tick, intervalMs);
        pollingRef.current.set(eventId, t);
      };

      // First poll after a short delay (give Kafka pipeline a head start)
      const t = setTimeout(tick, intervalMs);
      pollingRef.current.set(eventId, t);
    },
    [user],
  );

  // Clean up any in-flight timers on unmount
  useEffect(() => {
    return () => {
      pollingRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const handleRowClick = (event: Event) => {
    setSelectedEvent(event);
    openModal();
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
              {pendingIds.size > 0 && (
                <Group gap={6}>
                  <Loader size={14} color="orange" />
                  <Text size="xs" c="orange.6" fw={500}>
                    {pendingIds.size} event{pendingIds.size > 1 ? "s" : ""}{" "}
                    processing…
                  </Text>
                </Group>
              )}
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
                pendingIds={pendingIds}
                onRowClick={handleRowClick}
              />
              <EventsTable
                title="Acknowledged Events"
                events={acknowledged}
                accentColor="green"
                pendingIds={pendingIds}
                onRowClick={handleRowClick}
              />
              <EventsTable
                title="Available Events"
                events={available}
                accentColor="blue"
                pendingIds={pendingIds}
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
        onClaimStart={(id) => startPolling(id, "claimed")}
        onAcknowledgeStart={(id) => startPolling(id, "acknowledged")}
        userId={user.id}
      />
    </Box>
  );
}
