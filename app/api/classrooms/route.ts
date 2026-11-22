import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kvStore";
import { Classroom, ForumPost, AssessmentSubmission, UserProfile } from "@/lib/types";

interface ClassroomDB {
  classrooms: Classroom[];
  posts: ForumPost[];
  submissions: AssessmentSubmission[];
  users: UserProfile[];
}

const KEY = "snp_classrooms_db";
const EMPTY_DB: ClassroomDB = { classrooms: [], posts: [], submissions: [], users: [] };

export async function GET(req: NextRequest) {
  const db = await kvGet<ClassroomDB>(KEY, EMPTY_DB);
  const classId = req.nextUrl.searchParams.get("classId");
  const code = req.nextUrl.searchParams.get("code")?.trim().toUpperCase();

  if (code) {
    const found = db.classrooms.find((c) => c.kodeKelas.toUpperCase() === code);
    if (!found) {
      return NextResponse.json({ error: "Kode kelas tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ classroom: found });
  }

  if (classId) {
    const classroom = db.classrooms.find((c) => c.id === classId);
    if (!classroom) {
      return NextResponse.json({ error: "Kelas tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({
      classroom,
      posts: db.posts.filter((p) => p.classId === classId),
      submissions: db.submissions.filter((s) => s.classId === classId),
      users: db.users,
    });
  }

  return NextResponse.json(db);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = await kvGet<ClassroomDB>(KEY, EMPTY_DB);

    if (body.action === "upsert_class" && body.classroom) {
      const cls = body.classroom as Classroom;
      const idx = db.classrooms.findIndex((c) => c.id === cls.id);
      if (idx >= 0) db.classrooms[idx] = cls;
      else db.classrooms.push(cls);
      await kvSet(KEY, db);
      return NextResponse.json({ classroom: cls });
    }

    if (body.action === "upsert_user" && body.user) {
      const u = body.user as UserProfile;
      const idx = db.users.findIndex((x) => x.id === u.id || x.email === u.email);
      if (idx >= 0) db.users[idx] = { ...db.users[idx], ...u };
      else db.users.push(u);
      await kvSet(KEY, db);
      return NextResponse.json({ user: u });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const db = await kvGet<ClassroomDB>(KEY, EMPTY_DB);

    if (body.action === "join_by_code") {
      const code = String(body.kodeKelas || "").trim().toUpperCase();
      const student = body.user as UserProfile | undefined;
      const target = db.classrooms.find((c) => c.kodeKelas.toUpperCase() === code);
      if (!target) {
        return NextResponse.json({ error: "Kode kelas tidak ditemukan." }, { status: 404 });
      }
      if (student) {
        const uIdx = db.users.findIndex((x) => x.id === student.id || x.email === student.email);
        if (uIdx >= 0) db.users[uIdx] = { ...db.users[uIdx], ...student, kelasUtama: target.nama };
        else db.users.push({ ...student, kelasUtama: target.nama });

        db.classrooms = db.classrooms.map((c) => ({
          ...c,
          studentIds:
            c.id === target.id
              ? Array.from(new Set([...c.studentIds, student.id]))
              : c.studentIds.filter((id) => id !== student.id),
        }));
        await kvSet(KEY, db);
      }
      const updated = db.classrooms.find((c) => c.id === target.id) || target;
      return NextResponse.json({ classroom: updated });
    }

    if (body.action === "update_visibility" && body.classId && body.visibility) {
      db.classrooms = db.classrooms.map((c) =>
        c.id === body.classId ? { ...c, visibility: body.visibility } : c
      );
      await kvSet(KEY, db);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "add_post" && body.post) {
      db.posts = [body.post as ForumPost, ...db.posts];
      await kvSet(KEY, db);
      return NextResponse.json({ posts: db.posts.filter((p) => p.classId === body.post.classId) });
    }

    if (body.action === "delete_post" && body.postId) {
      db.posts = db.posts.filter((p) => p.id !== body.postId);
      await kvSet(KEY, db);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "add_comment" && body.postId && body.comment) {
      db.posts = db.posts.map((p) =>
        p.id === body.postId ? { ...p, comments: [...p.comments, body.comment] } : p
      );
      await kvSet(KEY, db);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "submit_assessment" && body.submission) {
      const sub = body.submission as AssessmentSubmission;
      db.submissions = [sub, ...db.submissions];
      await kvSet(KEY, db);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const classId = req.nextUrl.searchParams.get("classId")?.trim();
  if (!classId) {
    return NextResponse.json({ error: "Missing classId" }, { status: 400 });
  }
  const db = await kvGet<ClassroomDB>(KEY, EMPTY_DB);
  db.classrooms = db.classrooms.filter((c) => c.id !== classId);
  db.posts = db.posts.filter((p) => p.classId !== classId);
  db.submissions = db.submissions.filter((s) => s.classId !== classId);
  await kvSet(KEY, db);
  return NextResponse.json({ ok: true });
}
