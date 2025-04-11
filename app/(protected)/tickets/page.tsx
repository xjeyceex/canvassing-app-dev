"use client";

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Collapse,
  Flex,
  Group,
  Input,
  Menu,
  NativeSelect,
  Pagination,
  Paper,
  Select,
  Skeleton,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Tooltip,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconChecks,
  IconChevronDown,
  IconChevronRight,
  IconFileDescription,
  IconFileText,
  IconFilter,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTicket,
} from "@tabler/icons-react";
import DOMPurify from "dompurify";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import LoadingStateProtected from "@/components/LoadingStateProtected";

import { getAllMyTickets, getTicketStatusCounts } from "@/actions/get";
import PageHeader from "@/components/PageHeader";
import { useUserStore } from "@/stores/userStore";
import { formatDate, getStatusColor } from "@/utils/functions";
import { MyTicketType, TicketStatus, TicketStatusCount } from "@/utils/types";

const TicketList = () => {
  const { colorScheme } = useMantineColorScheme();
  const { user } = useUserStore();
  const theme = useMantineTheme();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("oldest");
  const [tickets, setTickets] = useState<MyTicketType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentTotalCount, setCurrentTotalCount] = useState<number>(0);
  const [totalCounts, setTotalCounts] = useState<{
    status_counts: TicketStatusCount[];
    total_count: number;
  }>({
    status_counts: [],
    total_count: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [loadingTab, setLoadingTab] = useState(false);

  const [expandedTickets, setExpandedTickets] = useState<
    Record<string, boolean>
  >({});

  // Breadcrumbs
  const breadcrumbs = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Tickets", href: "/tickets" },
  ];

  // Responsive breakpoints
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.xs})`);
  const isTablet = useMediaQuery(`(max-width: ${theme.breakpoints.md})`);

  const contentPadding = isMobile ? "xs" : isTablet ? "md" : "lg";
  const manuallyExpandedTickets = useRef<Record<string, boolean>>({});
  const prevSearchQuery = useRef("");

  const fetchTickets = (() => {
    let currentRequestId = 0;

    return async () => {
      if (!user?.user_id) return;

      const requestId = ++currentRequestId;
      setLoading(true);

      const fetchedTickets = await getAllMyTickets({
        user_id: user.user_id,
        page_size: pageSize,
        page,
        search_query: searchQuery,
        status_filter: activeTab,
      });

      // Only set data if this is the latest request
      if (requestId === currentRequestId) {
        setCurrentTotalCount(fetchedTickets.total_count);
        setTickets(fetchedTickets.tickets);
        setLoading(false);
      }
    };
  })();

  useEffect(() => {
    const fetchTicketStatusCounts = async () => {
      if (!user?.user_id) return;

      setLoadingTab(true);
      const { status_counts, total_count } = await getTicketStatusCounts(
        user.user_id
      ); // Pass user_id to the function

      // Update the state with the fetched data
      setTotalCounts({
        status_counts, // The grouped ticket status counts
        total_count, // The total ticket count
      });

      setLoadingTab(false);
    };

    fetchTicketStatusCounts();
  }, [user?.user_id]);

  useEffect(() => {
    fetchTickets();
  }, [user?.user_id, pageSize, page, searchQuery, activeTab]);

  useEffect(() => {
    // Skip if search query hasn't changed
    if (prevSearchQuery.current === searchQuery) return;

    // Process expanded tickets based on search
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();

      // Auto-expand tickets that match the search query
      const newExpandedState = { ...expandedTickets };

      availableTickets.forEach((ticket) => {
        const ticketMatches =
          ticket.ticket_name?.toLowerCase().includes(query) ||
          ticket.ticket_item_name?.toLowerCase().includes(query) ||
          ticket.ticket_item_description?.toLowerCase().includes(query) ||
          ticket.ticket_notes?.toLowerCase().includes(query) ||
          ticket.ticket_specifications?.toLowerCase().includes(query);

        // Only update if it's not manually expanded
        if (!manuallyExpandedTickets.current[ticket.ticket_id]) {
          newExpandedState[ticket.ticket_id] = ticketMatches;
        }
      });

      setExpandedTickets(newExpandedState);
    } else if (prevSearchQuery.current !== "" && searchQuery === "") {
      // When search is cleared, collapse all tickets except manually expanded ones
      const newExpandedState = { ...expandedTickets };

      Object.keys(newExpandedState).forEach((ticketId) => {
        if (!manuallyExpandedTickets.current[ticketId]) {
          newExpandedState[ticketId] = false;
        }
      });

      setExpandedTickets(newExpandedState);
    }

    // Update previous search query reference
    prevSearchQuery.current = searchQuery;
  }, [searchQuery, tickets]);

  const tabItems: { value: TicketStatus; label: string }[] = [
    { value: "all", label: "All" },
    { value: "FOR CANVASS", label: "For Canvass" },
    { value: "WORK IN PROGRESS", label: "Work in Progress" },
    { value: "FOR REVIEW OF SUBMISSIONS", label: "For Review of Submissions" },
    { value: "FOR APPROVAL", label: "For Approval" },
    { value: "FOR REVISION", label: "For Revision" },
    { value: "CANCELED", label: "Canceled" },
    { value: "DONE", label: "Done" },
    { value: "DECLINED", label: "Declined" },
    { value: "REVISED", label: "Revised" },
  ];

  const handleTabChange = (value: string | null) => {
    if (value) {
      setActiveTab(value as TicketStatus);
      setSearchQuery("");
      setExpandedTickets({});
      setPage(1);
    }
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(parseInt(value, 10));
    setPage(1); // Reset to page 1 when page size changes
  };

  // Modified toggle function to track manually expanded tickets
  const toggleTicketExpand = (ticketId: string) => {
    setExpandedTickets((prev) => {
      const newState = {
        ...prev,
        [ticketId]: !prev[ticketId],
      };

      // Track that this ticket was manually toggled
      manuallyExpandedTickets.current[ticketId] = newState[ticketId];

      return newState;
    });
  };

  // Get available tickets based on user role
  const availableTickets = tickets.filter((ticket) => {
    const isPurchaser = user?.user_role === "PURCHASER";
    const isSharedWithUser = ticket.shared_users?.some(
      (sharedUser) => sharedUser.user_id === user?.user_id
    );
    const isTicketOwner = ticket.ticket_created_by === user?.user_id;

    if (isPurchaser && !(isSharedWithUser || isTicketOwner)) {
      return false;
    }

    return true;
  });

  // Count tickets by status
  type ExtendedStatus = TicketStatus | "all" | "revised";

  const getTicketCountByStatus = (status: ExtendedStatus) => {
    // If the status is "all", return the total ticket count
    if (status === "all") {
      return totalCounts.total_count;
    }

    // If the status is "REVISED", filter tickets based on whether they have been revised
    if (status === "REVISED") {
      // Check if there is a "REVISED" status in the status counts
      const revisedStatus = totalCounts.status_counts.find(
        (count) => count.ticket_status === "REVISED"
      );
      return revisedStatus ? revisedStatus.ticket_count : 0;
    }
    // Otherwise, find the ticket count for the given status in the `status_counts`
    const statusCount = totalCounts.status_counts.find(
      (count) => count.ticket_status === status
    );

    // If the status is found, return its count; otherwise, return 0
    return statusCount ? statusCount.ticket_count : 0;
  };

  // Filter and sort tickets based on active tab, sort preference, and search query
  const filteredTickets = availableTickets
    .filter((ticket) => {
      // Filter by tab
      if (activeTab === "REVISED") {
        return !!ticket.ticket_revised_by;
      }

      if (activeTab !== "all" && ticket.ticket_status !== activeTab) {
        return false;
      }

      // Filter by search query
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        return (
          ticket.ticket_name?.toLowerCase().includes(query) ||
          ticket.ticket_item_name?.toLowerCase().includes(query) ||
          ticket.ticket_item_description?.toLowerCase().includes(query) ||
          ticket.ticket_notes?.toLowerCase().includes(query) ||
          ticket.ticket_specifications?.toLowerCase().includes(query)
        );
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.ticket_date_created).getTime();
      const dateB = new Date(b.ticket_date_created).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

  const startTicket = (page - 1) * pageSize + 1;
  const endTicket = Math.min(page * pageSize, totalCounts.total_count);

  // Make sure endTicket doesn't exceed currentTotalCount
  const correctedEndTicket = Math.min(endTicket, currentTotalCount);

  const showingInfoText =
    filteredTickets.length > 0
      ? `${startTicket}-${correctedEndTicket} of ${currentTotalCount}`
      : "0 of 0";

  // Highlight search terms in text
  const highlightSearchTerm = (text: string) => {
    if (!searchQuery.trim() || !text) return text;

    const regex = new RegExp(`(${searchQuery.trim()})`, "gi");
    const html = text.replace(
      regex,
      '<mark style="background-color: #FFF3BF; border-radius: 2px;">$1</mark>'
    );

    return DOMPurify.sanitize(html);
  };

  // Function to sanitize and highlight rich text content
  const sanitizeAndHighlight = (html: string) => {
    if (!html) return "";
    const sanitized = DOMPurify.sanitize(html);

    if (searchQuery.trim()) {
      // Only highlight text nodes, not HTML tags
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = sanitized;

      const highlightTextNodes = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          if (
            node.textContent &&
            node.textContent.toLowerCase().includes(searchQuery.toLowerCase())
          ) {
            const regex = new RegExp(`(${searchQuery.trim()})`, "gi");
            const highlighted = node.textContent.replace(
              regex,
              '<mark style="background-color: #FFF3BF; border-radius: 2px;">$1</mark>'
            );

            const wrapper = document.createElement("span");
            wrapper.innerHTML = highlighted;

            if (node.parentNode) {
              node.parentNode.replaceChild(wrapper, node);
            }
          }
        } else if (
          node.nodeType === Node.ELEMENT_NODE &&
          node.nodeName !== "MARK"
        ) {
          node.childNodes.forEach(highlightTextNodes);
        }
      };

      tempDiv.childNodes.forEach(highlightTextNodes);
      return tempDiv.innerHTML;
    }

    return sanitized;
  };

  if (!user) {
    return <LoadingStateProtected />;
  }

  return (
    <Box p={contentPadding} style={{ maxWidth: "100%" }}>
      {/* Ticket List Header */}
      <Box mb="lg">
        <Flex
          justify="space-between"
          align={isMobile ? "flex-start" : "center"}
          mb="lg"
          wrap={isMobile ? "wrap" : "nowrap"}
          direction={isMobile ? "column" : "row"}
          gap="sm"
        >
          <PageHeader title="Tickets" breadcrumbs={breadcrumbs} />

          {(user.user_role === "PURCHASER" || user.user_role === "ADMIN") && (
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => router.push("/tickets/create-ticket")}
              w={isMobile ? "100%" : "auto"}
            >
              New Ticket
            </Button>
          )}
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
        {/* Tools Option */}
        <Stack gap={0}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tabs.List>
              {tabItems.map((tab) => (
                <Tabs.Tab
                  key={tab.value}
                  value={tab.value}
                  color={
                    tab.value !== "all" ? getStatusColor(tab.value) : undefined
                  }
                  py="md"
                >
                  <Group gap={8}>
                    {tab.label}
                    {
                      <Badge
                        size="sm"
                        radius="sm"
                        variant="light"
                        color={
                          tab.value !== "all"
                            ? getStatusColor(tab.value)
                            : undefined
                        }
                      >
                        {loadingTab ? (
                          <Skeleton width={8} height={8} />
                        ) : (
                          getTicketCountByStatus(tab.value)
                        )}
                      </Badge>
                    }
                  </Group>
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>

          <Group
            align="center"
            justify="space-between"
            py="sm"
            px="md"
            wrap="nowrap"
            style={{
              borderBottom: `1px solid ${
                colorScheme === "dark"
                  ? theme.colors.dark[5]
                  : theme.colors.gray[2]
              }`,
            }}
          >
            <Input
              placeholder="Search tickets..."
              w="100%"
              leftSection={
                <IconSearch size={isMobile ? 16 : 18} stroke={1.5} />
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.currentTarget.value);
                setActiveTab("all");
              }}
            />
            <Group align="center" justify="center" wrap="nowrap">
              <Menu shadow="md" width="fit-content" position="bottom-start">
                <Menu.Target>
                  <Button
                    variant="light"
                    color="gray"
                    leftSection={<IconFilter size={16} />}
                    style={{ flexGrow: isMobile ? 1 : 0 }}
                    size="sm"
                  >
                    {sortBy === "newest" ? "Newest First" : "Oldest First"}
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    onClick={() => setSortBy("newest")}
                    leftSection={
                      <IconChecks
                        size={16}
                        opacity={sortBy === "newest" ? 1 : 0}
                      />
                    }
                  >
                    Newest First
                  </Menu.Item>
                  <Menu.Item
                    onClick={() => setSortBy("oldest")}
                    leftSection={
                      <IconChecks
                        size={16}
                        opacity={sortBy === "oldest" ? 1 : 0}
                      />
                    }
                  >
                    Oldest First
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>

              <Tooltip label="Refresh">
                <ActionIcon
                  variant="light"
                  size="lg"
                  onClick={fetchTickets}
                  loading={loading}
                  color="gray"
                >
                  <IconRefresh size={isMobile ? 16 : 18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        </Stack>

        {filteredTickets.length > 0 && !loading ? (
          <>
            <Stack gap={5}>
              {filteredTickets.map((ticket) => (
                <Paper
                  p={isMobile ? "md" : "lg"}
                  key={ticket.ticket_id}
                  radius="none"
                  shadow="none"
                  style={{
                    borderBottom: `1px solid ${
                      colorScheme === "dark"
                        ? theme.colors.dark[5]
                        : theme.colors.gray[2]
                    }`,
                  }}
                >
                  {/* Ticket Header - Always Visible */}
                  <Group
                    justify="space-between"
                    wrap="wrap"
                    onClick={() => toggleTicketExpand(ticket.ticket_id)}
                    style={{ cursor: "pointer" }}
                  >
                    <Box
                      style={{ flex: 1, minWidth: isMobile ? "100%" : "auto" }}
                    >
                      <Group mb={8} wrap="wrap">
                        <Badge
                          variant="light"
                          color={getStatusColor(ticket.ticket_status)}
                          radius="sm"
                        >
                          {ticket.ticket_status}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          Created {formatDate(ticket.ticket_date_created)}
                        </Text>
                      </Group>
                      <Group gap="md" wrap="wrap">
                        <Text
                          fw={600}
                          size="sm"
                          dangerouslySetInnerHTML={{
                            __html: `#${highlightSearchTerm(
                              ticket.ticket_name
                            )}`,
                          }}
                        />
                        <Text
                          size="sm"
                          dangerouslySetInnerHTML={{
                            __html: highlightSearchTerm(
                              ticket.ticket_item_name
                            ),
                          }}
                        />
                      </Group>
                    </Box>
                    <Group
                      gap="xs"
                      style={{
                        marginTop: isMobile ? theme.spacing.xs : 0,
                        width: isMobile ? "100%" : "auto",
                        justifyContent: isMobile ? "space-between" : "flex-end",
                      }}
                    >
                      <Button
                        component={Link}
                        href={`/tickets/${ticket.ticket_id}`}
                        variant="light"
                        size="xs"
                        style={{ flexGrow: isMobile ? 1 : 0 }}
                        rightSection={<IconChevronRight size={14} />}
                        onClick={(e) => e.stopPropagation()} // Prevent toggling when clicking the button
                      >
                        View Details
                      </Button>
                      <ActionIcon
                        variant="subtle"
                        size="md"
                        color="gray"
                        aria-label="Expand"
                      >
                        <IconChevronDown
                          size={16}
                          style={{
                            transform: expandedTickets[ticket.ticket_id]
                              ? "rotate(180deg)"
                              : "rotate(0)",
                            transition: "transform 200ms ease",
                          }}
                        />
                      </ActionIcon>
                    </Group>
                  </Group>

                  {/* Collapsible Details Section */}
                  <Collapse in={expandedTickets[ticket.ticket_id]}>
                    <Stack gap="lg" pt="xl">
                      {ticket.ticket_item_description && (
                        <Box>
                          <Group mb={8} gap={10}>
                            <ThemeIcon
                              size="sm"
                              color="blue"
                              variant="light"
                              radius="xl"
                            >
                              <IconFileDescription size={14} />
                            </ThemeIcon>
                            <Text fw={500} size="sm">
                              Item Description
                            </Text>
                          </Group>
                          <Paper
                            p="sm"
                            radius="md"
                            shadow="none"
                            bg={colorScheme === "dark" ? "dark.7" : "gray.0"}
                            style={{
                              borderColor:
                                colorScheme === "dark"
                                  ? theme.colors.dark[5]
                                  : theme.colors.gray[1],
                            }}
                            withBorder
                          >
                            <Text
                              size="sm"
                              dangerouslySetInnerHTML={{
                                __html: highlightSearchTerm(
                                  ticket.ticket_item_description
                                ),
                              }}
                            />
                          </Paper>
                        </Box>
                      )}

                      {ticket.ticket_specifications && (
                        <Box>
                          <Group mb={4} gap={10}>
                            <ThemeIcon
                              size="sm"
                              color="violet"
                              variant="light"
                              radius="xl"
                            >
                              <IconFileText size={14} />
                            </ThemeIcon>
                            <Text fw={500} size="sm">
                              Specifications
                            </Text>
                          </Group>
                          <Paper
                            p="sm"
                            radius="md"
                            shadow="none"
                            withBorder
                            bg={colorScheme === "dark" ? "dark.6" : "gray.0"}
                            style={{
                              borderColor:
                                colorScheme === "dark"
                                  ? theme.colors.dark[5]
                                  : theme.colors.gray[1],
                            }}
                          >
                            <Box
                              className="rich-text-content"
                              dangerouslySetInnerHTML={{
                                __html: sanitizeAndHighlight(
                                  ticket.ticket_specifications
                                ),
                              }}
                            />
                          </Paper>
                        </Box>
                      )}
                    </Stack>
                  </Collapse>
                </Paper>
              ))}
            </Stack>

            <Box p={isMobile ? "xs" : "md"}>
              <Group
                wrap="wrap"
                gap="md"
                style={{
                  flexDirection: isMobile ? "column" : "row",
                  alignItems: isMobile ? "stretch" : "center",
                }}
              >
                {/* Left Section */}
                <Group
                  align="center"
                  gap="xs"
                  style={{
                    flex: 1,
                    justifyContent: isMobile ? "center" : "flex-start",
                    order: isMobile ? 2 : 1,
                    width: isMobile ? "100%" : "auto",
                    textAlign: isMobile ? "center" : "left",
                  }}
                >
                  <Text size="sm" c="dimmed">
                    Rows per page:
                  </Text>

                  <NativeSelect
                    value={pageSize.toString()}
                    onChange={(event) =>
                      handlePageSizeChange(event.currentTarget.value)
                    }
                    data={["5", "10", "20", "50"]}
                    size="sm"
                    style={{ width: 75 }}
                  />

                  <Text size="sm" c="dimmed">
                    {showingInfoText}
                  </Text>
                </Group>

                {/* Middle Section: Pagination */}
                <Box
                  style={{
                    flex: 1,
                    display: "flex",
                    justifyContent: "center",
                    order: isMobile ? 1 : 2,
                    width: isMobile ? "100%" : "auto",
                    marginTop: isMobile ? theme.spacing.xs : 0,
                  }}
                >
                  <Pagination
                    value={page}
                    onChange={setPage}
                    total={Math.max(1, Math.ceil(currentTotalCount / pageSize))}
                    color="blue"
                    size="sm"
                    withEdges
                  />
                </Box>

                {/* Right Section: Page Select */}
                <Group
                  align="center"
                  gap={4}
                  style={{
                    flex: 1,
                    justifyContent: isMobile ? "center" : "flex-end",
                    order: 3,
                    width: isMobile ? "100%" : "auto",
                    marginTop: isMobile ? theme.spacing.xs : 0,
                    textAlign: isMobile ? "center" : "right",
                  }}
                >
                  <Text size="sm" c="dimmed">
                    Go to page:
                  </Text>

                  <Select
                    value={page.toString()}
                    onChange={(value) => value && setPage(Number(value))}
                    data={Array.from(
                      {
                        length: Math.max(
                          1,
                          Math.ceil(currentTotalCount / pageSize)
                        ),
                      },
                      (_, i) => (i + 1).toString()
                    )}
                    size="sm"
                    style={{ width: 80 }}
                    allowDeselect={false}
                  />

                  <Text size="sm" c="dimmed">
                    / {Math.max(1, Math.ceil(currentTotalCount / pageSize))}
                  </Text>
                </Group>
              </Group>
            </Box>
          </>
        ) : loading ? (
          <>
            <Paper
              p={isMobile ? "md" : "lg"}
              radius="none"
              shadow="none"
              style={{
                borderBottom: `1px solid ${
                  colorScheme === "dark"
                    ? theme.colors.dark[5]
                    : theme.colors.gray[2]
                }`,
              }}
            >
              {/* Details Section Skeleton */}
              <Collapse in>
                <Stack gap="lg">
                  {[...Array(5)].map((_, index) => (
                    <Box key={index}>
                      <Paper
                        pb="lg"
                        radius="none"
                        shadow="none"
                        bg={colorScheme === "dark" ? "dark.7" : "gray.0"}
                        style={{
                          borderBottom: `1px solid ${
                            colorScheme === "dark"
                              ? theme.colors.dark[5]
                              : theme.colors.gray[2]
                          }`,
                        }}
                      >
                        <Group justify="space-between" align="center">
                          <Stack gap={6}>
                            <Group>
                              <Skeleton height={18} width={120} />
                              <Skeleton height={20} width={200} />
                            </Group>
                            <Group>
                              <Skeleton height={25} width={180} />
                              <Skeleton height={25} width={100} />
                            </Group>
                          </Stack>
                          <Stack pr="xl">
                            <Skeleton height={30} width={120} />
                          </Stack>
                        </Group>
                      </Paper>
                    </Box>
                  ))}
                  <Group gap="xl">
                    <Group>
                      <Skeleton height={25} width={120} />
                      <Skeleton height={30} width={60} />
                    </Group>
                    <Group pl="md">
                      <Skeleton height={22} width={22} radius="sm" />
                      <Skeleton height={22} width={22} radius="sm" />
                      <Skeleton height={22} width={22} radius="sm" />
                      <Skeleton height={22} width={22} radius="sm" />
                    </Group>
                  </Group>
                </Stack>
              </Collapse>
            </Paper>
          </>
        ) : (
          <Flex
            justify="center"
            align="center"
            direction="column"
            h="100%"
            mih={isMobile ? 150 : 250}
          >
            <Group justify="center">
              <ThemeIcon size={isMobile ? 36 : 48} radius="xl" variant="light">
                <IconTicket size={isMobile ? 18 : 24} />
              </ThemeIcon>
            </Group>
            <Text c="dimmed" ta="center" mt="md">
              {searchQuery
                ? "No tickets matching your search"
                : "No tickets found"}
            </Text>
            {(user.user_role === "PURCHASER" || user.user_role === "ADMIN") && (
              <Group justify="center" mt="md">
                <Button
                  variant="light"
                  size={isMobile ? "xs" : "sm"}
                  onClick={() => router.push("/tickets/create-ticket")}
                  leftSection={<IconPlus size={isMobile ? 12 : 14} />}
                >
                  Create New Ticket
                </Button>
              </Group>
            )}
          </Flex>
        )}
      </Paper>
    </Box>
  );
};

export default TicketList;
