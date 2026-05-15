import { Editor } from "@tinymce/tinymce-react";
import indexCssUrl from "@/index.css?url";

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
          menubar: false,
          branding: false,
          promotion: false,
          body_class: "mce-content-body wave-article-body-prose",
          content_css: [indexCssUrl],
          plugins: ["autolink", "lists", "link", "code", "wordcount"],
          toolbar:
            "undo redo | blocks | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image table | removeformat | code fullscreen",
          automatic_uploads: false,
          image_description: false,
          convert_urls: false,
        }}
      />
    </div>
  );
}
