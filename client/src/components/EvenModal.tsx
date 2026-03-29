import { useEffect, useState } from "react";

import {
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
} from "@mantine/core";

import {
  IconAlertCircle,
  IconCalendar,
  IconCircleCheck,
  IconClock,
  IconMapPin,
} from "@tabler/icons-react";

import {
  apiClaimEvent,
  apiAcknowledgeEvent,
  Event as AppEvent,
} from "@/lib/api";
import { STATUS_CONFIG } from "@/config/config";

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const CLAIM_DURATION_MS = 15 * 60 * 1000;

function CountdownTimer({ claimedAt }: { claimedAt: string }) {
  const [remaining, setRemaining] = useState<number>(() => {
    const elapsed = Date.now() - new Date(claimedAt).getTime();
    return Math.max(0, CLAIM_DURATION_MS - elapsed);
  });

  useEffect(() => {
    if (remaining === 0) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - new Date(claimedAt).getTime();
      const left = Math.max(0, CLAIM_DURATION_MS - elapsed);
      setRemaining(left);
      if (left === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [claimedAt]);

  if (remaining === 0) {
    return (
      <Badge size="sm" color="gray" variant="outline">
        Expired
      </Badge>
    );
  }

  const totalSecs = Math.ceil(remaining / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const pct = remaining / CLAIM_DURATION_MS;
  const isUrgent = pct < 0.2;
  const isWarning = pct < 0.5;
  const color = isUrgent ? "red" : isWarning ? "orange" : "blue";

  return (
    <Group gap={6} wrap="nowrap">
      <svg width="28" height="28" viewBox="0 0 28 28" style={{ flexShrink: 0 }}>
        <circle
          cx="14"
          cy="14"
          r="11"
          fill="none"
          stroke="var(--mantine-color-gray-2)"
          strokeWidth="2.5"
        />
        <circle
          cx="14"
          cy="14"
          r="11"
          fill="none"
          stroke={`var(--mantine-color-${color}-5)`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 11}`}
          strokeDashoffset={`${2 * Math.PI * 11 * (1 - pct)}`}
          transform="rotate(-90 14 14)"
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
        />
      </svg>
      <Text
        size="sm"
        fw={600}
        ff="monospace"
        c={isUrgent ? "red.6" : isWarning ? "orange.6" : "blue.6"}
        style={{ transition: "color 0.5s" }}
      >
        {mins}:{String(secs).padStart(2, "0")}
      </Text>
    </Group>
  );
}

export default function EventModal({
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
  const isClaimed = event.status === "claimed";

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
          <hr />
          <Text c="dark.7" size="sm" lh={1.7}>
            {event.content}
          </Text>

          <Text c="dark.2" size="xs" lh={1}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum
            vestibulum nibh in velit ultricies, et malesuada mi tempus. Duis
            auctor consequat enim a pharetra. Donec varius tincidunt porttitor.
            Mauris gravida volutpat nibh, at bibendum felis rhoncus nec. Nam
            tincidunt ligula eros, id tincidunt diam condimentum tincidunt. In
            rutrum turpis sagittis, luctus felis hendrerit, consequat tellus.
            Proin eleifend arcu eu ipsum tempus, sed aliquam ipsum condimentum.
            Cras id lorem vel tortor faucibus gravida vitae a justo.
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

            {isClaimed && event.claimed_at && (
              <Box>
                <Group gap={4} mb={2}>
                  <IconClock size={13} color="var(--mantine-color-orange-5)" />
                  <Text size="xs" c="dark.3" tt="uppercase" fw={700}>
                    Expires in
                  </Text>
                </Group>
                <CountdownTimer claimedAt={event.claimed_at} />
              </Box>
            )}
          </Group>
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
            leftSection={
              event.status === "acknowledged" && <IconCircleCheck size={14} />
            }
            color="green"
            loading={acknowledging}
            disabled={
              event.status === "acknowledged" ||
              claiming ||
              event.status === "available"
            }
            onClick={handleAcknowledge}
          >
            Acknowledge
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
