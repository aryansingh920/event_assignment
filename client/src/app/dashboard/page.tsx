"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Affix,
  Alert,
  Badge,
  Box,
  Container,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
  Tooltip,
  ActionIcon,
  ThemeIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconRefresh,
  IconWifi,
  IconWifiOff,
} from "@tabler/icons-react";
import DashboardNavbar from "@/components/DashboardNavbar";
import { useAppSelector } from "@/store/hooks";
import { apiGetEvents, Event as AppEvent } from "@/lib/api";
import { useEventSocket } from "@/hooks/useEventSocket";
import { EventSocketMessage } from "@/lib/socket";
import EventsTable from "@/components/EventsTable";
import EventModal from "@/components/EvenModal";

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
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleEventUpdate = useCallback((msg: EventSocketMessage) => {
    const safeId = msg.id?.trim();
    if (!safeId) {
      console.warn("[WebSocket] Message has no id, dropping");
      return;
    }

    setEvents((prev) => {
      const exists = prev.some((e) => e.id === safeId);
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
      if (!prev.has(safeId)) return prev;
      const next = new Set(prev);
      next.delete(safeId);
      return next;
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
        if (!prev.has(safeId)) return prev;
        const next = new Set(prev);
        next.delete(safeId);
        return next;
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

  // Single pass — split events into buckets once
  const available: AppEvent[] = [];
  const claimed: AppEvent[] = [];
  const acknowledged: AppEvent[] = [];

  for (const e of events) {
    if (e.status === "available") available.push(e);
    else if (e.status === "claimed") claimed.push(e);
    else if (e.status === "acknowledged") acknowledged.push(e);
  }

  // Claimed rows visible to this user — derived once here, passed straight to the table
  const visibleClaimed = claimed.filter((e) => e.claimed_by === user.id);

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
                title="Acknowledged Events"
                status="acknowledged"
                events={acknowledged}
                totalCount={acknowledged.length}
                accentColor="green"
                processingEvents={processingEvents}
                onRowClick={handleRowClick}
              />
              <EventsTable
                title="Claimed Events"
                status="claimed"
                events={visibleClaimed}
                totalCount={claimed.length}
                accentColor="orange"
                processingEvents={processingEvents}
                onRowClick={handleRowClick}
              />
              <EventsTable
                title="Available Events"
                status="available"
                events={available}
                totalCount={available.length}
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
