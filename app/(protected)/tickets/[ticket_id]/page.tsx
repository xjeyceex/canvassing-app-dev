"use client";

import {
  getCanvassDetails,
  getComments,
  getTicketDetails,
} from "@/actions/get";
import { canvassAction } from "@/actions/post";
import TicketStatusAndActions from "@/app/(protected)/tickets/[ticket_id]/_components/TicketStatusAndActions";
import CanvassForm from "@/components/CanvassForm";
import CommentThread from "@/components/CommentThread";
import EditCanvassForm from "@/components/EditCanvassForm";
import LoadingStateProtected from "@/components/LoadingStateProtected";
import { useUserStore } from "@/stores/userStore";
import { formatDate, getNameInitials } from "@/utils/functions";
import {
  CanvassAttachment,
  CanvassDetail,
  CommentType,
  TicketDetailsType,
} from "@/utils/types";
import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  Collapse,
  Container,
  Divider,
  Grid,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconFile,
  IconFileText,
} from "@tabler/icons-react";
import DOMPurify from "dompurify";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const TicketDetailsPage = () => {
  const { ticket_id } = useParams() as { ticket_id: string };
  const router = useRouter();

  const { user } = useUserStore();
  // const { setComments } = useCommentsStore();
  const { colorScheme } = useMantineColorScheme();

  const [comments, setComments] = useState<CommentType[]>([]);
  const [ticket, setTicket] = useState<TicketDetailsType | null>(null);
  const [canvassDetails, setCanvassDetails] = useState<CanvassDetail[] | null>(
    null
  );
  const [isFormVisible, setIsFormVisible] = useState(true);
  const [isCanvasVisible, setIsCanvasVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [canvasLoading, setCanvasLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const userApprovalStatus = ticket?.reviewers.find(
    (reviewer) => reviewer.reviewer_id === user?.user_id
  )?.approval_status;

  const isDisabled =
    userApprovalStatus === "APPROVED" || userApprovalStatus === "REJECTED";

  const fetchTicketDetails = async () => {
    if (!ticket_id) return;
    const tickets = await getTicketDetails(ticket_id);
    if (Array.isArray(tickets) && tickets.length > 0) {
      setTicket(tickets[0]);
    }
    setLoading(false);
  };

  const fetchCanvassDetails = async () => {
    if (!ticket_id) return;

    setCanvasLoading(true);
    try {
      const data = await getCanvassDetails({ ticketId: ticket_id });
      setCanvassDetails(data);
    } finally {
      setCanvasLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const fetchedComments = await getComments(ticket_id);
      setComments(fetchedComments);
    } catch (error) {
      console.error("Unexpected error:", error);
    }
  };

  const handleCanvassAction = async (status: string) => {
    if (!user || isProcessing) return;

    setIsProcessing(true);
    try {
      await canvassAction(ticket_id, user.user_id, status); // Pass the status argument
    } catch (error) {
      console.error("Error starting canvass:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    fetchTicketDetails();
    fetchComments();
    fetchCanvassDetails();
  }, []);

  if (!user || loading) {
    return <LoadingStateProtected />;
  }

  if (!ticket) {
    return (
      <Container size="sm" py="xl">
        <Title>Ticket Not Found</Title>
        <Text>Sorry, the ticket does not exist.</Text>
        <Link href="/dashboard">
          <Button mt="md">Back to Dashboard</Button>
        </Link>
      </Container>
    );
  }

  const isAdmin = user?.user_role === "ADMIN";
  const isSharedToMe = ticket.shared_users?.some(
    (u) => u.user_id === user?.user_id
  );
  const isReviewer = ticket.reviewers?.some(
    (r) => r.reviewer_id === user?.user_id
  );
  // const isManager = user?.user_role === "MANAGER";

  // ✅ Check if the user is the creator of the ticket
  const isCreator = ticket.ticket_created_by === user?.user_id;

  if (!isAdmin && !isSharedToMe && !isReviewer && !isCreator) {
    return (
      <Container size="sm" py="xl">
        <Title>Unauthorized Access</Title>
        <Text>You do not have permission to view this ticket.</Text>
        <Link href="/dashboard">
          <Button mt="md">Back to Dashboard</Button>
        </Link>
      </Container>
    );
  }

  return (
    <Box p={{ base: "lg", sm: "xl" }}>
      {/* Header Section with Back Button */}
      <Stack gap={2} mb="sm">
        <Button
          variant="light"
          onClick={() => router.push("/tickets")}
          leftSection={<IconArrowLeft size={16} />}
          radius="md"
          w="fit-content"
          mb="xl"
        >
          Back to Tickets
        </Button>
        <Group>
          <Title
            pl="xs"
            order={2}
            styles={(theme) => ({
              root: {
                borderLeft: `4px solid ${theme.colors.blue[5]}`,
                position: "relative",
              },
            })}
          >
            Ticket:{" "}
            <Badge
              fz="sm"
              fw="500"
              p="xs"
              style={{ position: "relative", top: -3 }}
            >
              {ticket.ticket_name}
            </Badge>
          </Title>
        </Group>
      </Stack>

      {/* Main Content Grid */}
      <Grid gutter="lg">
        {/* Left Column */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper
            radius="lg"
            shadow="sm"
            p="xl"
            withBorder
            style={(theme) => ({
              backgroundColor:
                colorScheme === "dark" ? theme.colors.dark[6] : theme.white,
              borderColor:
                colorScheme === "dark"
                  ? theme.colors.dark[5]
                  : theme.colors.gray[1],
            })}
          >
            {/* Ticket Header */}
            <Group align="center" justify="space-between">
              <Group gap="md">
                <Box pos="relative">
                  <Avatar
                    src={ticket.ticket_created_by_avatar || undefined}
                    radius="xl"
                    size={56}
                  >
                    {ticket.ticket_created_by_avatar
                      ? null
                      : getNameInitials(ticket.ticket_created_by_name || "")}
                  </Avatar>
                </Box>
                <Stack gap={3}>
                  <Text size="xs" fw={600} tt="uppercase" c="dimmed">
                    Raised by
                  </Text>
                  <Text size="lg" fw={700}>
                    {ticket.ticket_created_by_name}
                  </Text>
                  <Group gap={4}>
                    <ThemeIcon size="xs" color="gray" variant="light">
                      <IconClock size={10} />
                    </ThemeIcon>
                    <Text size="xs" c="dimmed">
                      {formatDate(ticket.ticket_date_created)}
                    </Text>
                  </Group>
                </Stack>
              </Group>

              <Tooltip label={isFormVisible ? "Hide details" : "Show details"}>
                <ActionIcon
                  variant={isFormVisible ? "light" : "filled"}
                  onClick={() => setIsFormVisible((prev) => !prev)}
                  color={isFormVisible ? "gray" : "blue"}
                  radius="xl"
                  size={30}
                >
                  {isFormVisible ? (
                    <IconChevronUp size={18} />
                  ) : (
                    <IconChevronDown size={18} />
                  )}
                </ActionIcon>
              </Tooltip>
            </Group>

            {/* Ticket Details Collapse */}
            <Collapse in={isFormVisible}>
              {isFormVisible && (
                <>
                  {/* Ticket Details */}
                  <Grid gutter="lg" mt={isFormVisible ? "lg" : 0}>
                    {/* Left Column (Item Name, Item Description, Specifications) */}
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Stack gap="lg">
                        {/* Item Name */}
                        <Stack gap={4}>
                          <Text size="md" c="dimmed" fw={500}>
                            Item Name:
                          </Text>
                          <Text fw={500}>{ticket.ticket_item_name}</Text>
                        </Stack>

                        {/* Item Description */}
                        <Stack gap={4}>
                          <Text size="md" c="dimmed" fw={500}>
                            Item Description:
                          </Text>
                          <Text fw={500}>{ticket.ticket_item_description}</Text>
                        </Stack>

                        {/* Specifications */}
                        {ticket.ticket_specifications && (
                          <Stack gap={0}>
                            <Text size="md" c="dimmed" fw={500}>
                              Specifications:
                            </Text>
                            <Text
                              dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(
                                  ticket.ticket_specifications
                                ),
                              }}
                            />
                          </Stack>
                        )}
                      </Stack>
                    </Grid.Col>

                    {/* Right Column (RF Date Received, Quantity, Notes) */}
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Stack gap="lg">
                        {/* RF Date Received */}
                        <Stack gap={4} mt="xs">
                          <Text size="md" c="dimmed" fw={500}>
                            RF Date Received:
                          </Text>
                          <Text fw={500}>
                            {new Date(
                              ticket.ticket_rf_date_received
                            ).toLocaleString("en-US", {
                              timeZone: "Asia/Manila",
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </Text>
                        </Stack>

                        {/* Quantity */}
                        <Stack gap={4}>
                          <Text size="md" c="dimmed" fw={500}>
                            Quantity:
                          </Text>
                          <Text fw={500}>{ticket.ticket_quantity}</Text>
                        </Stack>

                        {/* Notes */}
                        {ticket.ticket_notes && (
                          <Stack gap={4}>
                            <Text size="md" c="dimmed" fw={500}>
                              Notes:
                            </Text>
                            <Text
                              dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(ticket.ticket_notes),
                              }}
                            />
                          </Stack>
                        )}
                      </Stack>
                    </Grid.Col>
                  </Grid>

                  {/* Canvass Form Section */}
                  {ticket?.ticket_status !== "FOR CANVASS" && (
                    <>
                      <Divider mb="lg" mt="xl" />
                      <Box px="sm">
                        {canvasLoading ? (
                          <Center>
                            <Loader size="sm" variant="dots" />
                          </Center>
                        ) : (
                          <Stack gap="xl">
                            <Group justify="space-between">
                              <Group gap="md">
                                <ThemeIcon
                                  size="xl"
                                  radius="md"
                                  variant="light"
                                  color="blue"
                                >
                                  <IconFileText size={20} stroke={1.5} />
                                </ThemeIcon>
                                <Text fz="lg" fw={600}>
                                  Canvass Form{" "}
                                  {ticket.ticket_revised_by !== null && (
                                    <Text fz="sm" c="dimmed" span>
                                      (Revised)
                                    </Text>
                                  )}
                                </Text>
                              </Group>

                              <ActionIcon
                                variant="light"
                                color="gray"
                                radius="xl"
                                size={30}
                                onClick={() =>
                                  setIsCanvasVisible((prev) => !prev)
                                }
                              >
                                {isCanvasVisible ? (
                                  <IconChevronUp size={18} />
                                ) : (
                                  <IconChevronDown size={18} />
                                )}
                              </ActionIcon>
                            </Group>

                            <Collapse in={isCanvasVisible}>
                              {/* Case 1: Show existing canvass details */}
                              {ticket.ticket_status !== "WORK IN PROGRESS" &&
                              ticket.ticket_status !== "FOR REVISION" &&
                              (canvassDetails?.length ?? 0) > 0 ? (
                                <>
                                  {canvassDetails?.map(
                                    (canvass: CanvassDetail) => (
                                      <Box
                                        key={canvass.canvass_form_id}
                                        mb="md"
                                      >
                                        <Grid gutter="lg">
                                          <Grid.Col span={6}>
                                            <Stack gap="xl">
                                              {/* RF Date Received */}
                                              <Stack gap={4}>
                                                <Text
                                                  size="md"
                                                  c="dimmed"
                                                  fw={500}
                                                >
                                                  RF Date Received:
                                                </Text>
                                                <Text fw={500}>
                                                  {new Date(
                                                    canvass.canvass_form_rf_date_received
                                                  ).toLocaleString("en-US", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                  })}
                                                </Text>
                                              </Stack>

                                              {/* Lead Time */}
                                              <Stack gap={4}>
                                                <Text
                                                  size="md"
                                                  c="dimmed"
                                                  fw={500}
                                                >
                                                  Lead Time:
                                                </Text>
                                                <Text fw={500}>
                                                  {
                                                    canvass.canvass_form_lead_time_day
                                                  }
                                                </Text>
                                              </Stack>

                                              {/* Payment Terms */}
                                              <Stack gap={4}>
                                                <Text
                                                  size="md"
                                                  c="dimmed"
                                                  fw={500}
                                                >
                                                  Payment Terms:
                                                </Text>
                                                <Text fw={500}>
                                                  {
                                                    canvass.canvass_form_payment_terms
                                                  }
                                                </Text>
                                              </Stack>

                                              {/* Submitted By */}
                                              <Stack gap={4}>
                                                <Text
                                                  size="md"
                                                  c="dimmed"
                                                  fw={500}
                                                >
                                                  Submitted By:
                                                </Text>
                                                <Group gap="md">
                                                  <Avatar
                                                    variant="light"
                                                    radius="xl"
                                                    size="md"
                                                    src={
                                                      canvass.submitted_by
                                                        .user_avatar ||
                                                      undefined
                                                    }
                                                  >
                                                    {canvass.submitted_by
                                                      .user_avatar
                                                      ? null
                                                      : getNameInitials(
                                                          canvass.submitted_by
                                                            .user_full_name ||
                                                            ""
                                                        )}
                                                  </Avatar>
                                                  <Stack gap={0}>
                                                    <Text fw={500}>
                                                      {canvass.submitted_by
                                                        .user_full_name ||
                                                        "Unknown"}
                                                    </Text>
                                                    <Text size="xs" c="dimmed">
                                                      {new Date(
                                                        canvass.canvass_form_date_submitted
                                                      ).toLocaleString(
                                                        "en-US",
                                                        {
                                                          timeZone:
                                                            "Asia/Manila",
                                                          month: "short",
                                                          day: "2-digit",
                                                          year: "numeric",
                                                          hour: "2-digit",
                                                          minute: "2-digit",
                                                          hour12: true,
                                                        }
                                                      )}
                                                    </Text>
                                                  </Stack>
                                                </Group>
                                              </Stack>
                                            </Stack>
                                          </Grid.Col>
                                          <Grid.Col span={6}>
                                            <Stack gap="xl">
                                              {/* Recommended Supplier */}
                                              <Stack gap={4}>
                                                <Text
                                                  size="md"
                                                  c="dimmed"
                                                  fw={500}
                                                >
                                                  Recommended Supplier:
                                                </Text>
                                                <Text fw={500}>
                                                  {
                                                    canvass.canvass_form_recommended_supplier
                                                  }
                                                </Text>
                                              </Stack>

                                              {/* Total Amount */}
                                              <Stack gap={4}>
                                                <Text
                                                  size="md"
                                                  c="dimmed"
                                                  fw={500}
                                                >
                                                  Total Amount:
                                                </Text>
                                                <Text fw={500}>
                                                  ₱
                                                  {canvass.canvass_form_total_amount.toFixed(
                                                    2
                                                  )}
                                                </Text>
                                              </Stack>

                                              {/* Canvass Attachments */}
                                              {canvass.attachments.length >
                                                0 && (
                                                <Stack gap={4}>
                                                  <Text
                                                    size="md"
                                                    c="dimmed"
                                                    fw={500}
                                                  >
                                                    Attachments:
                                                  </Text>
                                                  <Group gap="xs">
                                                    {canvass.attachments.map(
                                                      (
                                                        attachment: CanvassAttachment
                                                      ) => (
                                                        <Link
                                                          key={
                                                            attachment.canvass_attachment_id
                                                          }
                                                          href={
                                                            attachment.canvass_attachment_url ||
                                                            "#"
                                                          }
                                                          target="_blank"
                                                        >
                                                          <Tooltip
                                                            label={`${
                                                              attachment.canvass_attachment_type ||
                                                              "Document"
                                                            } - ${new Date(
                                                              attachment.canvass_attachment_created_at
                                                            ).toLocaleDateString()}`}
                                                          >
                                                            <ActionIcon
                                                              variant="light"
                                                              color="blue"
                                                              size="lg"
                                                              radius="md"
                                                            >
                                                              <IconFile
                                                                size={20}
                                                              />
                                                            </ActionIcon>
                                                          </Tooltip>
                                                        </Link>
                                                      )
                                                    )}
                                                  </Group>
                                                </Stack>
                                              )}

                                              {/* Revised By */}
                                              {ticket.ticket_revised_by !==
                                                null && (
                                                <Stack gap={4}>
                                                  <Text
                                                    size="md"
                                                    c="dimmed"
                                                    fw={500}
                                                  >
                                                    Revised By:
                                                  </Text>
                                                  <Group gap="md">
                                                    <Avatar
                                                      variant="light"
                                                      radius="xl"
                                                      size="md"
                                                      src={
                                                        ticket.ticket_revised_by_avatar ||
                                                        undefined
                                                      }
                                                    >
                                                      {ticket.ticket_revised_by_avatar
                                                        ? null
                                                        : getNameInitials(
                                                            ticket.ticket_revised_by_name ||
                                                              ""
                                                          )}
                                                    </Avatar>
                                                    <Stack gap={0}>
                                                      <Text fw={500}>
                                                        {ticket.ticket_revised_by_name ||
                                                          "Unknown"}
                                                      </Text>
                                                      <Text
                                                        size="xs"
                                                        c="dimmed"
                                                      >
                                                        {new Date(
                                                          canvass.canvass_form_updated_at
                                                        ).toLocaleString(
                                                          "en-US",
                                                          {
                                                            timeZone:
                                                              "Asia/Manila",
                                                            month: "short",
                                                            day: "2-digit",
                                                            year: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                            hour12: true,
                                                          }
                                                        )}
                                                      </Text>
                                                    </Stack>
                                                  </Group>
                                                </Stack>
                                              )}
                                            </Stack>
                                          </Grid.Col>
                                        </Grid>
                                      </Box>
                                    )
                                  )}
                                </>
                              ) : user?.user_id === ticket?.ticket_created_by &&
                                ticket?.ticket_status !== "CANCELED" &&
                                ticket?.ticket_status !== "FOR REVISION" ? (
                                <>
                                  <CanvassForm
                                    ticketName={ticket?.ticket_name}
                                    ticketId={ticket?.ticket_id}
                                    updateCanvassDetails={fetchCanvassDetails}
                                    updateTicketDetails={fetchTicketDetails}
                                  />
                                </>
                              ) : isReviewer &&
                                ticket?.ticket_status !== "CANCELED" ? (
                                <>
                                  <EditCanvassForm
                                    ticket={ticket}
                                    updateCanvassDetails={fetchCanvassDetails}
                                    setTicket={setTicket}
                                    currentCanvassDetails={canvassDetails!}
                                    updateTicketDetails={fetchTicketDetails}
                                  />
                                </>
                              ) : (
                                <Alert variant="light" color="gray" radius="md">
                                  <Text>
                                    Canvass form is not available yet.
                                  </Text>
                                </Alert>
                              )}
                            </Collapse>
                          </Stack>
                        )}
                      </Box>
                    </>
                  )}
                </>
              )}
            </Collapse>
          </Paper>

          <Paper
            mt="lg"
            radius="lg"
            shadow="sm"
            p="xl"
            withBorder
            style={(theme) => ({
              backgroundColor:
                colorScheme === "dark" ? theme.colors.dark[6] : theme.white,
              borderColor:
                colorScheme === "dark"
                  ? theme.colors.dark[5]
                  : theme.colors.gray[1],
            })}
          >
            <Text mb="md" size="xl" fw={700}>
              Activity
            </Text>
            {/* Comment thread realtime backup */}
            {/* <CommentThread ticket_id={ticket_id}/> */}
            <CommentThread
              ticket_id={ticket_id}
              comments={comments}
              setComments={setComments}
              ticket_status={ticket.ticket_status}
            />
          </Paper>
        </Grid.Col>
        <TicketStatusAndActions
          ticket={ticket}
          isDisabled={isDisabled}
          fetchTicketDetails={fetchTicketDetails}
          handleCanvassAction={handleCanvassAction}
          updateCanvassDetails={fetchCanvassDetails}
          updateTicketDetails={fetchTicketDetails}
          updateComments={fetchComments}
        />
      </Grid>
    </Box>
  );
};

export default TicketDetailsPage;
