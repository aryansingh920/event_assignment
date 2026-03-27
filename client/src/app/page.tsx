"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Loader,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconAlertCircle, IconLogin } from "@tabler/icons-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { login } from "@/store/authSlice";
import { saveSession } from "@/store/session";
import { apiLogin, apiGetRegions } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [regionsError, setRegionsError] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  // Fetch regions on mount
  useEffect(() => {
    apiGetRegions()
      .then(setRegions)
      .catch(() => setRegionsError("Could not load regions. Please refresh."))
      .finally(() => setRegionsLoading(false));
  }, []);

  const form = useForm({
    initialValues: { userId: "", region: "" },
    validate: {
      userId: (v) => (v.trim().length < 1 ? "User ID is required" : null),
      region: (v) => (!v ? "Please select a region" : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setSubmitting(true);
    setError("");
    try {
      const user = await apiLogin({
        userId: values.userId.trim(),
        region: values.region,
      });

      // Persist to Redux store + sessionStorage
      dispatch(login(user));
      saveSession(user);

      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #f0f9ff 100%)",
        padding: "1rem",
      }}
    >
      <Paper
        shadow="xl"
        radius="lg"
        p="xl"
        style={{ width: "100%", maxWidth: 420 }}
        withBorder
      >
        <Stack gap="lg">
          {/* Header */}
          <Stack gap={4} align="center">
            <Box
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "var(--mantine-color-indigo-6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4,
              }}
            >
              <IconLogin size={26} color="white" />
            </Box>
            <Title order={2} ta="center" c="indigo.8">
              Welcome back
            </Title>
            <Text c="dark.3" size="sm" ta="center">
              Sign in to access your dashboard
            </Text>
          </Stack>

          {/* Errors */}
          {error && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="red"
              variant="light"
            >
              {error}
            </Alert>
          )}
          {regionsError && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="orange"
              variant="light"
            >
              {regionsError}
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <TextInput
                label="User ID"
                placeholder="e.g. USR-00123"
                required
                {...form.getInputProps("userId")}
              />

              <Select
                styles={{
                  label: {
                    color: "var(--mantine-color-black)",
                    fontWeight: 600,
                  },
                  input: { color: "var(--mantine-color-gray-9)" },
                  option: { color: "var(--mantine-color-indigo-9)" }, // Colors text in the dropdown list
                }}
                label="Region"
                placeholder={
                  regionsLoading ? "Loading regions…" : "Select your region"
                }
                data={regions}
                required
                disabled={regionsLoading || !!regionsError}
                rightSection={regionsLoading ? <Loader size={14} /> : undefined}
                {...form.getInputProps("region")}
              />

              <Button
                type="submit"
                fullWidth
                size="md"
                mt="xs"
                loading={submitting}
                disabled={regionsLoading}
                color="indigo"
              >
                Sign In
              </Button>
            </Stack>
          </form>

          <Text size="xs" c="dark.2" ta="center">
            Your session expires when you close the browser.
          </Text>
        </Stack>
      </Paper>
    </Box>
  );
}
