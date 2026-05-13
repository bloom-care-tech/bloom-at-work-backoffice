import { Editor } from "@tinymce/tinymce-react";

/** Keep in sync with `tinymce` in package.json for CDN asset compatibility. */
const TINYMCE_VERSION = "7.9.2";
const TINYMCE_SCRIPT_SRC = `https://cdn.jsdelivr.net/npm/tinymce@${TINYMCE_VERSION}/tinymce.min.js`;

type Props = {
  /** Bump `editorKey` when loading different server HTML so the iframe remounts cleanly. */
  editorKey: string;
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
};

export function WaveArticleTinyMceEditor({ editorKey, value, onChange, disabled }: Props) {
  return (
    <div className="min-h-[440px] rounded-xl border border-bloom-aubergine/10 overflow-hidden bg-white">
      <Editor
        key={editorKey}
        licenseKey="gpl"
        tinymceScriptSrc={TINYMCE_SCRIPT_SRC}
        value={value}
        disabled={disabled}
        onEditorChange={(html) => onChange(html)}
        init={{
          height: 440,
          menubar: true,
          branding: false,
          promotion: false,
          plugins: [
            "advlist",
            "autolink",
            "lists",
            "link",
            "image",
            "charmap",
            "preview",
            "anchor",
            "searchreplace",
            "visualblocks",
            "code",
            "fullscreen",
            "insertdatetime",
            "media",
            "table",
            "help",
            "wordcount",
          ],
          toolbar:
            "undo redo | blocks | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image table | removeformat | code fullscreen",
          content_style:
            "body { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 14px; max-width: 720px; margin: 1rem auto; color: hsl(273, 47%, 11%); line-height: 1.6; }",
          automatic_uploads: false,
          image_description: false,
          convert_urls: false,
        }}
      />
    </div>
  );
}
