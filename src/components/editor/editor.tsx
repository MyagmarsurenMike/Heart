"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import LinkExt from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import ImageExt from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import { useEffect, useRef, useState } from "react";
import { SlashMenu } from "./slash-menu";
import { Bold, Code, Italic, Link as LinkIcon, Strikethrough } from "lucide-react";
import { savePageBodyAction } from "@/server/actions/pages";
import { markSelfSaved } from "./save-cooldown";
import { cn } from "@/lib/cn";
import "./editor.css";

const DEBOUNCE_MS = 500;

// tiptap-markdown injects storage at runtime but doesn't extend types.
function getMarkdown(e: { storage: unknown }): string {
  const s = e.storage as { markdown?: { getMarkdown: () => string } };
  return s.markdown?.getMarkdown() ?? "";
}

export function Editor({
  pageId,
  initial,
}: {
  pageId: string;
  initial: string;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const lastInitialRef = useRef(initial);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: { HTMLAttributes: { class: "hearth-code-block" } },
        heading: { levels: [1, 2, 3] },
      }),
      LinkExt.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto"],
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      ImageExt.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === "paragraph" ? "Type / for commands…" : "",
        showOnlyCurrent: true,
      }),
      Markdown.configure({
        html: false,
        tightLists: true,
        linkify: true,
        breaks: false,
        transformPastedText: true,
      }),
      SlashMenu,
    ],
    content: initial,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "hearth-prose outline-none min-h-[60vh] max-w-[720px] mx-auto text-[14px] leading-[1.7] text-[var(--text-secondary)]",
      },
    },
    onUpdate({ editor }) {
      setStatus("saving");
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const md = getMarkdown(editor);
        markSelfSaved();
        void savePageBodyAction(pageId, md).then(() => setStatus("saved"));
      }, DEBOUNCE_MS);
    },
  });

  // External re-render: if the page prop changes (different page) update content.
  // Skip for in-place edits to the same page (we already own that state).
  useEffect(() => {
    if (!editor) return;
    if (initial === lastInitialRef.current) return;
    lastInitialRef.current = initial;
    editor.commands.setContent(initial, { emitUpdate: false });
  }, [editor, initial]);

  // Flush pending save on unmount so navigating away doesn't drop edits.
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        if (editor) {
          const md = getMarkdown(editor);
          markSelfSaved();
          void savePageBodyAction(pageId, md);
        }
      }
    };
  }, [editor, pageId]);

  if (!editor) {
    return (
      <div className="mx-auto max-w-[720px] py-8 text-[12px] text-[var(--text-disabled)]">
        loading editor…
      </div>
    );
  }

  return (
    <div className="relative flex flex-col">
      <BubbleMenu
        editor={editor}
        className={cn(
          "flex items-center gap-px rounded border border-[var(--border-default)]",
          "bg-[var(--bg-elevated)] p-0.5"
        )}
      >
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="bold"
        >
          <Bold className="h-3 w-3" strokeWidth={1.5} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="italic"
        >
          <Italic className="h-3 w-3" strokeWidth={1.5} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          aria-label="strikethrough"
        >
          <Strikethrough className="h-3 w-3" strokeWidth={1.5} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
          aria-label="inline code"
        >
          <Code className="h-3 w-3" strokeWidth={1.5} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("link")}
          onClick={() => {
            const prev = editor.getAttributes("link").href as string | undefined;
            const url = window.prompt("Link URL", prev ?? "https://");
            if (url === null) return;
            if (url === "") {
              editor.chain().focus().unsetLink().run();
              return;
            }
            editor.chain().focus().setLink({ href: url }).run();
          }}
          aria-label="link"
        >
          <LinkIcon className="h-3 w-3" strokeWidth={1.5} />
        </ToolbarButton>
      </BubbleMenu>
      <EditorContent editor={editor} />
      <SaveStatus status={status} />
    </div>
  );
}

function ToolbarButton({
  active,
  ...rest
}: {
  active?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-sm text-[var(--text-tertiary)] transition-colors",
        "hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]",
        active && "bg-[var(--accent-muted)] text-[var(--accent)]"
      )}
    />
  );
}

function SaveStatus({ status }: { status: "idle" | "saving" | "saved" }) {
  if (status === "idle") return null;
  return (
    <div className="pointer-events-none fixed bottom-8 right-6 text-[10px] text-[var(--text-disabled)]">
      {status === "saving" ? "saving…" : "saved"}
    </div>
  );
}
