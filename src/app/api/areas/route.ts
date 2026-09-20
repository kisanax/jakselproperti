import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getArea, getAreaAncestors, getAreaChildren } from "@/lib/areas";
import { prisma } from "@/lib/prisma";

const positiveInteger = /^\d+$/;

function parseId(value: string | null) {
  if (!value || !positiveInteger.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const allowedParams = new Set(["id", "level", "parentId", "q"]);
  for (const key of params.keys()) {
    if (!allowedParams.has(key) || params.getAll(key).length !== 1) {
      return Response.json({ error: `Parameter ${key} tidak valid` }, { status: 400 });
    }
  }
  const idParam = params.get("id");
  const levelParam = params.get("level");
  const parentIdParam = params.get("parentId");
  const qParam = params.get("q");

  if (idParam !== null) {
    if (levelParam !== null || parentIdParam !== null || qParam !== null) {
      return Response.json({ error: "Mode id tidak dapat digabung dengan parameter lain" }, { status: 400 });
    }
    const id = parseId(idParam);
    if (id === null) {
      return Response.json({ error: "id tidak valid" }, { status: 400 });
    }
    const areas = await getAreaAncestors(prisma, id);
    if (!areas) {
      return Response.json({ error: "Area tidak ditemukan atau hierarkinya tidak valid" }, { status: 404 });
    }
    return Response.json({ areas });
  }

  if (!levelParam || !/^[1-4]$/.test(levelParam)) {
    return Response.json({ error: "level wajib berupa angka 1 sampai 4" }, { status: 400 });
  }

  const level = Number(levelParam);
  if (level === 1 && parentIdParam !== null) {
    return Response.json({ error: "parentId tidak boleh diisi untuk level 1" }, { status: 400 });
  }
  if (level > 1 && parentIdParam === null) {
    return Response.json({ error: `parentId wajib diisi untuk level ${level}` }, { status: 400 });
  }
  if (qParam !== null && level !== 4) {
    return Response.json({ error: "q hanya dapat digunakan untuk level 4" }, { status: 400 });
  }
  if (qParam !== null && qParam.trim().length > 100) {
    return Response.json({ error: "q maksimal 100 karakter" }, { status: 400 });
  }

  const parentId = level === 1 ? null : parseId(parentIdParam);
  if (level > 1 && parentId === null) {
    return Response.json({ error: "parentId tidak valid" }, { status: 400 });
  }
  if (parentId !== null) {
    const parent = await getArea(prisma, parentId);
    if (!parent || parent.level !== level - 1) {
      return Response.json({ error: "parentId tidak sesuai dengan level yang diminta" }, { status: 400 });
    }
  }

  const areas = await getAreaChildren(prisma, level, parentId, qParam?.trim());
  return Response.json({ areas });
}
