import * as repo from "../data/repo";

// Save a stored file to disk with its real filename. window.open on a signed
// URL makes the browser PREVIEW previewable types (pdf, images) in a new tab;
// fetching the blob and clicking an <a download> forces an actual download.
export async function downloadStoredFile(path: string, name: string): Promise<boolean> {
  const url = await repo.fileObjectUrl(path);
  if (!url) return false;
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const blob = await res.blob();
    const obj = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = obj;
    a.download = name || "file";
    document.body.appendChild(a);
    a.click();
    a.remove();
    // give the click a beat before revoking, or Safari cancels the save
    setTimeout(() => URL.revokeObjectURL(obj), 4000);
    return true;
  } catch {
    // fetch blocked (offline etc.) — fall back to opening the tab
    window.open(url, "_blank", "noopener");
    return true;
  }
}

/** Preview in a new tab (images, pdfs) — the old behavior, kept intentional. */
export async function openStoredFile(path: string): Promise<void> {
  const url = await repo.fileObjectUrl(path);
  if (url) window.open(url, "_blank", "noopener");
}
