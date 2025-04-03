"use client";

import { getAllUsers, getTicketDetails } from "@/actions/get";
import { addComment, notifyUser, shareTicket } from "@/actions/post";
import { revertApprovalStatus, updateApprovalStatus } from "@/actions/update";
import ConfirmationModal from "@/components/ConfirmationModal";
import { useUserStore } from "@/stores/userStore";
import { getNameInitials } from "@/utils/functions";
import { TicketDetailsType } from "@/utils/types";
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Grid,
  Group,
  Modal,
  MultiSelect,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  useMantineColorScheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconClipboardCheck,
  IconClipboardX,
  IconEdit,
  IconPlus,
  IconShoppingCartFilled,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Props = {
  ticket: TicketDetailsType;
  isDisabled: boolean;
  handleCanvassAction: (action: string) => void;
  fetchTicketDetails: () => Promise<void>;
  updateCanvassDetails?: () => void;
  updateTicketDetails: () => void;
  updateComments: () => void;
};

const TicketStatusAndActions = ({
  ticket,
  isDisabled,
  fetchTicketDetails,
  handleCanvassAction,
  updateTicketDetails,
  updateComments,
}: Props) => {
  const { user } = useUserStore();

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [isSharingLoading, setIsSharingLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);

  // Confirmation Modal States
  const [openReviewerApprovalModal, setOpenReviewerApprovalModal] =
    useState(false);
  const [openManagerApprovalModal, setOpenManagerApprovalModal] =
    useState(false);
  const [openReviseModal, setOpenReviseModal] = useState(false);
  const [openCancelRequestModal, setOpenCancelRequestModal] = useState(false);
  const [openDeclineRequestModal, setOpenDeclineRequestModal] = useState(false);

  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<{ value: string; label: string }[]>(
    []
  );

  const { colorScheme } = useMantineColorScheme();

  const fetchUsers = async () => {
    const users = await getAllUsers(ticket.ticket_id);

    if ("error" in users) {
      console.error(users.message);
      return;
    }

    setAllUsers(users);
  };

  const isAdmin = user?.user_role === "ADMIN";
  const isReviewer = ticket.reviewers?.some(
    (r) => r.reviewer_id === user?.user_id
  );
  const isManager = user?.user_role === "MANAGER";
  const isCreator = ticket.ticket_created_by === user?.user_id;

  const handleShareTicket = async () => {
    if (!selectedUsers.length || !ticket.ticket_id) return;

    setIsSharingLoading(true);

    try {
      await Promise.all(
        selectedUsers.map((userId) => shareTicket(ticket.ticket_id, userId))
      );

      await fetchTicketDetails!();

      setSelectedUsers([]);
      setAllUsers((prev) =>
        prev.filter((user) => !selectedUsers.includes(user.value))
      );
    } catch (error) {
      console.error("Error sharing ticket:", error);
    } finally {
      setIsSharingLoading(false);
      setIsSharing(false);
    }
  };

  const handleStartCanvass = async () => {
    if (!user) {
      console.error("User not logged in.");
      return;
    }

    setIsStatusLoading(true);
    try {
      if (newComment.trim()) {
        await addComment(ticket.ticket_id, newComment, user.user_id);
        updateComments();
        setNewComment("");
      }

      handleCanvassAction("WORK IN PROGRESS");
      updateTicketDetails();
    } catch (error) {
      console.error("Error adding comment or starting canvass:", error);
    } finally {
      setIsStatusLoading(false);
    }
  };

  const handleReviewerApproval = async () => {
    if (!user) {
      console.error("User not logged in.");
      return;
    }

    setIsStatusLoading(true);

    // Fetch latest ticket details and use them immediately
    await fetchTicketDetails(); // Ensure state is updated before proceeding
    const latestTicket = await getTicketDetails(ticket?.ticket_id); // Fetch directly

    if (!latestTicket || latestTicket.length === 0) {
      console.error("Failed to fetch latest ticket details.");
      setIsStatusLoading(false);
      return;
    }

    const currentTicket = latestTicket[0];

    if (currentTicket.ticket_status === "CANCELED") {
      notifications.show({
        title: "Failed",
        message: "Ticket has been canceled.",
        color: "red",
        icon: <IconX size={16} />,
      });
      setIsStatusLoading(false);
      return;
    }

    const newApprovalStatus =
      approvalStatus === "APPROVED" ? "APPROVED" : "REJECTED";

    // Optimistically update only my approval status
    const updatedReviewers = currentTicket.reviewers.map(
      (reviewer: TicketDetailsType["reviewers"][0]) =>
        reviewer.reviewer_id === user.user_id
          ? { ...reviewer, approval_status: newApprovalStatus }
          : reviewer
    );

    // Check if all non-managers have approved
    const nonManagerReviewers = updatedReviewers.filter(
      (reviewer: TicketDetailsType["reviewers"][0]) =>
        reviewer.reviewer_role !== "MANAGER"
    );

    const isSingleReviewer = nonManagerReviewers.length === 1;
    const allApproved =
      nonManagerReviewers.length > 0 &&
      nonManagerReviewers.every(
        (reviewer: TicketDetailsType["reviewers"][0]) =>
          reviewer.approval_status === "APPROVED"
      );

    const newTicketStatus = allApproved
      ? "FOR APPROVAL"
      : isSingleReviewer && newApprovalStatus === "REJECTED"
      ? "REJECTED"
      : currentTicket.ticket_status;

    try {
      if (newComment.trim()) {
        await addComment(currentTicket.ticket_id, newComment, user.user_id);
        updateComments();
      }

      await updateApprovalStatus({
        approval_ticket_id: currentTicket.ticket_id,
        approval_review_status: newApprovalStatus,
        approval_reviewed_by: user.user_id,
      });

      if (allApproved) {
        for (const manager of currentTicket.reviewers.filter(
          (reviewer: TicketDetailsType["reviewers"][0]) =>
            reviewer.reviewer_role === "MANAGER"
        )) {
          await updateApprovalStatus({
            approval_ticket_id: currentTicket.ticket_id,
            approval_review_status: "AWAITING ACTION",
            approval_reviewed_by: manager.reviewer_id,
          });

          const message = `The ticket ${currentTicket.ticket_name} has been approved by all reviewers and is now awaiting your action.`;
          await notifyUser(
            manager.reviewer_id,
            message,
            currentTicket.ticket_id
          );
        }
      }

      handleCanvassAction(newTicketStatus);
      setApprovalStatus(null);
      updateTicketDetails();
    } catch (error) {
      console.error("Error updating approval:", error);
    } finally {
      setIsStatusLoading(false);
    }
  };

  const handleManagerApproval = async () => {
    if (!user || !isManager) {
      console.error("Only managers can finalize.");
      return;
    }

    setIsStatusLoading(true);

    await fetchTicketDetails();
    const latestTicket = await getTicketDetails(ticket?.ticket_id);

    if (!latestTicket || latestTicket.length === 0) {
      console.error("Failed to fetch latest ticket details.");
      setIsStatusLoading(false);
      return;
    }

    const currentTicket = latestTicket[0];

    if (currentTicket.ticket_status === "CANCELED") {
      notifications.show({
        title: "Failed",
        message: "Ticket has been canceled.",
        color: "red",
        icon: <IconX size={16} />,
      });
      setIsStatusLoading(false);
      return;
    }

    const newApprovalStatus =
      approvalStatus === "APPROVED" ? "APPROVED" : "REJECTED";

    // Optimistically update only the manager's approval status
    const updatedReviewers = currentTicket.reviewers.map(
      (reviewer: TicketDetailsType["reviewers"][0]) =>
        reviewer.reviewer_role === "MANAGER" &&
        reviewer.reviewer_id === user.user_id
          ? { ...reviewer, approval_status: newApprovalStatus }
          : reviewer
    );

    // Filter only managers
    const managerReviewers = updatedReviewers.filter(
      (reviewer: TicketDetailsType["reviewers"][0]) =>
        reviewer.reviewer_role === "MANAGER"
    );

    const isSingleManager = managerReviewers.length === 1;
    const allManagersApproved =
      managerReviewers.length > 0 &&
      managerReviewers.every(
        (reviewer: TicketDetailsType["reviewers"][0]) =>
          reviewer.approval_status === "APPROVED"
      );

    // Handle single or multiple manager approvals
    const newTicketStatus = allManagersApproved
      ? "DONE"
      : isSingleManager && newApprovalStatus === "REJECTED"
      ? "REJECTED"
      : currentTicket.ticket_status;

    try {
      if (newComment.trim()) {
        await addComment(currentTicket.ticket_id, newComment, user.user_id);
        updateComments();
      }

      await updateApprovalStatus({
        approval_ticket_id: currentTicket.ticket_id,
        approval_review_status: newApprovalStatus,
        approval_reviewed_by: user.user_id,
      });

      handleCanvassAction(newTicketStatus);
      setApprovalStatus(null);
      updateTicketDetails();
    } catch (error) {
      console.error("Error finalizing approval:", error);
    } finally {
      setIsStatusLoading(false);
    }
  };

  const handleRevision = async () => {
    if (!user || !ticket) {
      console.error("User not logged in or ticket is undefined.");
      return;
    }
    setIsStatusLoading(true);

    try {
      if (newComment.trim()) {
        await addComment(ticket.ticket_id, newComment, user.user_id);
        updateComments();
      }

      // Revert approval status
      await revertApprovalStatus(ticket.ticket_id);
      handleCanvassAction("FOR REVISION");
      updateTicketDetails();
      setApprovalStatus(null);
    } catch (error) {
      console.error("Error requesting revision:", error);
    } finally {
      setIsStatusLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!user || !ticket) {
      console.error("User not logged in or ticket is undefined.");
      return;
    }
    setIsStatusLoading(true);

    try {
      if (newComment.trim()) {
        // Add comment before reverting approval status
        await addComment(ticket.ticket_id, newComment, user.user_id);

        updateComments();
      }

      // Revert approval status
      await revertApprovalStatus(ticket.ticket_id);

      handleCanvassAction("CANCELED");
      updateTicketDetails();
    } catch (error) {
      console.error("Error requesting revision:", error);
    } finally {
      setIsStatusLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!user || !ticket) {
      console.error("User not logged in or ticket is undefined.");
      return;
    }
    setIsStatusLoading(true);

    try {
      // Revert approval status
      await revertApprovalStatus(ticket.ticket_id);
      handleCanvassAction("DECLINED");
      updateTicketDetails();
      setApprovalStatus(null);
    } catch (error) {
      console.error("Error declining ticket:", error);
    } finally {
      setIsStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <>
      <Grid.Col span={{ base: 12, md: 4 }}>
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
          <Stack>
            {/* Status Section */}
            <Box>
              <Text size="md" fw={500} c="dimmed" mb="sm">
                Status
              </Text>

              {isStatusLoading ? (
                <Skeleton height={40} radius="md" />
              ) : (
                <Badge
                  py="md"
                  size="lg"
                  radius="md"
                  color={
                    ticket?.ticket_status === "FOR REVIEW OF SUBMISSIONS"
                      ? "yellow"
                      : ticket?.ticket_status === "FOR APPROVAL"
                      ? "yellow"
                      : ticket?.ticket_status === "WORK IN PROGRESS"
                      ? "blue"
                      : ticket?.ticket_status === "FOR REVISION"
                      ? "orange"
                      : ticket?.ticket_status === "DONE"
                      ? "teal"
                      : ticket?.ticket_status === "DECLINED"
                      ? "red"
                      : "gray"
                  }
                  fullWidth
                >
                  {ticket?.ticket_status}
                </Badge>
              )}
            </Box>

            {/* Actions Section */}
            {!(
              ticket?.ticket_status === "CANCELED" ||
              ticket?.ticket_status === "DONE" ||
              ticket?.ticket_status === "DECLINED"
            ) && (
              <Box>
                <Text size="md" fw={500} c="dimmed" mb="sm">
                  Actions
                </Text>
                <Stack gap="sm">
                  {ticket?.ticket_status === "FOR CANVASS" && isCreator && (
                    <Group grow style={{ width: "100%" }}>
                      <Button
                        leftSection={<IconClipboardCheck size={18} />}
                        radius="md"
                        variant="light"
                        color="blue"
                        loading={isStatusLoading}
                        disabled={isStatusLoading}
                        style={{ flex: 1 }}
                        onClick={handleStartCanvass} // Directly call the function
                      >
                        Start Canvass
                      </Button>
                    </Group>
                  )}

                  {ticket?.ticket_status === "FOR REVIEW OF SUBMISSIONS" &&
                    isReviewer &&
                    user?.user_role !== "MANAGER" && (
                      <Group grow style={{ width: "100%" }}>
                        <Button
                          leftSection={<IconClipboardCheck size={18} />}
                          radius="md"
                          color="teal"
                          loading={isStatusLoading}
                          disabled={isDisabled}
                          onClick={() => {
                            setApprovalStatus("APPROVED");
                            setOpenReviewerApprovalModal(true);
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          leftSection={<IconEdit size={18} />}
                          radius="md"
                          color="yellow"
                          variant="light"
                          loading={isStatusLoading}
                          disabled={isDisabled}
                          onClick={() => {
                            setApprovalStatus("NEEDS_REVISION");
                            setOpenReviseModal(true);
                          }}
                        >
                          Needs Revision
                        </Button>
                      </Group>
                    )}

                  {ticket?.ticket_status === "FOR APPROVAL" && isManager && (
                    <Group grow style={{ width: "100%" }}>
                      <Button
                        leftSection={<IconClipboardCheck size={18} />}
                        radius="md"
                        color="teal"
                        loading={isStatusLoading}
                        disabled={isStatusLoading}
                        onClick={() => {
                          setApprovalStatus("APPROVED");
                          setOpenManagerApprovalModal(true);
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        leftSection={<IconClipboardX size={18} />}
                        radius="md"
                        color="red"
                        loading={isStatusLoading}
                        disabled={isStatusLoading}
                        variant="light"
                        onClick={() => {
                          setApprovalStatus("DECLINED");
                          setOpenDeclineRequestModal(true);
                        }}
                      >
                        Decline
                      </Button>
                    </Group>
                  )}
                  <Group grow style={{ width: "100%" }}>
                    <Button
                      variant="light"
                      color="red"
                      leftSection={<IconX size={18} />}
                      radius="md"
                      loading={isStatusLoading}
                      disabled={isStatusLoading}
                      style={{ flex: 1 }} // Takes full width when alone
                      onClick={() => setOpenCancelRequestModal(true)}
                    >
                      Cancel Request
                    </Button>
                  </Group>
                </Stack>
              </Box>
            )}

            <Divider />

            {/* Request Info Section */}
            <Box>
              <Text size="md" fw={500} c="dimmed" mb="sm">
                Request Type
              </Text>
              <Group gap="md">
                <ThemeIcon size="xl" color="blue" variant="light" radius="md">
                  <IconShoppingCartFilled size={20} />
                </ThemeIcon>
                <Stack gap={2}>
                  <Text size="md" fw={500}>
                    Sourcing
                  </Text>
                  <Text size="sm" c="dimmed">
                    Procurement Request
                  </Text>
                </Stack>
              </Group>
            </Box>

            <Divider />

            {/* Reviewers Section */}
            {ticket.reviewers.length > 0 && (
              <Box>
                <Text size="md" fw={500} c="dimmed" mb="sm">
                  Reviewers
                </Text>
                <Stack gap="md">
                  {ticket.reviewers
                    .filter(
                      (manager) =>
                        manager.reviewer_role === "MANAGER" &&
                        manager.approval_status !== "PENDING"
                    )
                    .map((manager) => (
                      <Group
                        key={manager.reviewer_id}
                        align="center"
                        justify="space-between"
                      >
                        <Flex gap="xs" align="center">
                          <Link
                            href={`/profile/${manager.reviewer_id}`}
                            passHref
                          >
                            <Avatar
                              src={manager.reviewer_avatar || undefined}
                              radius="xl"
                              size="md"
                            >
                              {manager.reviewer_avatar
                                ? null
                                : getNameInitials(manager.reviewer_name || "")}
                            </Avatar>
                          </Link>
                          <Stack gap={2}>
                            <Link
                              href={`/profile/${manager.reviewer_id}`}
                              passHref
                              legacyBehavior
                            >
                              <a
                                style={{
                                  textDecoration: "none",
                                  color: "inherit",
                                }}
                              >
                                <Text
                                  size="sm"
                                  fw={500}
                                  td="none"
                                  style={{
                                    transition: "color 0.2s ease-in-out",
                                  }}
                                >
                                  {manager.reviewer_name}
                                </Text>
                              </a>
                            </Link>
                            <Text size="xs" c="dimmed">
                              Manager
                            </Text>
                          </Stack>
                        </Flex>
                        <Badge
                          size="sm"
                          color={
                            manager.approval_status === "APPROVED"
                              ? "green"
                              : manager.approval_status === "REJECTED"
                              ? "red"
                              : "gray"
                          }
                        >
                          {manager.approval_status}
                        </Badge>
                      </Group>
                    ))}

                  {/* Regular Reviewers */}
                  {ticket.reviewers
                    .filter((reviewer) => reviewer.reviewer_role !== "MANAGER")
                    .map((reviewer) => (
                      <Group
                        key={reviewer.reviewer_id}
                        align="center"
                        justify="space-between"
                      >
                        <Flex gap="xs" align="center">
                          <Link
                            href={`/profile/${reviewer.reviewer_id}`}
                            passHref
                          >
                            <Avatar
                              src={reviewer.reviewer_avatar || undefined}
                              radius="xl"
                              size="md"
                            >
                              {reviewer.reviewer_avatar
                                ? null
                                : getNameInitials(reviewer.reviewer_name || "")}
                            </Avatar>
                          </Link>
                          <Stack gap={2}>
                            <Link
                              href={`/profile/${reviewer.reviewer_id}`}
                              passHref
                              legacyBehavior
                            >
                              <a
                                style={{
                                  textDecoration: "none",
                                  color: "inherit",
                                }}
                              >
                                <Text
                                  size="sm"
                                  fw={500}
                                  td="none"
                                  style={{
                                    transition: "color 0.2s ease-in-out",
                                  }}
                                >
                                  {reviewer.reviewer_name}
                                </Text>
                              </a>
                            </Link>
                            <Text size="xs" c="dimmed">
                              Reviewer
                            </Text>
                          </Stack>
                        </Flex>
                        <Badge
                          size="sm"
                          color={
                            reviewer.approval_status === "APPROVED"
                              ? "green"
                              : reviewer.approval_status === "REJECTED"
                              ? "red"
                              : "gray"
                          }
                        >
                          {reviewer.approval_status}
                        </Badge>
                      </Group>
                    ))}
                </Stack>
              </Box>
            )}

            <Divider />

            {/* Shared with Section */}
            <Box>
              <Group justify="space-between" mb="sm">
                <Text size="md" fw={500} c="dimmed">
                  Shared with
                </Text>

                {(isCreator || isAdmin || isManager) && (
                  <Tooltip label="Share ticket">
                    <ActionIcon
                      variant="light"
                      color="blue"
                      onClick={() => setIsSharing(true)}
                      radius="md"
                      size="md"
                    >
                      <IconPlus size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                {/* Creator */}
                <Group gap="xs" align="center">
                  <Link href={`/profile/${ticket.ticket_created_by}`} passHref>
                    <Avatar
                      src={ticket.ticket_created_by_avatar || undefined}
                      radius="xl"
                      size="sm"
                    >
                      {ticket.ticket_created_by_avatar
                        ? null
                        : getNameInitials(ticket.ticket_created_by_name || "")}
                    </Avatar>
                  </Link>
                  <Stack gap={2} align="flex-start">
                    <Link
                      href={`/profile/${ticket.ticket_created_by}`}
                      passHref
                      legacyBehavior
                    >
                      <a
                        style={{
                          textDecoration: "none",
                          color: "inherit",
                        }}
                      >
                        <Text size="xs" fw={500}>
                          {ticket.ticket_created_by_name}
                        </Text>
                      </a>
                    </Link>
                    <Text size="10px" c="dimmed">
                      Creator
                    </Text>
                  </Stack>
                </Group>

                {/* Shared Users */}
                {isSharingLoading ? (
                  <Stack gap="sm">
                    <Skeleton height={32} radius="xl" />
                    <Skeleton height={32} radius="xl" />
                  </Stack>
                ) : (
                  <>
                    {ticket.shared_users.map((user) => (
                      <Group key={user.user_id} gap="xs" align="center">
                        <Link href={`/profile/${user.user_id}`} passHref>
                          <Avatar
                            src={user.user_avatar || undefined}
                            radius="xl"
                            size="sm"
                          >
                            {user.user_avatar
                              ? null
                              : getNameInitials(user.user_full_name || "")}
                          </Avatar>
                        </Link>
                        <Link
                          href={`/profile/${user.user_id}`}
                          passHref
                          legacyBehavior
                        >
                          <a
                            style={{
                              textDecoration: "none",
                              color: "inherit",
                            }}
                          >
                            <Text
                              size="xs"
                              fw={500}
                              td="none"
                              style={{
                                transition: "color 0.2s ease-in-out",
                              }}
                            >
                              {user.user_full_name}
                            </Text>
                          </a>
                        </Link>
                      </Group>
                    ))}
                  </>
                )}
              </SimpleGrid>
            </Box>
          </Stack>
        </Paper>

        {/* Share Modal */}
        {(isAdmin || isCreator) && (
          <Modal
            opened={isSharing}
            onClose={() => setIsSharing(false)}
            title="Share Ticket"
            centered
          >
            <MultiSelect
              data={allUsers}
              value={selectedUsers}
              onChange={setSelectedUsers}
              placeholder="Select users to share with"
              searchable
              clearable
            />
            <Button
              onClick={handleShareTicket}
              mt="md"
              loading={isSharingLoading}
              disabled={isSharingLoading}
            >
              {isSharingLoading ? "Sharing..." : "Share"}
            </Button>
          </Modal>
        )}
      </Grid.Col>

      {/* Reviewer Approval Modal */}
      <ConfirmationModal
        variant="success"
        title="Approve Ticket"
        description="Are you sure you want to approve this ticket?"
        isOpen={openReviewerApprovalModal}
        onClose={() => setOpenReviewerApprovalModal(false)}
        onConfirm={handleReviewerApproval}
        confirmText="Confirm"
      />

      {/* Manager Approval Modal */}
      <ConfirmationModal
        variant="success"
        title="Approve Ticket"
        description="Are you sure you want to approve this ticket?"
        isOpen={openManagerApprovalModal}
        onClose={() => setOpenManagerApprovalModal(false)}
        onConfirm={handleManagerApproval}
        confirmText="Confirm"
      />

      {/* Revise Ticket Modal */}
      <ConfirmationModal
        variant="warning"
        title="Revise Ticket"
        description="Are you sure you want to revise this ticket?"
        isOpen={openReviseModal}
        onClose={() => setOpenReviseModal(false)}
        onConfirm={handleRevision}
        confirmText="Confirm"
      />

      {/* Cancel Request Modal */}
      <ConfirmationModal
        variant="danger"
        title="Cancel Request"
        description="Are you want to cancel this request?"
        isOpen={openCancelRequestModal}
        onClose={() => setOpenCancelRequestModal(false)}
        onConfirm={handleCancelRequest}
        confirmText="Confirm"
      />

      {/* Decline Request Modal */}
      <ConfirmationModal
        variant="danger"
        title="Decline Request"
        description="Are you want to decline this request?"
        isOpen={openDeclineRequestModal}
        onClose={() => setOpenDeclineRequestModal(false)}
        onConfirm={handleDecline}
        confirmText="Confirm"
      />
    </>
  );
};

export default TicketStatusAndActions;
