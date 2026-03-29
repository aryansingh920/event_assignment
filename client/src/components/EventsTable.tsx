import {
  Badge,
  Box,
  Group,
  Loader,
  Paper,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { Event as AppEvent } from "@/lib/api";

import { STATUS_CONFIG } from "@/config/config";
import { formatDate } from "@/components/EvenModal";
import { useEffect, useState } from "react";

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
        size="xs"
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

type EventStatus = "available" | "claimed" | "acknowledged";

const COLUMNS: Record<EventStatus, string[]> = {
  available: ["ID", "Content", "Status", "Created"],
  claimed: ["ID", "Content", "Status", "Created", "Expires in"],
  acknowledged: ["ID", "Content", "Status", "Created", "Acknowledged"],
};

export default function EventsTable({
  title,
  status,
  events,
  totalCount,
  accentColor,
  processingEvents,
  onRowClick,
}: {
  title: string;
  status: EventStatus;
  events: AppEvent[]; // already filtered to what this user should see
  totalCount: number; // raw count for the badge (e.g. all claimed, not just mine)
  accentColor: string;
  processingEvents: Set<string>;
  onRowClick: (e: AppEvent) => void;
}) {
  if (totalCount === 0) return null;

  const columns = COLUMNS[status];
  const hasRows = events.length > 0;

  return (
    <Paper withBorder shadow="xs" radius="md" style={{ overflow: "hidden" }}>
      <Box
        px="lg"
        py="sm"
        style={{
          borderBottom: hasRows
            ? "1px solid var(--mantine-color-gray-2)"
            : undefined,
          borderLeft: `4px solid var(--mantine-color-${accentColor}-5)`,
        }}
      >
        <Group justify="space-between">
          <Title order={5} fw={700} c="dark.8">
            {title}
          </Title>
          <Badge color={accentColor} variant="light" size="sm">
            {totalCount}
          </Badge>
        </Group>
      </Box>

      {hasRows && (
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
                {columns.map((h) => (
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

                    {status === "claimed" && (
                      <Table.Td>
                        {event.claimed_at ? (
                          <CountdownTimer claimedAt={event.claimed_at} />
                        ) : (
                          <Text size="xs" c="dark.3">
                            —
                          </Text>
                        )}
                      </Table.Td>
                    )}

                    {status === "acknowledged" && (
                      <Table.Td>
                        <Text size="xs" c="dark.3">
                          {formatDate(event.acknowledged_at)}
                        </Text>
                      </Table.Td>
                    )}
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Paper>
  );
}
