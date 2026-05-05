"use client";

import { Extension, type Editor as TiptapEditor, type Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type ForwardedRef,
} from "react";
import {
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Type,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

type Item = {
  label: string;
  icon: LucideIcon;
  hint?: string;
  keywords: string[];
  command: (opts: { editor: TiptapEditor; range: Range }) => void;
};

const ITEMS: Item[] = [
  {
    label: "Paragraph",
    icon: Type,
    keywords: ["text", "paragraph", "p"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    label: "Heading 1",
    icon: Heading1,
    hint: "#",
    keywords: ["h1", "heading", "title"],
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 1 })
        .run(),
  },
  {
    label: "Heading 2",
    icon: Heading2,
    hint: "##",
    keywords: ["h2", "heading"],
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 2 })
        .run(),
  },
  {
    label: "Heading 3",
    icon: Heading3,
    hint: "###",
    keywords: ["h3", "heading"],
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 3 })
        .run(),
  },
  {
    label: "Bullet list",
    icon: List,
    hint: "-",
    keywords: ["bullet", "list", "unordered"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    label: "Numbered list",
    icon: ListOrdered,
    hint: "1.",
    keywords: ["numbered", "ordered", "list"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    label: "Todo",
    icon: CheckSquare,
    hint: "[]",
    keywords: ["todo", "task", "checklist"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    label: "Quote",
    icon: Quote,
    hint: ">",
    keywords: ["quote", "blockquote"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    label: "Code block",
    icon: Code,
    hint: "```",
    keywords: ["code", "fenced", "pre"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    label: "Divider",
    icon: Minus,
    hint: "---",
    keywords: ["divider", "rule", "hr"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    label: "Image",
    icon: ImageIcon,
    keywords: ["image", "picture"],
    command: ({ editor, range }) => {
      const url = window.prompt("Image URL");
      if (!url) {
        editor.chain().focus().deleteRange(range).run();
        return;
      }
      editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
    },
  },
];

export const SlashMenu = Extension.create({
  name: "slashMenu",
  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
        command: ({ editor, range, props }) => {
          (props as Item).command({ editor, range });
        },
      } as Partial<SuggestionOptions<Item, Item>>,
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion<Item, Item>({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }) => filterItems(query),
        render: makeRenderer,
      }),
    ];
  },
});

function filterItems(query: string): Item[] {
  const q = query.toLowerCase().trim();
  if (!q) return ITEMS;
  return ITEMS.filter(
    (i) =>
      i.label.toLowerCase().includes(q) ||
      i.keywords.some((k) => k.includes(q))
  );
}

type RendererHandle = {
  onKeyDown: (e: { event: KeyboardEvent }) => boolean;
};

type RendererProps = {
  items: Item[];
  command: (item: Item) => void;
  clientRect: (() => DOMRect | null) | null;
  editor: TiptapEditor;
};

function makeRenderer() {
  let component: ReactRenderer<RendererHandle, RendererProps> | null = null;
  let popupEl: HTMLDivElement | null = null;

  const positionPopup = (rect: DOMRect | null) => {
    if (!popupEl || !rect) return;
    popupEl.style.left = `${rect.left}px`;
    popupEl.style.top = `${rect.bottom + 6}px`;
  };

  const teardown = () => {
    component?.destroy();
    popupEl?.remove();
    component = null;
    popupEl = null;
  };

  return {
    onStart(props: RendererProps) {
      popupEl = document.createElement("div");
      popupEl.style.position = "absolute";
      popupEl.style.zIndex = "60";
      document.body.appendChild(popupEl);
      component = new ReactRenderer(SlashList, {
        props,
        editor: props.editor,
      });
      popupEl.appendChild(component.element);
      positionPopup(props.clientRect?.() ?? null);
    },
    onUpdate(props: RendererProps) {
      component?.updateProps(props);
      positionPopup(props.clientRect?.() ?? null);
    },
    onKeyDown(props: { event: KeyboardEvent }) {
      if (props.event.key === "Escape") {
        teardown();
        return true;
      }
      return component?.ref?.onKeyDown(props) ?? false;
    },
    onExit() {
      teardown();
    },
  };
}

const SlashList = forwardRef(function SlashListInner(
  props: RendererProps,
  ref: ForwardedRef<RendererHandle>
) {
  const [selected, setSelected] = useState(0);
  useEffect(() => setSelected(0), [props.items]);

  const select = (i: number) => {
    const item = props.items[i];
    if (item) props.command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown({ event }) {
      if (event.key === "ArrowDown") {
        setSelected((s) => (s + 1) % Math.max(props.items.length, 1));
        return true;
      }
      if (event.key === "ArrowUp") {
        setSelected((s) =>
          (s - 1 + Math.max(props.items.length, 1)) %
          Math.max(props.items.length, 1)
        );
        return true;
      }
      if (event.key === "Enter") {
        select(selected);
        return true;
      }
      return false;
    },
  }));

  if (props.items.length === 0) {
    return (
      <div className="rounded border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-[12px] text-[var(--text-disabled)]">
        no matches
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-w-[240px] overflow-hidden rounded border border-[var(--border-default)]",
        "bg-[var(--bg-elevated)] p-1 text-[12px]"
      )}
    >
      {props.items.map((item, i) => {
        const Icon = item.icon;
        const active = i === selected;
        return (
          <button
            key={item.label}
            type="button"
            onMouseEnter={() => setSelected(i)}
            onClick={(e) => {
              e.preventDefault();
              select(i);
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[var(--text-secondary)]",
              active && "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
            )}
          >
            <Icon
              className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]"
              strokeWidth={1.5}
            />
            <span className="flex-1 truncate">{item.label}</span>
            {item.hint ? (
              <kbd className="text-[10px] text-[var(--text-disabled)]">
                {item.hint}
              </kbd>
            ) : null}
          </button>
        );
      })}
    </div>
  );
});
