"use client";

import { getUserRoleCounts, getUsers } from "@/actions/get";
import LoadingStateProtected from "@/components/LoadingStateProtected";
import PageHeader from "@/components/PageHeader";
import { useUserStore } from "@/stores/userStore";
import { getNameInitials, getRoleColor } from "@/utils/functions";
import { UserRole } from "@/utils/types";
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Flex,
  Group,
  NativeSelect,
  Pagination,
  Paper,
  Select,
  Skeleton,
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

export type RoleCount = {
  user_role: string;
  user_count: number;
};

const UsersPage = () => {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const router = useRouter();
  const { user } = useUserStore();
  const currentUser = user;

  const [users, setUsers] = useState<UserType[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingTab, setLoadingTab] = useState(false);

  const [totalCounts, setTotalCounts] = useState<{
    role_count: RoleCount[];
    total_count: number;
  }>({
    role_count: [],
    total_count: 0,
  });
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.xs})`);

  const fetchData = (() => {
    let currentRequestId = 0;

    return async () => {
      const requestId = ++currentRequestId;
      setLoading(true);

      try {
        const result = await getUsers({
          page,
          pageSize,
          searchQuery,
          activeTab,
        });

        // Abort if this is not the latest request
        if (requestId !== currentRequestId) return;

        if (result.error) {
          notifications.show({
            title: "Error",
            message: result.message,
            color: "red",
            icon: <IconAlertCircle size={16} />,
          });
          return;
        }

        setUsers(result?.users || []);
        setTotalCount(result?.totalCount);
      } catch (error) {
        // Only show error if this is the latest request
        if (requestId === currentRequestId) {
          console.error("Error fetching data:", error);
          notifications.show({
            title: "Error",
            message: "Failed to fetch users",
            color: "red",
            icon: <IconAlertCircle size={16} />,
          });
        }
      } finally {
        // Only turn off loading if this is the latest request
        if (requestId === currentRequestId) {
          setLoading(false);
        }
      }
    };
  })();

  useEffect(() => {
    console.log("Tab changed:", activeTab); // Debugging tab change
    fetchData();
  }, [page, pageSize, searchQuery, activeTab]);

  useEffect(() => {
    const fetchRoleCounts = async () => {
      if (!user?.user_id) return;

      setLoadingTab(true);
      const { role_counts, total_count } = await getUserRoleCounts(); // Pass user_id to the function

      // Update the state with the fetched data
      setTotalCounts({
        role_count: role_counts, // ✅ this matches your state type
        total_count,
      });

      setLoadingTab(false);
    };

    fetchRoleCounts();
  }, [user?.user_id]);

  if (!users) {
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

  const startTicket = (page - 1) * pageSize + 1;
  const endTicket = Math.min(page * pageSize, totalCount);

  // Make sure endTicket doesn't exceed currentTotalCount
  const correctedEndTicket = Math.min(endTicket, totalCount);

  const showingInfoText =
    filteredUsers.length > 0
      ? `${startTicket}-${correctedEndTicket} of ${totalCount}`
      : "0 of 0";

  const handlePageSizeChange = (value: string) => {
    setPageSize(parseInt(value, 10));
    setPage(1); // Reset to page 1 when page size changes
  };

  // Get status badge
  const getRoleBadge = (role: UserRole) => {
    return (
      <Badge color={role ? getRoleColor(role) : "gray"} variant="light">
        {role}
      </Badge>
    );
  };

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
      setActiveTab(value);
      setSearchQuery("");
      setPage(1);
    }
  };

  const getUserCountByRole = (role: UserRole) => {
    if (role === "all") {
      return totalCounts.total_count;
    }

    const roleData = totalCounts.role_count.find((r) => r.user_role === role);
    return roleData ? roleData.user_count : 0;
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

          {/* <Button leftSection={<IconPlus size={16} />} size="sm">
            New user
          </Button> */}
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
                color={getRoleColor(tab.value)}
                py="md"
              >
                <Group gap={8}>
                  {tab.label}
                  <Badge
                    size="sm"
                    radius="sm"
                    variant="light"
                    color={getRoleColor(tab.value)}
                  >
                    {loadingTab ? (
                      <Skeleton width={8} height={8} />
                    ) : (
                      getUserCountByRole(tab.value)
                    )}{" "}
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
              {(currentUser?.user_role === "MANAGER" ||
                currentUser?.user_role === "ADMIN") && (
                <Table.Th py="lg">Ticket Status</Table.Th>
              )}
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
            {loading ? (
              <>
                {[...Array(5)].map((_, index) => (
                  <Table.Tr key={`skeleton-${index}`}>
                    <Table.Td p="md">
                      <Group gap="sm">
                        <Skeleton height={40} width={40} circle />
                        <Stack gap={4}>
                          <Skeleton height={16} width={100} radius="sm" />
                          <Skeleton height={12} width={140} radius="sm" />
                        </Stack>
                      </Group>
                    </Table.Td>
                    <Table.Td py="md">
                      <Skeleton height={24} width={80} radius="xl" />
                    </Table.Td>
                    {(currentUser?.user_role === "MANAGER" ||
                      currentUser?.user_role === "ADMIN") && (
                      <Table.Td py="md">
                        <Group gap={4}>
                          <Skeleton height={24} width={40} radius="xl" />
                          <Skeleton height={24} width={40} radius="xl" />
                          <Skeleton height={24} width={50} radius="xl" />
                        </Group>
                      </Table.Td>
                    )}
                    <Table.Td py="md">
                      <Skeleton height={16} width={90} radius="sm" />
                    </Table.Td>
                    <Table.Td py="md">
                      <Skeleton height={24} width={24} circle />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </>
            ) : filteredUsers.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6} align="center" py="xl">
                  <Text c="dimmed">No users found</Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredUsers.map((user) => (
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

                  {(currentUser?.user_role === "MANAGER" ||
                    currentUser?.user_role === "ADMIN") && (
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
                            <Tooltip label={`Revised tickets percentage`}>
                              <Badge
                                variant="light"
                                color={
                                  user.ticket_count === 0
                                    ? "dimmed"
                                    : (user.revised_ticket_count /
                                        user.ticket_count) *
                                        100 <
                                      50
                                    ? "green"
                                    : (user.revised_ticket_count /
                                        user.ticket_count) *
                                        100 <
                                      80
                                    ? "yellow"
                                    : "red"
                                }
                              >
                                {user.ticket_count === 0
                                  ? "0.00"
                                  : (
                                      (user.revised_ticket_count /
                                        user.ticket_count) *
                                      100
                                    ).toFixed(2)}
                                %
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
                  )}

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
          {loading ? (
            <Group
              justify="space-between"
              align="center"
              wrap={isMobile ? "wrap" : "nowrap"}
            >
              {/* Left section - Rows per page */}
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
                <Skeleton height={20} width={90} radius="sm" />
                <Skeleton height={32} width={75} radius="sm" />
                <Skeleton height={20} width={60} radius="sm" />
              </Group>

              {/* Middle section - Pagination */}
              <Group
                gap={4}
                style={{
                  order: isMobile ? 1 : 2,
                  justifyContent: "center",
                  width: isMobile ? "100%" : "auto",
                }}
              >
                {[...Array(5)].map((_, i) => (
                  <Skeleton
                    key={`pagination-skeleton-${i}`}
                    height={25}
                    width={25}
                    radius="md"
                  />
                ))}
              </Group>

              {/* Right section - Go to page */}
              <Group
                align="center"
                gap={4}
                style={{
                  order: 3,
                  justifyContent: isMobile ? "center" : "flex-end",
                  width: isMobile ? "100%" : "auto",
                  marginTop: isMobile ? theme.spacing.xs : 0,
                }}
              >
                <Skeleton height={20} width={70} radius="sm" />
                <Skeleton height={32} width={80} radius="sm" />
                <Skeleton height={20} width={30} radius="sm" />
              </Group>
            </Group>
          ) : (
            <Group
              justify="space-between"
              align="center"
              wrap={isMobile ? "wrap" : "nowrap"}
            >
              {/* Left section - Rows per page */}
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
                <NativeSelect
                  value={pageSize.toString()}
                  onChange={(event) =>
                    handlePageSizeChange(event.currentTarget.value)
                  }
                  data={["5", "10", "20", "50"]}
                  size="sm"
                  style={{ width: 75 }}
                />
                <Text size="sm">{showingInfoText}</Text>
              </Group>

              {/* Middle section - Pagination */}
              <Pagination
                value={page}
                onChange={setPage}
                total={Math.max(1, Math.ceil(totalCount / pageSize))}
                color="blue"
                size="sm"
                withEdges
                style={{
                  order: isMobile ? 1 : 2,
                  justifyContent: "center",
                  width: isMobile ? "100%" : "auto",
                }}
              />

              {/* Right section - Go to page */}
              <Group
                align="center"
                gap={4}
                style={{
                  order: 3,
                  justifyContent: isMobile ? "center" : "flex-end",
                  width: isMobile ? "100%" : "auto",
                  marginTop: isMobile ? theme.spacing.xs : 0,
                }}
              >
                <Text size="sm" c="dimmed">
                  Go to page:
                </Text>
                <Select
                  value={page.toString()}
                  onChange={(value) => value && setPage(Number(value))}
                  data={Array.from(
                    { length: Math.max(1, Math.ceil(totalCount / pageSize)) },
                    (_, i) => (i + 1).toString()
                  )}
                  size="sm"
                  style={{ width: 80 }}
                  allowDeselect={false}
                />
                <Text size="sm" c="dimmed">
                  / {Math.max(1, Math.ceil(totalCount / pageSize))}
                </Text>
              </Group>
            </Group>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default UsersPage;
