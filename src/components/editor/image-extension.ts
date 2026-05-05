import ImageExt from "@tiptap/extension-image";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { attachmentPrefix, uploadAttachment } from "./image-paths";

const SCREENSHOT_PREFIX = "screenshot";

function nextScreenshotName(mime: string): string {
  const ext = mime === "image/jpeg" ? "jpg" : mime.split("/")[1] || "png";
  return `${SCREENSHOT_PREFIX}-${Date.now()}.${ext}`;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

async function uploadAndInsert(
  view: import("@tiptap/pm/view").EditorView,
  pageUrl: string,
  file: File
): Promise<void> {
  const name = file.name && file.name.length > 0 ? file.name : nextScreenshotName(file.type);
  const filename = await uploadAttachment(pageUrl, file, name);
  const src = `${attachmentPrefix(pageUrl)}${encodeURIComponent(filename)}`;
  const node = view.state.schema.nodes.image?.create({ src, alt: name });
  if (!node) return;
  const tr = view.state.tr.replaceSelectionWith(node).scrollIntoView();
  view.dispatch(tr);
}

export function HearthImage(pageUrl: string) {
  return ImageExt.configure({ inline: false, allowBase64: false }).extend({
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey("hearthImagePasteDrop"),
          props: {
            handlePaste(view, event) {
              const items = event.clipboardData?.items;
              if (!items || items.length === 0) return false;
              const files: File[] = [];
              for (const it of Array.from(items)) {
                if (it.kind === "file") {
                  const f = it.getAsFile();
                  if (f && isImageFile(f)) files.push(f);
                }
              }
              if (files.length === 0) return false;
              event.preventDefault();
              for (const f of files) {
                void uploadAndInsert(view, pageUrl, f).catch((err) => {
                  console.error("[hearth] image paste failed", err);
                });
              }
              return true;
            },
            handleDrop(view, event) {
              const dt = event.dataTransfer;
              if (!dt || dt.files.length === 0) return false;
              const files = Array.from(dt.files).filter(isImageFile);
              if (files.length === 0) return false;
              event.preventDefault();
              for (const f of files) {
                void uploadAndInsert(view, pageUrl, f).catch((err) => {
                  console.error("[hearth] image drop failed", err);
                });
              }
              return true;
            },
          },
        }),
      ];
    },
  });
}
