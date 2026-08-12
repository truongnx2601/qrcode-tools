export interface ParsedQrFilename {
  schoolName: string;
  schoolCode: string;
}

export function parseQrFilename(
  filename: string
): ParsedQrFilename {
  const dotIndex = filename.lastIndexOf(".");

  const stem =
    dotIndex >= 0
      ? filename.substring(0, dotIndex)
      : filename;

  const underscoreIndex = stem.lastIndexOf("_");

  if (underscoreIndex === -1) {
    return {
      schoolName: stem,
      schoolCode: "",
    };
  }

  return {
    schoolName: stem.substring(0, underscoreIndex),
    schoolCode: stem.substring(underscoreIndex + 1),
  };
}