"use client";

import { getUsers } from "@/actions/get";
import LoadingStateProtected from "@/components/LoadingStateProtected";
import PageHeader from "@/components/PageHeader";
import { getNameInitials, getRoleColor } from "@/utils/functions";
import { UserRole } from "@/utils/types";
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  Group,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Tooltip,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheckbox,
  IconEye,
  IconPlus,
  IconSearch,
  IconTicket,
} from "@tabler/icons-react";
import DOMPurify from "dompurify";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

const UsersPage = () => {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const router = useRouter();
  const [users, setUsers] = useState<UserType[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [activePage, setActivePage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState("5");

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

  if (loading || !users) {
    return <LoadingStateProtected />;
  }

  // Filter users based on active tab and search query
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.user_email.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "all") {
      return matchesSearch;
    } else {
      return user.user_role === activeTab && matchesSearch;
    }
  });

  // Get status badge
  const getRoleBadge = (role: UserRole) => {
    return (
      <Badge color={role ? getRoleColor(role) : "gray"} variant="light">
        {role}
      </Badge>
    );
  };

  // Pagination
  const currentPageUsers = filteredUsers.slice(
    (activePage - 1) * Number(rowsPerPage),
    activePage * Number(rowsPerPage)
  );

  const breadcrumbs = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Users", href: "/users" },
  ];

  const tabItems: { value: UserRole; label: string }[] = [
    { value: "all", label: "All" },
    { value: "ADMIN", label: "Admin" },
    { value: "MANAGER", label: "Manager" },
    { value: "REVIEWER", label: "Reviewer" },
    { value: "PURCHASER", label: "Purchaser" },
  ];

  const handleTabChange = (value: string | null) => {
    if (value) {
      setActiveTab(value as UserRole);
    }
  };

  const getUserCountByRole = (role: UserRole) => {
    if (role === "all") {
      return users.length;
    }

    return users.filter((user) => user.user_role === role).length;
  };

  const highlightSearchTerm = (text: string) => {
    if (!searchQuery.trim() || !text) return text;

    const regex = new RegExp(`(${searchQuery.trim()})`, "gi");
    const html = text.replace(
      regex,
      '<mark style="background-color: #FFF3BF; border-radius: 2px;">$1</mark>'
    );

    return DOMPurify.sanitize(html);
  };

  return (
    <Box p="md">
      <Box mb="lg">
        <Flex
          justify="space-between"
          align={isMobile ? "flex-start" : "center"}
          mb="lg"
          wrap={isMobile ? "wrap" : "nowrap"}
          direction={isMobile ? "column" : "row"}
          gap="sm"
        >
          <PageHeader title="Users" breadcrumbs={breadcrumbs} />

          <Button leftSection={<IconPlus size={16} />} size="sm">
            New user
          </Button>
        </Flex>
      </Box>

      <Paper
        shadow="sm"
        withBorder
        style={{
          border: `1px solid ${
            colorScheme === "dark" ? theme.colors.dark[5] : theme.colors.gray[2]
          }`,
          borderRadius: "md",
        }}
        radius="md"
      >
        <Tabs defaultValue="all" value={activeTab} onChange={handleTabChange}>
          <Tabs.List>
            {tabItems.map((tab) => (
              <Tabs.Tab
                key={tab.value}
                value={tab.value}
                color={tab.value !== "all" ? getRoleColor(tab.value) : "dark"}
                py="md"
              >
                <Group gap={8}>
                  {tab.label}
                  <Badge
                    size="sm"
                    radius="sm"
                    variant="light"
                    color={
                      tab.value !== "all" ? getRoleColor(tab.value) : "dark"
                    }
                  >
                    {getUserCountByRole(tab.value)}
                  </Badge>
                </Group>
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>

        <Group
          p="md"
          align="flex-end"
          style={{
            borderBottom: `1px solid ${
              colorScheme === "dark"
                ? theme.colors.dark[5]
                : theme.colors.gray[2]
            }`,
            borderRadius: "md",
          }}
        >
          <TextInput
            size="md"
            placeholder="Search users..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            flex={1}
          />
        </Group>

        <Table>
          <Table.Thead bg={colorScheme === "dark" ? "#2E2E2E" : "gray.0"}>
            <Table.Tr style={{ border: "none" }}>
              <Table.Th p="lg">Name</Table.Th>
              <Table.Th py="lg">Role</Table.Th>
              <Table.Th py="lg">Tickets</Table.Th>
              <Table.Th py="lg">Date Created</Table.Th>
              <Table.Th py="lg"></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody
            style={{
              borderBlock: `1px solid ${
                colorScheme === "dark"
                  ? theme.colors.dark[5]
                  : theme.colors.gray[2]
              }`,
              borderRadius: "md",
            }}
          >
            {currentPageUsers.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6} align="center" py="xl">
                  <Text c="dimmed">No users found</Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              currentPageUsers.map((user) => (
                <Table.Tr
                  key={user.user_id}
                  onClick={() => router.push(`/users/${user.user_id}`)}
                  style={{
                    cursor: "pointer", // Make it clickable
                    transition:
                      "transform 0.3s ease, background-color 0.3s ease", // Smooth transition
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.01)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  <Table.Td p="md">
                    <Group gap="sm">
                      <Box pos="relative">
                        <Avatar
                          src={user.user_avatar || undefined}
                          radius="50%"
                          size="md"
                          color={getRoleColor(user.user_role)}
                          variant="filled"
                        >
                          {user.user_name
                            ? getNameInitials(user.user_name || "")
                            : "UN"}
                        </Avatar>
                      </Box>
                      <Stack gap={0}>
                        <Text
                          size="sm"
                          fw={500}
                          dangerouslySetInnerHTML={{
                            __html: highlightSearchTerm(user.user_name),
                          }}
                        />
                        <Text
                          size="xs"
                          c="dimmed"
                          dangerouslySetInnerHTML={{
                            __html: highlightSearchTerm(user.user_email),
                          }}
                        />
                      </Stack>
                    </Group>
                  </Table.Td>
                  <Table.Td py="md">
                    {getRoleBadge(user.user_role as UserRole)}
                  </Table.Td>
                  <Table.Td py="md">
                    <Group gap="xs">
                      {user.user_role === "PURCHASER" && (
                        <>
                          <Tooltip label={`${user.ticket_count} tickets`}>
                            <Badge
                              variant="light"
                              color="blue"
                              leftSection={<IconTicket size={12} />}
                            >
                              {user.ticket_count}
                            </Badge>
                          </Tooltip>
                          <Tooltip
                            label={`${user.revised_ticket_count} revised tickets`}
                          >
                            <Badge
                              variant="light"
                              color="red"
                              leftSection={<IconCheckbox size={12} />}
                            >
                              {user.revised_ticket_count}
                            </Badge>
                          </Tooltip>
                        </>
                      )}
                      {user.user_role === "REVIEWER" && (
                        <>
                          <Tooltip
                            label={`${user.tickets_reviewed_by_user_count} tickets reviewed`}
                          >
                            <Badge
                              variant="light"
                              color="blue"
                              leftSection={<IconTicket size={12} />}
                            >
                              {user.tickets_reviewed_by_user_count}
                            </Badge>
                          </Tooltip>
                          <Tooltip
                            label={`${user.tickets_revised_by_user_count} revised tickets`}
                          >
                            <Badge
                              variant="light"
                              color="green"
                              leftSection={<IconCheckbox size={12} />}
                            >
                              {user.tickets_revised_by_user_count}
                            </Badge>
                          </Tooltip>
                        </>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td py="md">
                    {new Date(user.user_created_at).toLocaleDateString()}
                  </Table.Td>
                  <Table.Td py="md">
                    <Group gap="xs">
                      <Tooltip label="View Profile">
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          component={Link}
                          href={`/users/${user.user_id}`}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>

        <Box p={isMobile ? "xs" : "md"}>
          <Group
            justify="apart"
            align="center"
            wrap={isMobile ? "wrap" : "nowrap"}
          >
            <Group
              align="center"
              gap="sm"
              style={{
                order: isMobile ? 2 : 1,
                width: isMobile ? "100%" : "auto",
                justifyContent: isMobile ? "center" : "flex-start",
                marginTop: isMobile ? theme.spacing.xs : 0,
              }}
            >
              <Text size="sm">Rows per page:</Text>
              <Select
                data={["5", "10", "20", "50"]}
                value={rowsPerPage}
                onChange={(value) => setRowsPerPage(value || "5")}
                w={65}
              />
              <Text size="sm">
                {filteredUsers.length > 0
                  ? `${(activePage - 1) * Number(rowsPerPage) + 1}-${Math.min(
                      activePage * Number(rowsPerPage),
                      filteredUsers.length
                    )} of ${filteredUsers.length}`
                  : "0-0 of 0"}
              </Text>
              <Pagination
                total={Math.ceil(filteredUsers.length / Number(rowsPerPage))}
                value={activePage}
                onChange={setActivePage}
              />
            </Group>
          </Group>
        </Box>
      </Paper>
    </Box>
  );
};

export default UsersPage;
