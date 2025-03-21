"use client";

import { getDashboardTickets } from "@/actions/get";
import LoadingStateProtected from "@/components/LoadingStateProtected";
import { useUserStore } from "@/stores/userStore";
import { DashboardTicketType } from "@/utils/types";
import {
  ActionIcon,
  Box,
  Button,
  Flex,
  Grid,
  Group,
  Paper,
  rem,
  Stack,
  Text,
  Title,
  Tooltip,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconArrowRight,
  IconCheck,
  IconChevronRight,
  IconClockHour4,
  IconRefresh,
  IconTicket,
} from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const DashboardPage = () => {
  const { colorScheme } = useMantineColorScheme();

  const { user } = useUserStore();

  const [tickets, setTickets] = useState<DashboardTicketType[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.user_role === "ADMIN";

  const ticketStats = {
    open: countUserTicketsByStatus(tickets, "OPEN"),
    completed: countUserTicketsByStatus(tickets, "COMPLETED"),
    total: tickets.length,
  };

  const completionRate =
    ticketStats.total > 0
      ? Math.round((ticketStats.completed / ticketStats.total) * 100)
      : 0;

  function countUserTicketsByStatus(
    tickets: DashboardTicketType[],
    statusType: "OPEN" | "COMPLETED"
  ) {
    if (statusType === "OPEN") {
      return tickets.filter(
        (ticket) =>
          ticket.ticket_status === "FOR CANVASS" ||
          ticket.ticket_status === "WORK IN PROGRESS"
      ).length;
    }

    if (statusType === "COMPLETED") {
      return tickets.filter((ticket) => ticket.ticket_status === "COMPLETED")
        .length;
    }

    return 0;
  }

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await getDashboardTickets(
        isAdmin ? undefined : user?.user_id
      );
      setTickets(data ?? []);
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [isAdmin, user?.user_id]);

  if (!user || loading) {
    return <LoadingStateProtected />;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "FOR CANVASS":
        return "yellow";
      case "WORK IN PROGRESS":
        return "blue";
      case "COMPLETED":
        return "green";
      default:
        return "gray";
    }
  };

  return (
    <Box p={{ base: "md", sm: "xl" }}>
      <Flex justify="space-between" align="center" mb="xl">
        <Stack gap={2}>
          <Title order={2} fw={600}>
            Welcome back, {user.user_full_name}
          </Title>
          <Text c="dimmed" size="sm">
            Here's what's happening with your tickets today
          </Text>
        </Stack>
        <Tooltip label="Refresh data">
          <ActionIcon
            variant="subtle"
            size="lg"
            radius="md"
            onClick={fetchTickets}
          >
            <IconRefresh style={{ width: rem(18), height: rem(18) }} />
          </ActionIcon>
        </Tooltip>
      </Flex>

      <Grid gutter="lg" mb="xl">
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper
            shadow="xs"
            p="lg"
            radius="md"
            style={(theme) => ({
              backgroundColor:
                colorScheme === "dark" ? theme.colors.dark[6] : theme.white,
              border: `1px solid ${
                colorScheme === "dark"
                  ? theme.colors.dark[4]
                  : theme.colors.gray[2]
              }`,
            })}
          >
            <Group gap="xs" mb="xs">
              <IconClockHour4
                style={{
                  width: rem(20),
                  height: rem(20),
                  color: "var(--mantine-color-blue-5)",
                }}
              />
              <Text size="sm" fw={500} c="dimmed">
                Open Tickets
              </Text>
            </Group>
            <Text fz={32} fw={600}>
              {ticketStats.open}
            </Text>
            <Text c="dimmed" size="sm" mt={4}>
              Tickets Pending Action
            </Text>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper
            shadow="xs"
            p="lg"
            radius="md"
            style={(theme) => ({
              backgroundColor:
                colorScheme === "dark" ? theme.colors.dark[6] : theme.white,
              border: `1px solid ${
                colorScheme === "dark"
                  ? theme.colors.dark[4]
                  : theme.colors.gray[2]
              }`,
            })}
          >
            <Group gap="xs" mb="xs">
              <IconCheck
                style={{
                  width: rem(20),
                  height: rem(20),
                  color: "var(--mantine-color-green-5)",
                }}
              />
              <Text size="sm" fw={500} c="dimmed">
                Completed
              </Text>
            </Group>
            <Text fz={32} fw={600}>
              {ticketStats.completed}
            </Text>
            <Text c="dimmed" size="sm" mt={4}>
              Tickets Resolved
            </Text>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper
            shadow="xs"
            p="lg"
            radius="md"
            style={(theme) => ({
              backgroundColor:
                colorScheme === "dark" ? theme.colors.dark[6] : theme.white,
              border: `1px solid ${
                colorScheme === "dark"
                  ? theme.colors.dark[4]
                  : theme.colors.gray[2]
              }`,
            })}
          >
            <Group gap="xs" mb="xs">
              <IconTicket
                style={{
                  width: rem(20),
                  height: rem(20),
                  color: "var(--mantine-color-violet-5)",
                }}
              />
              <Text size="sm" fw={500} c="dimmed">
                Total Tickets
              </Text>
            </Group>
            <Text fz={32} fw={600}>
              {ticketStats.total}
            </Text>
            <Text c="dimmed" size="sm" mt={4}>
              {completionRate}% Completion Rate
            </Text>
          </Paper>
        </Grid.Col>
      </Grid>

      <Box mt={70}>
        <Group justify="space-between" mb="lg">
          <Stack gap={2}>
            <Title order={3} fw={600}>
              {isAdmin && "Recent Tickets"}
              {user?.user_role === "PURCHASER" && "Your Open Tickets"}
              {user?.user_role === "REVIEWER" && "Tickets to Review"}
            </Title>
          </Stack>
          <Button
            component={Link}
            href="/tickets"
            size="sm"
            rightSection={
              <IconArrowRight style={{ width: rem(16), height: rem(16) }} />
            }
          >
            View All Tickets
          </Button>
        </Group>

        <Paper
          shadow="xs"
          style={(theme) => ({
            backgroundColor:
              colorScheme === "dark" ? theme.colors.dark[6] : theme.white,
            border: `1px solid ${
              colorScheme === "dark"
                ? theme.colors.dark[4]
                : theme.colors.gray[2]
            }`,
          })}
        >
          {tickets.length === 0 ? (
            <Stack align="center" py="xl" gap="md">
              <IconTicket size={48} style={{ opacity: 0.3 }} />
              <Text c="dimmed">No tickets found</Text>
            </Stack>
          ) : (
            <Box>
              {tickets.slice(0, 5).map((ticket, index) => (
                <Box // Changed from Paper to Box
                  key={ticket.ticket_id}
                  p="md"
                  style={(theme) => ({
                    borderRadius: 0,
                    backgroundColor: "transparent",
                    borderBottom:
                      index !== tickets.length - 1
                        ? `1px solid ${
                            colorScheme === "dark"
                              ? theme.colors.dark[4]
                              : theme.colors.gray[2]
                          }`
                        : "none",
                  })}
                >
                  <Group align="center" justify="space-between" wrap="nowrap">
                    <Group wrap="nowrap" style={{ flex: 1 }}>
                      <Box
                        style={(theme) => ({
                          width: rem(8),
                          height: rem(8),
                          borderRadius: "50%",
                          backgroundColor:
                            theme.colors[getStatusColor(ticket.ticket_status)][
                              colorScheme === "dark" ? 4 : 6
                            ],
                        })}
                      />
                      <Stack gap={4} style={{ flex: 1 }}>
                        <Text fw={500} size="sm" lineClamp={1}>
                          {ticket.ticket_item_description}
                        </Text>
                        <Group gap="xs">
                          <Text size="xs" c="dimmed">
                            ID: #{ticket.ticket_id}
                          </Text>
                          <Text size="xs" c="dimmed">
                            •
                          </Text>
                          <Text
                            size="xs"
                            c={getStatusColor(ticket.ticket_status)}
                            fw={500}
                          >
                            {ticket.ticket_status}
                          </Text>
                        </Group>
                      </Stack>
                    </Group>
                    <Button
                      component={Link}
                      href={`/tickets/${ticket.ticket_id}`}
                      variant="subtle"
                      size="xs"
                      style={(theme) => ({
                        color:
                          theme.colors[theme.primaryColor][
                            colorScheme === "dark" ? 4 : 6
                          ],
                      })}
                      rightSection={
                        <IconChevronRight
                          style={{
                            width: rem(14),
                            height: rem(14),
                          }}
                        />
                      }
                    >
                      View
                    </Button>
                  </Group>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default DashboardPage;
