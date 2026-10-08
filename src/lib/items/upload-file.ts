import { UPLOAD_TIMEOUT_MS } from "@/lib/constants/files";
import type { UploadTarget } from "@/types/files";

/**
 * Sends a picked file straight to storage through its signed link. Browser
 * only: XHR rather than `fetch`, because only XHR reports upload progress.
 * `onProgress` gets 0..1. Resolves `true` once storage accepts the file and
 * `false` on any failure, including taking longer than `UPLOAD_TIMEOUT_MS`;
 * never throws.
 */
export const uploadFile = (
  target: UploadTarget,
  file: File,
  onProgress: (fraction: number) => void,
): Promise<boolean> =>
  new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", target.url);
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    for (const [name, value] of Object.entries(target.headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.onabort = () => resolve(false);
    xhr.ontimeout = () => resolve(false);
    xhr.send(file);
  });
