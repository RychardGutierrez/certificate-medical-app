/** Saves bytes or text as a file through a temporary link. */
export function downloadFile(content: Uint8Array | string, filename: string, mime: string): void {
  const blob = new Blob([content as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before freeing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
