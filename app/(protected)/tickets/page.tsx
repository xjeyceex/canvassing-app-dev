"use client";

import { getAllMyTickets } from "@/actions/get";
import LoadingStateProtected from "@/components/LoadingStateProtected";
import { useUserStore } from "@/stores/userStore";
import { formatDate, getStatusColor } from "@/utils/functions";
import { MyTicketType } from "@/utils/types";
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
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Title,
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
  IconNotes,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTicket,
} from "@tabler/icons-react";
import DOMPurify from "dompurify";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type TicketStatus =
  | "FOR CANVASS"
  | "WORK IN PROGRESS"
  | "FOR APPROVAL"
  | "DONE"
  | "CANCELED"
  | "FOR REVIEW OF SUBMISSIONS"
  | "FOR REVISION"
  | "DECLINED"
  | "REVISED"
  | "all";

const TicketList = () => {
  const { colorScheme } = useMantineColorScheme();
  const { user } = useUserStore();
  const theme = useMantineTheme();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [tickets, setTickets] = useState<MyTicketType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTickets, setExpandedTickets] = useState<
    Record<string, boolean>
  >({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Responsive breakpoints
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.xs})`);
  const isTablet = useMediaQuery(`(max-width: ${theme.breakpoints.md})`);

  // Calculate content padding based on screen size
  const contentPadding = isMobile ? "xs" : isTablet ? "md" : "lg";

  // Track manually expanded tickets to not auto-collapse them when search changes
  const manuallyExpandedTickets = useRef<Record<string, boolean>>({});

  // Track previous search query to detect when it changes
  const prevSearchQuery = useRef("");

  const fetchTickets = async () => {
    if (!user?.user_id) return;
    setLoading(true);
    const fetchedTickets = await getAllMyTickets({
      user_id: user.user_id,
    });
    setTickets(fetchedTickets);
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [user?.user_id]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, sortBy]);

  // Handle search query change and auto-expand matching tickets
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
    }
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
    if (status === "all") {
      return availableTickets.length;
    }

    if (status === "REVISED") {
      return availableTickets.filter((ticket) => !!ticket.ticket_revised_by)
        .length;
    }

    return availableTickets.filter((ticket) => ticket.ticket_status === status)
      .length;
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

  // Calculate pagination
  const totalPages = Math.ceil(filteredTickets.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredTickets.length);
  const currentTickets = filteredTickets.slice(startIndex, endIndex);
  const showingInfoText =
    filteredTickets.length > 0
      ? `${startIndex + 1}–${endIndex} of ${filteredTickets.length}`
      : "0 of 0";

  // Options for rows per page
  const rowsPerPageOptions = [5, 10, 25, 50];

  // Highlight search terms in text
  const highlightSearchTerm = (text: string) => {
    if (!searchQuery.trim() || !text) return text;

    const regex = new RegExp(`(${searchQuery.trim()})`, "gi");
    return text.replace(
      regex,
      '<mark style="background-color: #FFF3BF; border-radius: 2px;">$1</mark>'
    );
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

  const handleRowsPerPageChange = (value: string) => {
    const newRowsPerPage = parseInt(value, 10);
    setRowsPerPage(newRowsPerPage);
    // Reset to first page when changing rows per page
    setCurrentPage(1);
  };

  if (!user || loading) {
    return <LoadingStateProtected />;
  }

  return (
    <Box p={contentPadding} style={{ maxWidth: "100%" }}>
      {/* Ticket List Header */}
      <Box mb="lg">
        <Group
          justify="space-between"
          align="center"
          mb="lg"
          wrap={isMobile ? "wrap" : "nowrap"}
        >
          <Group
            gap="xs"
            style={{ flexGrow: 1, flexBasis: isMobile ? "100%" : "auto" }}
          >
            <Title order={isMobile ? 3 : 2}>Tickets</Title>
          </Group>

          {(user.user_role === "PURCHASER" || user.user_role === "ADMIN") && (
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => router.push("/tickets/create-ticket")}
              style={{ flexGrow: isMobile ? 1 : 0 }}
            >
              New Ticket
            </Button>
          )}
        </Group>
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
                      {getTicketCountByStatus(tab.value)}
                    </Badge>
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
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
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

        {filteredTickets.length > 0 ? (
          <>
            <Stack gap={5}>
              {currentTickets.map((ticket) => (
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

                      {ticket.ticket_notes && (
                        <Box>
                          <Group mb={4} gap={10}>
                            <ThemeIcon
                              size="sm"
                              color="teal"
                              variant="light"
                              radius="xl"
                            >
                              <IconNotes size={14} />
                            </ThemeIcon>
                            <Text fw={500} size="sm">
                              Notes
                            </Text>
                          </Group>
                          <Paper
                            p="sm"
                            radius="md"
                            shadow="none"
                            withBorder
                            bg={colorScheme === "dark" ? "dark.7" : "gray.0"}
                            style={{
                              borderColor:
                                colorScheme === "dark"
                                  ? theme.colors.dark[5]
                                  : theme.colors.gray[1],
                            }}
                          >
                            <Text
                              size="sm"
                              dangerouslySetInnerHTML={{
                                __html: sanitizeAndHighlight(
                                  ticket.ticket_notes
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

            {/* Pagination Component */}
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
                  <Text size="sm" c="dimmed">
                    Rows per page:
                  </Text>
                  <NativeSelect
                    value={rowsPerPage.toString()}
                    onChange={(event) =>
                      handleRowsPerPageChange(event.currentTarget.value)
                    }
                    data={rowsPerPageOptions.map((option) => option.toString())}
                    style={{
                      width: "70px",
                      marginRight: theme.spacing.md,
                    }}
                    size="sm"
                  />
                  <Text size="sm" c="dimmed">
                    {showingInfoText}
                  </Text>
                </Group>

                <Group
                  style={{
                    order: isMobile ? 1 : 2,
                    width: isMobile ? "100%" : "auto",
                    justifyContent: isMobile ? "center" : "flex-end",
                  }}
                >
                  <Pagination
                    value={currentPage}
                    onChange={setCurrentPage}
                    total={totalPages}
                    siblings={isMobile ? 0 : 1}
                    boundaries={isMobile ? 1 : 1}
                    size={isMobile ? "sm" : "md"}
                  />
                </Group>
              </Group>
            </Box>
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
