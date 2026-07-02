/** "312 B", "45 KB", "1.2 MB" */
export function fmtSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

/** Short file-kind label from mime type or extension. */
export function kindOf(file: File): string {
  if (file.type) return file.type.split("/").pop() || file.type;
  const ext = file.name.split(".").pop();
  return ext ? ext.toLowerCase() : "file";
}
