import { ZipArchive } from "archiver";
import type { Readable } from "stream";

export interface ZipStreamEntry {
  filename: string;
  stream: Readable;
}

/**
 * Builds a ZIP archive as a readable stream — each entry is streamed
 * straight from its source into the archive rather than being buffered
 * whole in memory first, so a full gallery's worth of images never has
 * to fit in memory at once.
 *
 * The returned Archiver is itself a Node readable stream (it extends
 * stream.Transform), ready to pipe into a response.
 */
export function createZipStream(entries: ZipStreamEntry[]): Readable {
  const archive = new ZipArchive({ zlib: { level: 9 } });

  const usedNames = new Set<string>();
  for (const entry of entries) {
    let name = entry.filename;
    let counter = 1;
    while (usedNames.has(name)) {
      const dot = entry.filename.lastIndexOf(".");
      name =
        dot === -1
          ? `${entry.filename}-${counter}`
          : `${entry.filename.slice(0, dot)}-${counter}${entry.filename.slice(dot)}`;
      counter++;
    }
    usedNames.add(name);
    archive.append(entry.stream, { name });
  }

  void archive.finalize();
  return archive;
}
