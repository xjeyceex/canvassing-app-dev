"use client";

import { getUsers } from "@/actions/get";
import PageHeader from "@/components/PageHeader";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Input,
  Mark,
  SimpleGrid,
  Skeleton,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheckbox,
  IconSearch,
  IconTicket,
  IconUser,
} from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export type UserType = {
  user_id: string;
  user_role: string;
  user_name: string;
  user_email: string;
  user_avatar: string;
  user_updated_at: string;
  user_created_at: string;
  ticket_count: number;
  revised_ticket_count: number;
  tickets_revised_by_user_count: number;
  tickets_reviewed_by_user_count: number;
};

const roleColors: Record<string, string> = {
  admin: "red",
  manager: "blue",
  editor: "teal",
  user: "gray",
  reviewer: "orange",
};

const UsersPage = () => {
  const theme = useMantineTheme();

  const [users, setUsers] = useState<UserType[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");

  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.xs})`);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const result = await getUsers();

        if (result.error) {
          notifications.show({
            title: "Error",
            message: result.message,
            color: "red",
            icon: <IconAlertCircle size={16} />,
          });
          return;
        }

        if (isMounted) {
          setUsers(result?.users || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        notifications.show({
          title: "Error",
          message: "Failed to fetch users",
          color: "red",
          icon: <IconAlertCircle size={16} />,
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredUsers = users?.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.user_name.toLowerCase().includes(query) ||
      user.user_email.toLowerCase().includes(query)
    );
  });

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim() || !text) return text;

    const regex = new RegExp(`(${query.trim()})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) =>
      part.toLowerCase() === query.trim().toLowerCase() ? (
        <Mark
          key={index}
          style={{
            backgroundColor: "#FFF3BF",
            borderRadius: 2,
            padding: "0 2px",
          }}
        >
          {part}
        </Mark>
      ) : (
        part
      )
    );
  };

  if (loading || !users) {
    return (
      <Box p="md">
        <Skeleton height={40} mb="xl" width="200px" />
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {[...Array(6)].map((_, i) => (
            <Card key={i} withBorder padding="lg" radius="md">
              <Group mb="md">
                <Skeleton circle height={50} />
                <Skeleton height={20} width="100px" />
              </Group>
              <Skeleton height={16} width="80%" mb="xs" />
              <Skeleton height={16} width="60%" mb="xs" />
              <Skeleton height={16} width="40%" mb="md" />
              <Skeleton height={36} radius="sm" />
            </Card>
          ))}
        </SimpleGrid>
      </Box>
    );
  }

  if (!filteredUsers || filteredUsers.length === 0) {
    return (
      <Box p="md">
        <Title order={2} mb="md">
          Users
        </Title>

        <Input
          placeholder="Search tickets..."
          mb="md"
          size={isMobile ? "sm" : "md"}
          leftSection={<IconSearch size={isMobile ? 16 : 18} stroke={1.5} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
        />

        <Card withBorder>
          <Text c="dimmed" ta="center" py="xl">
            No users found for <strong>{searchQuery}</strong>
          </Text>
        </Card>
      </Box>
    );
  }

  const breadcrumbs = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Users", href: "/users" },
  ];

  return (
    <Box p="md">
      <PageHeader title="Users" breadcrumbs={breadcrumbs} />

      <Input
        placeholder="Search users..."
        mb="md"
        size={isMobile ? "sm" : "md"}
        leftSection={<IconSearch size={isMobile ? 16 : 18} stroke={1.5} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.currentTarget.value)}
      />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {users
          .filter((user) =>
            [user.user_name, user.user_email]
              .join(" ")
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
          )
          .sort((b, a) => {
            const roleOrder = ["admin", "manager", "reviewer", "purchaser"]; // Adjust roles as needed
            return (
              roleOrder.indexOf(a.user_role.toLowerCase()) -
              roleOrder.indexOf(b.user_role.toLowerCase())
            );
          })
          .map((user) => (
            <Card
              key={user.user_id}
              withBorder
              padding="lg"
              radius="md"
              style={{
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                },
              }}
            >
              <Group mb="md" wrap="nowrap">
                <Avatar
                  src={user.user_avatar}
                  alt={user.user_name}
                  size="lg"
                  radius="xl"
                />
                <Box style={{ flex: 1, overflow: "hidden" }}>
                  <Text size="lg" fw={600} truncate>
                    {highlightMatch(user.user_name, searchQuery)}
                  </Text>
                  <Text size="sm" c="dimmed" truncate>
                    {highlightMatch(user.user_email, searchQuery)}
                  </Text>
                </Box>
              </Group>

              <Group justify="space-between" mb="sm">
                <Badge
                  color={roleColors[user.user_role.toLowerCase()] || "gray"}
                  variant="light"
                  leftSection={
                    <IconUser size={12} style={{ marginRight: 4 }} />
                  }
                >
                  {user.user_role}
                </Badge>

                <Group gap="xs">
                  {user.user_role.toLowerCase() === "purchaser" && (
                    <>
                      <Badge
                        variant="light"
                        color="blue"
                        leftSection={
                          <IconTicket size={12} style={{ marginRight: 4 }} />
                        }
                      >
                        {user.ticket_count}
                      </Badge>
                      <Badge
                        variant="light"
                        color="red"
                        leftSection={
                          <IconCheckbox size={12} style={{ marginRight: 4 }} />
                        }
                      >
                        {user.revised_ticket_count}
                      </Badge>
                    </>
                  )}

                  {user.user_role.toLowerCase() === "reviewer" && (
                    <>
                      <Badge
                        variant="light"
                        color="blue"
                        leftSection={
                          <IconTicket size={12} style={{ marginRight: 4 }} />
                        }
                      >
                        {user.tickets_reviewed_by_user_count}
                      </Badge>
                      <Badge
                        variant="light"
                        color="green"
                        leftSection={
                          <IconCheckbox size={12} style={{ marginRight: 4 }} />
                        }
                      >
                        {user.tickets_revised_by_user_count}
                      </Badge>
                    </>
                  )}
                </Group>
              </Group>

              <Button
                component={Link}
                href={`/users/${user.user_id}`}
                fullWidth
                variant="outline"
                mt="sm"
                scroll={false}
              >
                View Profile
              </Button>
            </Card>
          ))}
      </SimpleGrid>
    </Box>
  );
};

export default UsersPage;
