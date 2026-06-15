"use client";

import * as React from "react";
import type { ProgramCatalogSnapshot } from "@/lib/qspiders-program-catalog";
import {
  degreeTypesForQualification,
  streamsForDegreeType,
} from "@/lib/qspiders-program-catalog";

export function useProgramCatalog() {
  const [catalog, setCatalog] = React.useState<ProgramCatalogSnapshot | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetch("/api/catalog/program")
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as ProgramCatalogSnapshot | null;
        if (!res.ok || !data?.qualificationTypes?.length) {
          throw new Error("Could not load program catalog");
        }
        return data;
      })
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load program catalog");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const getDegreeTypes = React.useCallback(
    (qualificationType: string) => {
      if (!catalog) return [];
      return degreeTypesForQualification(catalog, qualificationType);
    },
    [catalog],
  );

  const getStreams = React.useCallback(
    (qualificationType: string, degreeType: string) => {
      if (!catalog) return [];
      return streamsForDegreeType(catalog, qualificationType, degreeType);
    },
    [catalog],
  );

  return { catalog, loading, error, getDegreeTypes, getStreams };
}
