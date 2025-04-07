"use client";
import { Link, RichTextEditor as MantineRichTextEditor } from "@mantine/tiptap";
import Highlight from "@tiptap/extension-highlight";
import SubScript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { Editor, useEditor } from "@tiptap/react"; // Import the Editor type
import StarterKit from "@tiptap/starter-kit";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDebouncedCallback } from "use-debounce"; // Import the useDebouncedCallback hook

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onSubmit?: () => void;
};

export type RichTextEditorRef = {
  reset: () => void;
  focus: () => void;
  submit: () => void;
};

export const RichTextEditor = forwardRef<
  RichTextEditorRef,
  RichTextEditorProps
>(({ value, onChange, onFocus, onSubmit }, ref) => {
  const [editorReady, setEditorReady] = useState(false);

  // To track if an update is already in progress
  const editorUpdateRef = useRef(false);

  // Memoize the editor extensions to prevent re-creating them on every render
  const extensions = useMemo(
    () => [
      StarterKit,
      Underline,
      Link,
      Superscript,
      SubScript,
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    [],
  );

  // Create a debounced version of onChange
  const debouncedOnChange = useDebouncedCallback((value: string) => {
    onChange(value);
  }, 200);

  // Initialize the editor
  const editor = useEditor({
    extensions,
    content: value,
    onUpdate: useCallback(
      ({ editor }: { editor: Editor }) => {
        if (!editorUpdateRef.current && editorReady) {
          editorUpdateRef.current = true;

          // Use requestAnimationFrame to batch updates and improve performance
          requestAnimationFrame(() => {
            debouncedOnChange(editor.getHTML()); // Call the debounced function
            editorUpdateRef.current = false;
          });
        }
      },
      [editorReady, debouncedOnChange],
    ),
    onFocus: onFocus,
  });

  // Set editor readiness flag once it's initialized
  useEffect(() => {
    if (editor) {
      setEditorReady(true);
    }
  }, [editor]);

  // Expose methods to reset, focus, and submit via ref
  useImperativeHandle(ref, () => ({
    reset: () => {
      if (editor) editor.commands.setContent(""); // Clear content
    },
    focus: () => {
      if (editor) editor.commands.focus(); // Focus editor
    },
    submit: () => {
      if (editor) {
        // Trigger onChange immediately
        onChange(editor.getHTML());
      }
      if (onSubmit) {
        onSubmit();
      }
    },
  }));

  return (
    <MantineRichTextEditor editor={editor} mih={200}>
      <MantineRichTextEditor.Toolbar sticky stickyOffset={60}>
        <MantineRichTextEditor.ControlsGroup>
          <MantineRichTextEditor.Bold />
          <MantineRichTextEditor.Italic />
          <MantineRichTextEditor.Underline />
          <MantineRichTextEditor.Strikethrough />
          <MantineRichTextEditor.ClearFormatting />
          <MantineRichTextEditor.Highlight />
          <MantineRichTextEditor.Code />
        </MantineRichTextEditor.ControlsGroup>

        <MantineRichTextEditor.ControlsGroup>
          <MantineRichTextEditor.H1 />
          <MantineRichTextEditor.H2 />
          <MantineRichTextEditor.H3 />
          <MantineRichTextEditor.H4 />
        </MantineRichTextEditor.ControlsGroup>

        <MantineRichTextEditor.ControlsGroup>
          <MantineRichTextEditor.Blockquote />
          <MantineRichTextEditor.Hr />
          <MantineRichTextEditor.BulletList />
          <MantineRichTextEditor.OrderedList />
          <MantineRichTextEditor.Subscript />
          <MantineRichTextEditor.Superscript />
        </MantineRichTextEditor.ControlsGroup>

        <MantineRichTextEditor.ControlsGroup>
          <MantineRichTextEditor.Link />
          <MantineRichTextEditor.Unlink />
        </MantineRichTextEditor.ControlsGroup>

        <MantineRichTextEditor.ControlsGroup>
          <MantineRichTextEditor.AlignLeft />
          <MantineRichTextEditor.AlignCenter />
          <MantineRichTextEditor.AlignJustify />
          <MantineRichTextEditor.AlignRight />
        </MantineRichTextEditor.ControlsGroup>

        <MantineRichTextEditor.ControlsGroup>
          <MantineRichTextEditor.Undo />
          <MantineRichTextEditor.Redo />
        </MantineRichTextEditor.ControlsGroup>
      </MantineRichTextEditor.Toolbar>

      <MantineRichTextEditor.Content mah={200} style={{ overflow: "auto" }} />
    </MantineRichTextEditor>
  );
});

RichTextEditor.displayName = "RichTextEditor";
