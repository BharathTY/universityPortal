import { redirect } from "next/navigation";

/** Legacy route — counsellor workflows live under Leads / batches. */
export default function CounsellorRedirectPage() {
  redirect("/dashboard/batches");
}
