import { ZipArchive } from "archiver";
import { PassThrough } from "stream";

export interface ZipEntry {
  filename: string;
  data: Buffer;
}

/**
 * Builds a ZIP archive in memory. Duplicate filenames are disambiguated
 * so the archive never silently overwrites an entry.
 */
export async function createZipBuffer(entries: ZipEntry[]): Promise<Buffer> {
  const archive = new ZipArchive({ zlib: { level: 9 } });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];

  stream.on("data", (chunk) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve, reject) => {
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);
  });

  archive.pipe(stream);

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
    archive.append(entry.data, { name });
  }

  await archive.finalize();
  return done;
}
