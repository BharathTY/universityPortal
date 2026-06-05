export type UniversityProgramLevel = "UG" | "PG";

export const UNIVERSITY_PROGRAM_LEVEL_OPTIONS: {
  value: UniversityProgramLevel;
  label: string;
}[] = [
  { value: "UG", label: "UG (Undergraduate)" },
  { value: "PG", label: "PG (Postgraduate)" },
];

export const UNIVERSITY_PROGRAMS_BY_LEVEL: Record<UniversityProgramLevel, readonly string[]> = {
  UG: ["BE", "B.Tech", "BCA"],
  PG: ["M.Tech", "MCA", "MBA"],
};

export function programsForLevel(level: UniversityProgramLevel): readonly string[] {
  return UNIVERSITY_PROGRAMS_BY_LEVEL[level];
}

export function isValidProgramForLevel(level: UniversityProgramLevel, program: string): boolean {
  return programsForLevel(level).includes(program.trim());
}
