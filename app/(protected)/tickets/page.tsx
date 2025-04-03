"use client";

import { getAllMyTickets } from "@/actions/get";
import LoadingStateProtected from "@/components/LoadingStateProtected";
import { useUserStore } from "@/stores/userStore";
import { formatDate } from "@/utils/functions";
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

const getStatusColor = (status: string) => {
  switch (status) {
    case "FOR CANVASS":
      return "indigo.6";
    case "WORK IN PROGRESS":
      return "blue.6";
    case "FOR REVIEW OF SUBMISSIONS":
      return "violet.6";
    case "FOR APPROVAL":
      return "teal.6";
    case "FOR REVISION":
      return "orange.6";
    case "DONE":
      return "green.6";
    case "CANCELED":
      return "red.7";
    default:
      return "gray.6";
  }
};

type TicketStatus =
  | "FOR CANVASS"
  | "WORK IN PROGRESS"
  | "FOR APPROVAL"
  | "DONE"
  | "CANCELED"
  | "FOR REVIEW OF SUBMISSIONS"
  | "FOR REVISION"
  | "DECLINED"
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
      (sharedUser) => sharedUser === user?.user_id
    );
    const isTicketOwner = ticket.ticket_created_by === user?.user_id;

    if (isPurchaser && !(isSharedWithUser || isTicketOwner)) {
      return false;
    }

    return true;
  });

  // Count tickets by status
  const getTicketCountByStatus = (status: TicketStatus) => {
    if (status === "all") {
      return availableTickets.length;
    }
    return availableTickets.filter((ticket) => ticket.ticket_status === status)
      .length;
  };

  // Filter and sort tickets based on active tab, sort preference, and search query
  const filteredTickets = availableTickets
    .filter((ticket) => {
      // Filter by tab
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

  if (!user || loading) {
    return <LoadingStateProtected />;
  }

  return (
    <Box p="lg">
      {/* Ticket List Header */}
      <Box mb="lg">
        <Group justify="space-between" align="center" mb="lg">
          <Group gap="xs">
            <Title order={2}>Tickets</Title>
            <Badge size="lg" variant="light">
              {availableTickets.length} total
            </Badge>
          </Group>

          <Group gap="sm">
            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <Button
                  variant="light"
                  size="sm"
                  leftSection={<IconFilter size={16} />}
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
              >
                <IconRefresh size={18} />
              </ActionIcon>
            </Tooltip>

            {(user.user_role === "PURCHASER" || user.user_role === "ADMIN") && (
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => router.push("/tickets/create-ticket")}
              >
                New Ticket
              </Button>
            )}
          </Group>
        </Group>

        <Input
          placeholder="Search tickets..."
          mb="md"
          size="md"
          leftSection={<IconSearch size={18} stroke={1.5} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
        />

        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tabs.List>
            {tabItems.map((tab) => (
              <Tabs.Tab
                key={tab.value}
                value={tab.value}
                color={
                  tab.value !== "all" ? getStatusColor(tab.value) : undefined
                }
              >
                <Group gap={8}>
                  {tab.label}
                  <Badge
                    size="sm"
                    radius="sm"
                    variant="filled"
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
      </Box>

      {filteredTickets.length > 0 ? (
        <Stack gap="lg">
          {filteredTickets.map((ticket) => (
            <Paper
              p="lg"
              key={ticket.ticket_id}
              radius="md"
              withBorder
              shadow="sm"
              style={{
                borderColor:
                  colorScheme === "dark"
                    ? theme.colors.dark[5]
                    : theme.colors.gray[1],
              }}
            >
              {/* Ticket Header - Always Visible */}
              <Group
                justify="space-between"
                wrap="nowrap"
                onClick={() => toggleTicketExpand(ticket.ticket_id)}
                style={{ cursor: "pointer" }}
              >
                <Box style={{ flex: 1 }}>
                  <Group mb={8}>
                    <Badge
                      variant="filled"
                      color={getStatusColor(ticket.ticket_status)}
                    >
                      {ticket.ticket_status}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      Created {formatDate(ticket.ticket_date_created)}
                    </Text>
                  </Group>
                  <Group gap="md">
                    <Text
                      fw={600}
                      size="sm"
                      dangerouslySetInnerHTML={{
                        __html: `#${highlightSearchTerm(ticket.ticket_name)}`,
                      }}
                    />
                    <Text
                      size="sm"
                      dangerouslySetInnerHTML={{
                        __html: highlightSearchTerm(ticket.ticket_item_name),
                      }}
                    />
                  </Group>
                </Box>
                <Group gap="xs">
                  <Button
                    component={Link}
                    href={`/tickets/${ticket.ticket_id}`}
                    variant="light"
                    size="sm"
                    rightSection={<IconChevronRight size={14} />}
                    onClick={(e) => e.stopPropagation()} // Prevent toggling when clicking the button
                  >
                    View Details
                  </Button>
                  <ActionIcon
                    variant="subtle"
                    size="lg"
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
                            __html: sanitizeAndHighlight(ticket.ticket_notes),
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
      ) : (
        <Paper
          p="xl"
          bg="gray.0"
          withBorder
          radius="md"
          shadow="sm"
          style={{
            borderColor:
              colorScheme === "dark"
                ? theme.colors.dark[5]
                : theme.colors.gray[1],
          }}
        >
          <Flex
            justify="center"
            align="center"
            direction="column"
            h="100%"
            mih={250}
          >
            <Group justify="center">
              <ThemeIcon size={48} radius="xl" variant="light" color="gray">
                <IconTicket size={24} />
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
                  size="sm"
                  onClick={() => router.push("/tickets/create-ticket")}
                  leftSection={<IconPlus size={14} />}
                >
                  Create New Ticket
                </Button>
              </Group>
            )}
          </Flex>
        </Paper>
      )}
    </Box>
  );
};

export default TicketList;
