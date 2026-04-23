import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ universityId: string }> };

/** Legacy route — all leads now appear under Admissions with an attribution column. */
export default async function UniversityUniAdmissionsRedirectPage(props: PageProps) {
  const { universityId } = await props.params;
  redirect(`/dashboard/university/${universityId}/admissions`);
}
