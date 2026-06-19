"use client";

import * as React from "react";
import { NewUniversityWizard } from "@/app/dashboard/master/universities/new/new-university-wizard";

type Props = {
  universityId: string;
};

export function EditUniversityWizardClient({ universityId }: Props) {
  return <NewUniversityWizard universityId={universityId} />;
}
