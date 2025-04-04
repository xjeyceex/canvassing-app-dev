import { deleteComment } from "@/actions/delete";
import { addComment } from "@/actions/post";
import { editComment } from "@/actions/update";
import { useUserStore } from "@/stores/userStore";
import { CommentType } from "@/utils/types";
import {
  ActionIcon,
  Avatar,
  Box,
  Button,
  Container,
  Group,
  Loader,
  Menu,
  Modal,
  Paper,
  Skeleton,
  Text,
} from "@mantine/core";
import { IconDotsVertical, IconEdit, IconTrash } from "@tabler/icons-react";
import DOMPurify from "dompurify";
import React, { useEffect, useRef, useState } from "react";
import LoadingStateProtected from "./LoadingStateProtected";

import {
  RichTextEditor,
  RichTextEditorRef,
} from "@/components/ui/RichTextEditor";
import { formatDate, getNameInitials } from "@/utils/functions";
import Link from "next/link";

type CommentThreadProps = {
  ticket_id: string;
  ticket_status: string;
  comments: CommentType[];
  setComments: React.Dispatch<React.SetStateAction<CommentType[]>>;
};

const CommentThread: React.FC<CommentThreadProps> = ({
  ticket_id,
  comments,
  ticket_status,
  setComments,
}) => {
  const { user } = useUserStore();
  const commentEditorRef = useRef<RichTextEditorRef>(null);

  const [newComment, setNewComment] = useState<string>("");

  const [editingComment, setEditingComment] = useState<CommentType | null>(
    null
  );
  const [editContent, setEditContent] = useState<string>("");

  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {}
  );
  const [isFocused, setIsFocus] = useState(false);

  const [isAddingComment, setIsAddingComment] = useState<boolean>(false);
  const [deletingComment, setDeletingComment] = useState<CommentType | null>(
    null
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  const cleanComment = newComment.trim();

  useEffect(() => {
    if (isFocused) {
      setTimeout(() => {
        commentEditorRef.current?.focus();
      }, 50);
    }
  }, [isFocused]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      console.error("User not logged in.");
      return;
    }

    if (cleanComment === "<p></p>" || cleanComment === "") {
      return;
    }

    setIsAddingComment(true);

    try {
      const commentId = await addComment(ticket_id, newComment, user.user_id);
      setComments([
        ...comments,
        {
          comment_id: commentId,
          comment_ticket_id: ticket_id,
          comment_user_id: user.user_id,
          comment_content: newComment,
          comment_date_created: new Date().toLocaleString("en-US", {
            timeZone: "Asia/Manila",
          }),
          comment_is_edited: false,
          comment_type: "COMMENT",
          comment_user_full_name: user.user_full_name,
          comment_user_avatar: user?.user_avatar,
          comment_last_updated: new Date().toLocaleString("en-US", {
            timeZone: "Asia/Manila",
          }),
          replies: [],
        },
      ]);
      setNewComment("");
      commentEditorRef.current?.reset();
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleDeleteComment = async () => {
    if (deletingComment) {
      try {
        await deleteComment(deletingComment.comment_id);
        setComments((prevComments) =>
          prevComments.filter(
            (comment) => comment.comment_id !== deletingComment.comment_id
          )
        );
      } catch (error) {
        console.error("Unexpected error:", error);
      }
      setIsDeleteModalOpen(false); // Close the delete confirmation modal
      setDeletingComment(null); // Reset the deleting comment
    }
  };

  const handleEditComment = async () => {
    if (!editContent.trim() || !editingComment) return;

    try {
      setLoadingStates((prev) => ({
        ...prev,
        [editingComment.comment_id]: true,
      }));
      await editComment(editingComment.comment_id, editContent);
      setComments((prevComments) =>
        prevComments.map((comment) =>
          comment.comment_id === editingComment.comment_id
            ? {
                ...comment,
                comment_content: editContent,
                comment_is_edited: true,
              }
            : comment
        )
      );
      setEditingComment(null);
      setEditContent("");
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoadingStates((prev) => ({
        ...prev,
        [editingComment.comment_id]: false,
      }));
    }
  };

  const openDeleteModal = (comment: CommentType) => {
    setDeletingComment(comment);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingComment(null);
  };

  const openEditModal = (comment: CommentType) => {
    setEditingComment(comment);
    setEditContent(comment.comment_content);
  };

  const closeEditModal = () => {
    setEditingComment(null);
    setEditContent("");
  };

  if (!comments) {
    return <LoadingStateProtected />;
  }

  return (
    <Container w="100%" pt="xs" px={0}>
      {comments.length === 0 ? (
        <Text c="dimmed">No comments yet.</Text>
      ) : (
        <div>
          {comments.map((comment) => (
            <Group key={comment.comment_id} align="flex-start" gap="xs">
              <Link href={`/profile/${comment.comment_user_id}`} passHref>
                <Avatar
                  src={comment.comment_user_avatar || undefined}
                  radius="xl"
                  size="md"
                >
                  {comment.comment_user_avatar
                    ? null
                    : getNameInitials(comment.comment_user_full_name)}
                </Avatar>
              </Link>
              <Paper
                bg="transparent"
                pb="sm"
                style={{
                  boxShadow: "none",
                  backgroundColor: "black",
                  flex: 1,
                }}
              >
                {loadingStates[comment.comment_id] ? (
                  <Box style={{ flex: 1 }} pl="xs">
                    <Group gap="xs" align="center">
                      <Skeleton height={16} width={120} radius="sm" />
                      <Skeleton height={14} width={160} radius="sm" />
                    </Group>

                    <Skeleton height={50} mt={6} radius="sm" />
                  </Box>
                ) : (
                  <Box style={{ flex: 1 }} pl="xs">
                    <Group gap="0" align="center">
                      <Link
                        href={`/profile/${comment.comment_user_id}`}
                        passHref
                        legacyBehavior
                      >
                        <a style={{ textDecoration: "none", color: "inherit" }}>
                          <Text
                            size="sm"
                            fw={500}
                            mr={10}
                            td="none"
                            style={{ transition: "color 0.2s ease-in-out" }}
                          >
                            {comment.comment_user_full_name}
                          </Text>
                        </a>
                      </Link>

                      <Text size="xs" c="dimmed">
                        {formatDate(comment.comment_date_created)}
                      </Text>
                      {comment.comment_is_edited && (
                        <Text size="xs" c="dimmed" pl="xs">
                          (Edited)
                        </Text>
                      )}
                    </Group>

                    <Text size="md">
                      <span
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(comment.comment_content),
                        }}
                      />
                    </Text>
                  </Box>
                )}
              </Paper>

              {user?.user_id === comment.comment_user_id && (
                <Menu trigger="click" position="bottom-end">
                  <Menu.Target>
                    <ActionIcon
                      variant="transparent"
                      style={{ color: "inherit", marginLeft: "auto" }}
                    >
                      <IconDotsVertical size={18} />
                    </ActionIcon>
                  </Menu.Target>

                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconEdit size={16} />}
                      onClick={() => openEditModal(comment)}
                      disabled={loadingStates[comment.comment_id]}
                    >
                      Edit
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconTrash size={16} />}
                      onClick={() => openDeleteModal(comment)}
                      disabled={loadingStates[comment.comment_id]}
                    >
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              )}
            </Group>
          ))}
        </div>
      )}

      {/* COMMENT INPUT */}
      {!(
        ticket_status === "DONE" ||
        ticket_status === "CANCELED" ||
        ticket_status === "DECLINED"
      ) && (
        <Group align="flex-start" gap="xs" mt="md">
          <Avatar src={user?.user_avatar || undefined} radius="xl" size="md">
            {user?.user_avatar
              ? null
              : getNameInitials(user?.user_full_name || "")}
          </Avatar>

          <Paper p="md" shadow="xs" style={{ flex: 1 }}>
            <form onSubmit={handleAddComment}>
              {isFocused ? (
                <>
                  <RichTextEditor
                    ref={commentEditorRef}
                    value={newComment}
                    onChange={(value) => setNewComment(value)}
                    onFocus={() => setIsFocus(true)}
                  />
                  <Button
                    type="submit"
                    fullWidth
                    disabled={
                      isAddingComment ||
                      cleanComment === "<p></p>" ||
                      cleanComment === ""
                    }
                    style={{ marginTop: "10px" }}
                  >
                    {isAddingComment ? <Loader size="xs" /> : "Add Comment"}
                  </Button>
                </>
              ) : (
                <Paper
                  bg="transparent"
                  onClick={() => setIsFocus(true)}
                  style={{
                    boxShadow: "none",
                    flex: 1,
                  }}
                >
                  {cleanComment ? (
                    <Text size="sm" c="dimmed">
                      {cleanComment}
                    </Text>
                  ) : (
                    <Text size="sm" c="dimmed">
                      Add a comment...
                    </Text>
                  )}
                </Paper>
              )}
            </form>
          </Paper>
        </Group>
      )}

      <Modal
        opened={!!editingComment}
        onClose={closeEditModal}
        title="Edit Comment"
        centered
        size="xl"
      >
        <form onSubmit={handleEditComment}>
          <RichTextEditor
            value={editContent}
            onChange={(value) => setEditContent(value)}
          />
          <Button
            fullWidth
            onClick={handleEditComment}
            disabled={
              !editContent.trim() ||
              loadingStates[editingComment?.comment_id || ""]
            }
            style={{ marginTop: "10px" }}
          >
            {loadingStates[editingComment?.comment_id || ""] ? (
              <Loader size="xs" />
            ) : (
              "Save Changes"
            )}
          </Button>
        </form>
      </Modal>

      <Modal
        opened={isDeleteModalOpen}
        onClose={closeDeleteModal}
        title="Are you sure?"
        centered
      >
        <Text>
          Do you really want to delete this comment? This action cannot be
          undone.
        </Text>
        <Group align="center" justify="center" mt="md">
          <Button variant="outline" color="gray" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDeleteComment}>
            Delete
          </Button>
        </Group>
      </Modal>
    </Container>
  );
};

export default CommentThread;
