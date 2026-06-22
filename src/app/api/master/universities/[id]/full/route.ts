import {
  CetAllocationMode,
  DocumentKind,
  Prisma,
  ProgramLevel,
} from "@prisma/client";
import { NextResponse } from "next/server";
import {
  formatAcademicYearLabel,
  isSelectableYopYear,
  parseAcademicYearStartYear,
} from "@/lib/academic-year-yop";
import { storeUpload } from "@/lib/file-storage";
import { requireMasterApi } from "@/lib/master-session";
import { prisma } from "@/lib/prisma";
import { syncUniversityHostelFees } from "@/lib/university-hostel-fees-db";
import {
  assertUniversityEmailAvailable,
  syncUniversityPrimaryLoginUser,
  UniversityEmailInUseError,
} from "@/lib/university-primary-user";
import {
  EVENT_PHOTO_MAX_BYTES,
  MOU_PDF_MAX_BYTES,
  validateEventPhotoFile,
  validateMouPdfFile,
} from "@/lib/university-mou-documents";
import {
  createBodySchema,
  isValidLogoRef,
  parseCreateRequest,
  resolveUniversitySpocInputs,
  toDecimal,
} from "@/app/api/master/universities/route";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: RouteContext) {
  const gate = await requireMasterApi();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;

  const existing = await prisma.university.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      mouFileUrl: true,
      documents: { where: { kind: DocumentKind.MOU }, select: { id: true } },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existingMouCount =
    existing.documents.length + (existing.mouFileUrl ? 1 : 0);

  let data: unknown;
  let files: Awaited<ReturnType<typeof parseCreateRequest>>["files"];
  try {
    const parsed = await parseCreateRequest(req);
    data = parsed.data;
    files = parsed.files;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid request body";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const parsed = createBodySchema.safeParse(data);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return NextResponse.json(
      { error: "Invalid input", fieldErrors: flat.fieldErrors, formErrors: flat.formErrors },
      { status: 400 },
    );
  }

  if (parsed.data.mouYear == null || !isSelectableYopYear(parsed.data.mouYear)) {
    return NextResponse.json(
      { error: "MOU year is required", fieldErrors: { mouYear: ["Select a valid MOU year"] } },
      { status: 400 },
    );
  }

  if (!parsed.data.mouTenure) {
    return NextResponse.json(
      { error: "MOU tenure is required", fieldErrors: { mouTenure: ["Select MOU tenure"] } },
      { status: 400 },
    );
  }

  if (files.mouFiles.length === 0 && existingMouCount === 0) {
    return NextResponse.json(
      { error: "Upload at least one MOU document", fieldErrors: { mouFiles: ["Upload at least one MOU document"] } },
      { status: 400 },
    );
  }

  for (const mouFile of files.mouFiles) {
    const mouError = validateMouPdfFile(mouFile);
    if (mouError) {
      return NextResponse.json({ error: mouError, fieldErrors: { mouFiles: [mouError] } }, { status: 400 });
    }
  }

  for (const photo of files.eventPhotos) {
    const photoError = validateEventPhotoFile(photo);
    if (photoError) {
      return NextResponse.json({ error: photoError, fieldErrors: { eventPhotos: [photoError] } }, { status: 400 });
    }
  }

  const docAcademicYear = formatAcademicYearLabel(parsed.data.mouYear);
  const mouYearLabel = String(parsed.data.mouYear);

  let logoUrl = parsed.data.logoUrl?.trim() || null;
  if (files.logoFile) {
    try {
      const stored = await storeUpload(files.logoFile, "universities", "image");
      logoUrl = stored.fileUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Logo upload failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  if (!isValidLogoRef(logoUrl ?? undefined)) {
    return NextResponse.json({ error: "Invalid logo URL" }, { status: 400 });
  }

  let mouFileUrl: string | null = existing.mouFileUrl;
  const eventPhotoUrls: string[] = [];
  const documentRows: {
    kind: DocumentKind;
    fileName: string;
    fileUrl: string;
    academicYear: string | null;
  }[] = [];

  for (const mouFile of files.mouFiles) {
    try {
      const stored = await storeUpload(mouFile, "universities/mou", "mou", {
        maxBytes: MOU_PDF_MAX_BYTES,
        allowedMime: ["application/pdf"],
      });
      if (!mouFileUrl) mouFileUrl = stored.fileUrl;
      documentRows.push({
        kind: DocumentKind.MOU,
        fileName: stored.fileName,
        fileUrl: stored.fileUrl,
        academicYear: docAcademicYear,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "MOU upload failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  for (const photo of files.eventPhotos) {
    try {
      const stored = await storeUpload(photo, "universities/events", "image", {
        maxBytes: EVENT_PHOTO_MAX_BYTES,
      });
      eventPhotoUrls.push(stored.fileUrl);
      documentRows.push({
        kind: DocumentKind.EVENT_PHOTO,
        fileName: stored.fileName,
        fileUrl: stored.fileUrl,
        academicYear: docAcademicYear,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Event photo upload failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  const email = parsed.data.email?.toLowerCase() ?? null;
  const phone = parsed.data.phone.trim();
  const spocInputs = resolveUniversitySpocInputs(parsed.data);
  const primarySpoc = spocInputs[0] ?? null;

  if (email) {
    try {
      await assertUniversityEmailAvailable(id, email, existing.email);
    } catch (e) {
      if (e instanceof UniversityEmailInUseError) {
        return NextResponse.json(
          { error: "Email is already in use", fieldErrors: { email: ["Email is already in use"] } },
          { status: 409 },
        );
      }
      throw e;
    }
  }

  const locationParts = [parsed.data.city, parsed.data.district, parsed.data.state].filter(Boolean);
  const locationFromParts = locationParts.length > 0 ? locationParts.join(", ") : null;
  const location =
    parsed.data.location?.trim() ||
    parsed.data.address?.trim() ||
    locationFromParts;

  const ugStreams = (parsed.data.ugStreams ?? []).map((s) => s.trim()).filter(Boolean);
  const pgStreams = (parsed.data.pgStreams ?? []).map((s) => s.trim()).filter(Boolean);
  const offersUg = parsed.data.offersUg ?? ugStreams.length > 0;
  const offersPg = parsed.data.offersPg ?? pgStreams.length > 0;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.university.update({
        where: { id },
        data: {
          name: parsed.data.name,
          email,
          phone,
          masterUniversityId: parsed.data.masterUniversityId ?? undefined,
          address: parsed.data.location?.trim() || parsed.data.address?.trim() || null,
          state: parsed.data.state?.trim() || null,
          district: parsed.data.district?.trim() || null,
          city: parsed.data.city?.trim() || null,
          area: parsed.data.area?.trim() || null,
          pincode: parsed.data.pincode?.trim() || null,
          website: parsed.data.website?.trim() || null,
          location,
          universityType: parsed.data.universityType ?? null,
          spocName: primarySpoc?.name ?? null,
          spocDesignation: primarySpoc?.designation ?? null,
          spocMobile: primarySpoc?.mobile ?? null,
          spocEmail: primarySpoc?.email ?? null,
          offersUg,
          offersPg,
          ugStreams,
          pgStreams,
          targetStudents: parsed.data.targetStudents ?? null,
          registrationFee: toDecimal(parsed.data.registrationFee ?? undefined),
          applicationFee: toDecimal(parsed.data.applicationFee ?? undefined),
          messFee: toDecimal(parsed.data.messFee ?? undefined),
          examFee: toDecimal(parsed.data.examFee ?? undefined),
          otherAdminCharges: parsed.data.otherAdminCharges?.trim() || null,
          otherAdminAmount: toDecimal(parsed.data.otherAdminAmount ?? undefined),
          mouYear: mouYearLabel,
          mouTenure: parsed.data.mouTenure,
          mouFileUrl,
          ...(eventPhotoUrls.length > 0
            ? { eventPhotoUrls: { push: eventPhotoUrls } }
            : {}),
          logoUrl,
        },
      });

      await tx.universitySpoc.deleteMany({ where: { universityId: id } });
      for (let i = 0; i < spocInputs.length; i++) {
        const spoc = spocInputs[i]!;
        await tx.universitySpoc.create({
          data: {
            universityId: id,
            name: spoc.name,
            designation: spoc.designation,
            mobile: spoc.mobile,
            email: spoc.email,
            sortOrder: i,
          },
        });
      }

      await tx.universityMouSpoc.deleteMany({ where: { universityId: id } });
      for (let i = 0; i < (parsed.data.mouSpocs ?? []).length; i++) {
        const mouSpoc = parsed.data.mouSpocs![i]!;
        await tx.universityMouSpoc.create({
          data: {
            universityId: id,
            name: mouSpoc.name.trim(),
            designation: mouSpoc.designation.trim(),
            mobile: mouSpoc.mobile.trim(),
            email: mouSpoc.email.trim().toLowerCase(),
            sortOrder: i,
          },
        });
      }

      await tx.universityScholarship.deleteMany({ where: { universityId: id } });
      for (const scholarship of parsed.data.scholarships ?? []) {
        await tx.universityScholarship.create({
          data: {
            universityId: id,
            type: scholarship.type,
            value: toDecimal(scholarship.value)!,
            criteria: scholarship.criteria,
            sortOrder: scholarship.sortOrder ?? 0,
          },
        });
      }

      await tx.universityCetSeat.deleteMany({ where: { universityId: id } });
      for (const seat of parsed.data.cetSeats ?? []) {
        const mode =
          seat.allocationMode === "PERCENT" ? CetAllocationMode.PERCENT : CetAllocationMode.SEATS;
        const value = seat.allocationValue ?? seat.seatCount ?? 0;
        await tx.universityCetSeat.create({
          data: {
            universityId: id,
            programLevel: seat.programLevel as ProgramLevel,
            programName: seat.programName?.trim() || null,
            streamName: seat.streamName,
            allocationMode: mode,
            allocationValue: toDecimal(value),
            seatCount: mode === CetAllocationMode.SEATS ? Math.round(value) : seat.seatCount ?? 0,
          },
        });
      }

      const streamDetails = parsed.data.streamDetails ?? [];
      const keptStreamIds = new Set<string>();
      let sortOrder = 0;

      if (streamDetails.length > 0) {
        const usedStreamNames = new Set<string>();
        for (const stream of streamDetails) {
          let dbName = stream.streamName;
          const nameKey = dbName.toLowerCase();
          if (usedStreamNames.has(nameKey)) {
            dbName = `${stream.programName} · ${stream.streamName}`;
          }
          usedStreamNames.add(dbName.toLowerCase());

          const streamData = {
            name: dbName,
            degreeType: stream.programName,
            programLevel: stream.programLevel as ProgramLevel,
            totalSeats: stream.targetStudents ?? 0,
            tuitionYear1: toDecimal(stream.tuitionYear1 ?? undefined),
            tuitionTotal: toDecimal(stream.tuitionTotal ?? undefined),
            streamFee: toDecimal(stream.registrationFee ?? undefined),
            applicationFee: toDecimal(stream.applicationFee ?? undefined),
            messFee: toDecimal(stream.messFee ?? undefined),
            examFee: toDecimal(stream.examFee ?? undefined),
            otherAdminCharges: stream.otherAdminCharges?.trim() || null,
            otherAdminAmount: toDecimal(stream.otherAdminAmount ?? undefined),
            sortOrder: sortOrder++,
          };

          if (stream.id) {
            const existingStream = await tx.stream.findFirst({
              where: { id: stream.id, universityId: id },
              select: { id: true },
            });
            if (existingStream) {
              await tx.stream.update({ where: { id: stream.id }, data: streamData });
              keptStreamIds.add(stream.id);
              continue;
            }
          }

          const created = await tx.stream.create({
            data: { universityId: id, ...streamData },
          });
          keptStreamIds.add(created.id);
        }
      }

      const removable = await tx.stream.findMany({
        where: {
          universityId: id,
          id: { notIn: [...keptStreamIds] },
          leads: { none: {} },
        },
        select: { id: true },
      });
      if (removable.length > 0) {
        await tx.stream.deleteMany({
          where: { id: { in: removable.map((s) => s.id) } },
        });
      }

      if (parsed.data.hostelFees) {
        await syncUniversityHostelFees(tx, id, parsed.data.hostelFees);
      }

      for (const doc of documentRows) {
        await tx.universityDocument.create({
          data: {
            universityId: id,
            kind: doc.kind,
            fileName: doc.fileName,
            fileUrl: doc.fileUrl,
            academicYear: doc.academicYear,
          },
        });
      }

      if (docAcademicYear) {
        await tx.academicYear.upsert({
          where: {
            universityId_label: { universityId: id, label: docAcademicYear },
          },
          create: {
            universityId: id,
            label: docAcademicYear,
            sortOrder: parseAcademicYearStartYear(docAcademicYear) ?? 0,
          },
          update: {},
        });
      }

      await syncUniversityPrimaryLoginUser(tx, id, {
        email,
        phone,
        name: parsed.data.name,
      });
    });
  } catch (e) {
    if (e instanceof UniversityEmailInUseError) {
      return NextResponse.json(
        { error: "Email is already in use", fieldErrors: { email: ["Email is already in use"] } },
        { status: 409 },
      );
    }
    console.error("PUT /api/master/universities/[id]/full failed", e);
    const message = e instanceof Error ? e.message : "Could not update university";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, universityId: id });
}
