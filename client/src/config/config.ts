"use client";
import {
  IconCircleCheck,
  IconCircleDot,
  IconClock,
} from "@tabler/icons-react";

import {
  Event as AppEvent,
} from "@/lib/api";



export const STATUS_CONFIG: Record<
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
