type StreamSummary = {
  programLevel: string | null;
  degreeType: string | null;
  name: string;
  totalSeats: number;
};

export function formatProgramStreamsSummary(streams: StreamSummary[]): string {
  if (streams.length === 0) return "—";
  return streams
    .map((stream) => {
      const level = stream.programLevel === "UG" ? "UG" : stream.programLevel === "PG" ? "PG" : "";
      const degree = stream.degreeType?.trim() ?? "";
      const parts = [level, degree, stream.name.trim()].filter(Boolean);
      return parts.join(" · ");
    })
    .join("; ");
}

export function formatTargetCount(targetStudents: number | null, streams: StreamSummary[]): string {
  if (targetStudents != null && targetStudents > 0) {
    return targetStudents.toLocaleString("en-IN");
  }
  const sum = streams.reduce((total, stream) => total + (stream.totalSeats ?? 0), 0);
  return sum > 0 ? sum.toLocaleString("en-IN") : "—";
}

export function formatCreatedOn(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
