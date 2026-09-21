export default function stripQuillDocumentTerminator(text) {
  return text.slice(-1) === "\n" ? text.slice(0, -1) : text;
}
